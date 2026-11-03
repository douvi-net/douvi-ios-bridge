import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

const target = "x86_64-pc-windows-msvc";
const metadata = JSON.parse(
  execFileSync(
    "cargo",
    [
      "metadata",
      "--locked",
      "--format-version",
      "1",
      "--filter-platform",
      target,
      "--manifest-path",
      "apps/desktop/src-tauri/Cargo.toml",
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  ),
);
const selected = new Set(metadata.resolve.nodes.map((node) => node.id));
const packages = metadata.packages.filter((pkg) => selected.has(pkg.id) && pkg.source);
const npm = JSON.parse(await readFile("package-lock.json", "utf8"));
const overrides = JSON.parse(
  await readFile("third_party/license-overrides.json", "utf8"),
).overrides;
const inventory = [];
const sections = [
  "DOUVI IOS BRIDGE — THIRD-PARTY LICENSES AND NOTICES",
  "Generated from Cargo.lock's Windows dependency graph (including build tools) and npm production packages.",
  "Upstream source archive links and declared license expressions are recorded below. No crate patches are applied by this repository.",
  "The inventory includes build dependencies and is intentionally broader than the code linked into the installer.",
];

async function collect(pkg) {
  const names = (await readdir(pkg.directory, { withFileTypes: true }))
    .filter(
      (entry) =>
        entry.isFile() && /^(LICENSE|LICENCE|COPYING|COPYRIGHT|NOTICE)([._-]|$)/i.test(entry.name),
    )
    .map((entry) => entry.name);
  if (pkg.licenseFile) {
    const path = resolve(pkg.directory, pkg.licenseFile);
    assert(path.startsWith(`${resolve(pkg.directory)}${sep}`), `License path escapes ${pkg.name}.`);
    const name = path.slice(resolve(pkg.directory).length + 1);
    if (!names.includes(name)) names.push(name);
  }
  const vendored = names.length
    ? []
    : overrides[`${pkg.ecosystem}:${pkg.name}@${pkg.version}`] || [];
  assert(
    names.length || vendored.length,
    `No upstream license/notice text found for ${pkg.name} ${pkg.version}.`,
  );
  const item = {
    name: pkg.name,
    version: pkg.version,
    ecosystem: pkg.ecosystem,
    license: pkg.license,
    source: pkg.source,
    files: [...names.sort(), ...vendored.map((entry) => entry.path)],
  };
  inventory.push(item);
  sections.push(
    `\n${"=".repeat(72)}\n${pkg.ecosystem}: ${pkg.name} ${pkg.version}\nDeclared license: ${pkg.license}\nSource: ${pkg.source}`,
  );
  for (const name of names.sort()) {
    const text = await readFile(join(pkg.directory, name), "utf8");
    assert(Buffer.byteLength(text) <= 1024 * 1024, `Unexpected notice size: ${pkg.name}/${name}.`);
    sections.push(`\n--- ${name} ---\n${text}`);
  }
  for (const entry of vendored) {
    const text = await readFile(entry.path, "utf8");
    assert.equal(
      createHash("sha256").update(text).digest("hex"),
      entry.sha256,
      `Upstream notice changed: ${entry.path}.`,
    );
    sections.push(`\n--- ${entry.path} ---\nRetrieved from: ${entry.source}\n${text}`);
  }
}

for (const pkg of packages.sort(
  (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
)) {
  await collect({
    ...pkg,
    ecosystem: "cargo",
    directory: dirname(pkg.manifest_path),
    licenseFile: pkg.license_file,
    source: `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`,
  });
}
for (const [path, locked] of Object.entries(npm.packages)) {
  if (!path || locked.dev || !locked.version) continue;
  const pkg = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
  assert.equal(
    pkg.version,
    locked.version,
    `npm installed version differs from lockfile: ${path}.`,
  );
  await collect({ ...pkg, ecosystem: "npm", directory: path, source: locked.resolved });
}
const output = resolve("apps/desktop/src-tauri/notices");
await mkdir(output, { recursive: true });
await writeFile(join(output, "THIRD-PARTY-LICENSES.txt"), `${sections.join("\n")}\n`);
await writeFile(
  join(output, "inventory.json"),
  `${JSON.stringify({ target, packages: inventory }, null, 2)}\n`,
);
console.log(`Bundled upstream notices for ${inventory.length} packages (${target}).`);
