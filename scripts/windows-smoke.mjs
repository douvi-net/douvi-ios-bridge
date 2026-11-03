import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { arch, release, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { chromium } from "playwright";

assert.equal(process.platform, "win32", "Run this test on a real Windows host.");
const output = resolve("test-results/windows");
await mkdir(output, { recursive: true });
const bundle = resolve("apps/desktop/src-tauri/target/release/bundle/nsis");
const installers = (await readdir(bundle)).filter((file) => file.endsWith("-setup.exe"));
assert.equal(installers.length, 1, "Expected exactly one NSIS installer.");
const installer = join(bundle, installers[0]);
const installed = join(tmpdir(), `douvi-bridge-smoke-${randomUUID()}`);
const executable = join(installed, "douvi-ios-bridge.exe");
const profile = join(tmpdir(), `douvi-bridge-webview-${randomUUID()}`);
const report = {
  result: "FAIL",
  source_sha: process.env.GITHUB_SHA || null,
  run_id: process.env.GITHUB_RUN_ID || null,
  run_url: process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  host: { platform: process.platform, release: release(), arch: arch() },
  checks: [],
  limitations: [
    "Hosted Windows Server runner; personal Windows 10/11 hardware acceptance remains separate.",
    "Metadata-only fixture; no Flutter/iOS compilation, signing or GitHub integration is tested.",
    "Unsigned development installer; no public Release or signing certificate is created.",
  ],
};
let app;
let browser;
let installationStarted = false;

function run(command, args, timeout = 120_000, extra = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      ...extra,
    });
    let logs = "";
    child.stdout?.on("data", (data) => {
      logs = (logs + data).slice(-16_000);
    });
    child.stderr?.on("data", (data) => {
      logs = (logs + data).slice(-16_000);
    });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${basename(command)} timed out.`));
    }, timeout);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${basename(command)} exited ${code}: ${logs}`));
      else resolveRun(logs);
    });
  });
}

async function until(check, message, timeout = 30_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
  }
  throw new Error(message);
}

async function hash(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function dialog(page, mode, trigger) {
  const pilot = run(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      resolve("scripts/windows-folder-dialog.ps1"),
      "-ApplicationProcessId",
      String(app.pid),
      "-Mode",
      mode,
      "-ProjectDirectory",
      resolve("tests/fixtures/flutter-project"),
    ],
    40_000,
  );
  // Attach a handler immediately, including when triggering the dialog fails.
  const result = pilot.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await trigger();
  const outcome = await result;
  if (outcome.error) throw outcome.error;
  assert.equal(JSON.parse(outcome.value.trim()).result, "PASS");
  await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled);
}

try {
  const bytes = (await stat(installer)).size;
  assert(
    bytes > 100_000 && bytes <= 50 * 1024 * 1024,
    "Unexpected installer size; storage cap is 50 MiB.",
  );
  const binary = await readFile(
    resolve("apps/desktop/src-tauri/target/release/douvi-ios-bridge.exe"),
  );
  assert.equal(binary.subarray(0, 2).toString(), "MZ");
  const pe = binary.readUInt32LE(0x3c);
  assert.equal(binary.readUInt32LE(pe), 0x00004550);
  assert.equal(binary.readUInt16LE(pe + 4), 0x8664, "Expected a native x64 Windows executable.");
  report.installer = {
    filename: basename(installer),
    bytes,
    sha256: await hash(installer),
    signed: false,
  };
  await copyFile(installer, join(output, basename(installer)));
  await copyFile(resolve("apps/desktop/src-tauri/Cargo.lock"), join(output, "Cargo.lock"));
  report.checks.push("NSIS installer size and x64 PE header checked; SHA-256 recorded");

  installationStarted = true;
  await run(installer, ["/S", `/D=${installed}`], 180_000);
  assert(await exists(executable), "Installer did not create the application executable.");
  assert(
    await exists(join(installed, "notices/THIRD-PARTY-LICENSES.txt")),
    "Bundled upstream license texts are missing.",
  );
  assert(
    await exists(join(installed, "notices/inventory.json")),
    "Bundled dependency inventory is missing.",
  );
  assert.equal(await hash(executable), createHash("sha256").update(binary).digest("hex"));
  report.checks.push("per-user silent install; installed executable matches compiled binary");

  const portServer = createServer();
  await new Promise((resolvePort) => portServer.listen(0, "127.0.0.1", resolvePort));
  const port = portServer.address().port;
  await new Promise((resolvePort) => portServer.close(resolvePort));
  const cdp = `http://127.0.0.1:${port}`;
  app = spawn(executable, [], {
    shell: false,
    stdio: "ignore",
    windowsHide: false,
    env: {
      ...process.env,
      // Test process only: no application config, registry or shipped permissions change.
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
      WEBVIEW2_USER_DATA_FOLDER: profile,
    },
  });
  let appError;
  app.once("error", (error) => {
    appError = error;
  });
  await until(async () => {
    if (appError) throw appError;
    assert(app.exitCode === null, `Installed app exited ${app.exitCode}.`);
    try {
      return (await fetch(`${cdp}/json/version`, { signal: AbortSignal.timeout(1000) })).ok;
    } catch {
      return false;
    }
  }, "Installed app did not expose its test-only WebView2 connection.");
  browser = await chromium.connectOverCDP(cdp);
  const context = browser.contexts()[0];
  await until(
    () => context.pages().some((page) => /^https?:\/\/tauri\.localhost/.test(page.url())),
    "Native application page missing.",
  );
  const page = context
    .pages()
    .find((candidate) => /^https?:\/\/tauri\.localhost/.test(candidate.url()));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("heading", { name: "Your code. Your iOS build." }).waitFor();
  assert(await page.evaluate(() => !!window.__TAURI_INTERNALS__));
  report.webview_version = browser.version();
  report.checks.push("installed release app launches; real Tauri WebView2 renders the workbench");

  await dialog(page, "Cancel", () =>
    page.getByRole("button", { name: "Open Flutter project", exact: true }).click(),
  );
  await page.getByRole("heading", { name: "Your code. Your iOS build." }).waitFor();
  report.checks.push("native folder dialog opens and cancellation leaves no project");
  await dialog(page, "Cancel", () => page.locator(".drop-zone").dispatchEvent("drop"));
  report.checks.push("native drop handler uses the scoped folder dialog");
  await dialog(page, "Select", () =>
    page.getByRole("button", { name: "Open Flutter project", exact: true }).click(),
  );
  await page.getByRole("heading", { name: "bridge_example", exact: true }).waitFor();
  assert(await page.getByText("net.douvi.bridgeexample", { exact: true }).isVisible());
  report.checks.push(
    "native folder selection -> Rust IPC metadata reader -> actual project findings",
  );

  const denied = await page.evaluate(async () => {
    try {
      await window.__TAURI_INTERNALS__.invoke("__bridge_unregistered_probe__");
      return false;
    } catch {
      return true;
    }
  });
  assert(denied, "Unregistered IPC command was unexpectedly accepted.");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("button", { name: "Sáng", exact: true }).click();
  await page.reload();
  await page.getByRole("heading", { name: "Code trên Windows. Tiến tới bản iOS." }).waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.deepEqual(errors, []);
  report.checks.push(
    "unregistered IPC rejected; VI/EN and theme persistence; no page errors during smoke",
  );
  await browser.close();
  browser = null;
  await run("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"]).catch(() => {});
  app = null;

  const uninstallers = (await readdir(installed)).filter((file) =>
    /^uninstall.*\.exe$/i.test(file),
  );
  assert.equal(uninstallers.length, 1, "NSIS uninstaller missing.");
  await run(join(installed, uninstallers[0]), ["/S"]);
  await until(
    async () => !(await exists(executable)),
    "Uninstaller did not remove the application.",
  );
  report.checks.push("silent uninstall removes the installed executable");
  report.result = "PASS";
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (app?.pid) await run("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"]).catch(() => {});
  if (installationStarted && (await exists(installed))) {
    const names = await readdir(installed);
    const uninstaller = names.find((file) => /^uninstall.*\.exe$/i.test(file));
    if (uninstaller && (await exists(executable))) {
      await run(join(installed, uninstaller), ["/S"]).catch(() => {});
    }
  }
  await writeFile(join(output, "native-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
