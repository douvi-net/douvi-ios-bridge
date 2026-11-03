import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";

const origin = "http://127.0.0.1:4173";
const consoleErrors = [];
const externalRequests = [];
const checks = [];
const out = resolve("test-results");
await mkdir(out, { recursive: true });
let browser;
let server;
try {
  // The API resolves after listening; CI logging/ANSI formatting cannot gate readiness.
  server = await preview({
    configFile: "apps/desktop/vite.config.ts",
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  });
  assert((await fetch(origin, { signal: AbortSignal.timeout(2000) })).ok);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BRIDGE_BROWSER_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin) && /^https?:/.test(r.url())) externalRequests.push(r.url());
  });
  await page.goto(origin);
  await page.getByRole("heading", { name: "Your code. Your iOS build." }).waitFor();
  await page.screenshot({ path: resolve(out, "workbench-dark.png"), fullPage: true });
  checks.push("production landing renders");

  await page.getByRole("button", { name: "Build setup", exact: true }).click();
  assert(
    await page.getByRole("button", { name: "Generate workflow draft", exact: true }).isDisabled(),
  );
  assert(await page.getByRole("button", { name: /Build unavailable/ }).isDisabled());
  checks.push("no project cannot build or generate");
  await page.getByRole("button", { name: /Project 0/ }).click();
  await page.locator('input[type="file"]').setInputFiles(resolve("tests/fixtures/flutter-project"));
  await page.getByRole("heading", { name: "bridge_example", exact: true }).waitFor();
  await page.getByRole("heading", { name: "Flutter project detected" }).waitFor();
  assert(await page.getByText("net.douvi.bridgeexample", { exact: true }).isVisible());
  checks.push("folder file permission -> metadata parser -> actual project findings");
  await page.getByRole("button", { name: "Review build setup" }).click();
  await page.getByRole("textbox", { name: "Flutter version" }).fill("3.38.5");
  assert(
    await page.getByRole("button", { name: "Generate workflow draft", exact: true }).isDisabled(),
  );
  await page.getByRole("checkbox").nth(0).check();
  assert(
    await page.getByRole("button", { name: "Generate workflow draft", exact: true }).isDisabled(),
  );
  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Generate workflow draft", exact: true }).click();
  assert(
    (await page.locator("pre").textContent()).includes("flutter build ios --release --no-codesign"),
  );
  assert(
    await page.getByText("Not executed · not a successful build · no IPA produced").isVisible(),
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download workflow draft" }).click();
  const download = await downloadPromise;
  await download.saveAs(resolve(out, download.suggestedFilename()));
  assert(
    (await readFile(resolve(out, download.suggestedFilename()), "utf8")).includes(
      "workflow_dispatch:",
    ),
  );
  checks.push("both consent gates -> generate -> actual workflow file download");
  await page.getByRole("textbox", { name: "Project path in repository" }).fill("../private");
  assert.equal(await page.locator("pre").count(), 0);
  await page.getByRole("button", { name: "Generate workflow draft", exact: true }).click();
  assert((await page.getByRole("alert").textContent()).includes("safe project-relative"));
  checks.push("config edit invalidates draft; traversal rejected");

  await page.getByRole("button", { name: "Log doctor", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Paste build log" })
    .fill(
      "GITHUB_TOKEN=ghp_dummy_123\nNo profiles for net.douvi.app were found\n/Users/PrivatePerson/repo",
    );
  await page.getByRole("button", { name: "Analyze locally" }).click();
  await page.getByText("Signing assets are missing or mismatched", { exact: true }).waitFor();
  const log = await page.locator("pre").textContent();
  assert(!log.includes("ghp_dummy_123"));
  assert(!log.includes("PrivatePerson"));
  assert.equal(await page.getByRole("textbox", { name: "Paste build log" }).inputValue(), "");
  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  assert(!storage.includes("ghp_dummy_123"));
  assert(!storage.includes("PrivatePerson"));
  checks.push("offline log classification redacts before display and does not persist log");

  await page.getByRole("button", { name: "Language", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  await page.getByRole("button", { name: "Sáng", exact: true }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  await page.reload();
  await page.getByRole("heading", { name: "Code trên Windows. Tiến tới bản iOS." }).waitFor();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.locator("html").getAttribute("lang"), "vi");
  await page.screenshot({ path: resolve(out, "workbench-light-vi.png"), fullPage: true });
  checks.push("Vietnamese and light theme persist; project/log reset on reload");
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.getByRole("heading", { name: "Code trên Windows. Tiến tới bản iOS." }).isVisible(),
  );
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: resolve(out, "workbench-mobile.png"), fullPage: true });
  checks.push("small viewport has no horizontal overflow");
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
  checks.push("no page errors and no external HTTP requests");
  const report = {
    result: "PASS",
    checked_at: new Date().toISOString(),
    browser: await browser.version(),
    scope:
      "Production browser workbench only; metadata fixture, no native Windows or remote CI claim",
    checks,
    consoleErrors,
    externalRequests,
  };
  await writeFile(resolve(out, "browser-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  await writeFile(
    resolve(out, "browser-smoke.json"),
    `${JSON.stringify({ result: "FAIL", checks, error: String(e), consoleErrors, externalRequests, serverReady: !!server }, null, 2)}\n`,
  );
  throw e;
} finally {
  await browser?.close();
  if (server) {
    server.httpServer.closeAllConnections();
    await new Promise((resolveClosed) => server.httpServer.close(resolveClosed));
  }
}
