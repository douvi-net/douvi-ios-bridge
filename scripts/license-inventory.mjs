import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const found = new Map();
async function scan(root) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const path = join(root, entry.name);
    if (entry.name.startsWith("@")) {
      await scan(path);
      continue;
    }
    let pkg;
    try {
      pkg = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
    } catch {
      continue;
    }
    if (pkg.name && pkg.version)
      found.set(`${pkg.name}@${pkg.version}`, {
        name: pkg.name,
        version: pkg.version,
        license: pkg.license ?? "UNKNOWN",
        repository: pkg.repository ?? null,
      });
    try {
      await scan(join(path, "node_modules"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
}
await scan("node_modules");
const inventory = {
  generated_at: new Date().toISOString(),
  scope:
    "Package metadata present in this installation; optional packages for other platforms may not be installed. Not a substitute for full license/NOTICE text or distribution review.",
  packages: [...found.values()].sort((a, b) => a.name.localeCompare(b.name)),
};
await writeFile(
  "docs/research/npm-license-inventory.json",
  `${JSON.stringify(inventory, null, 2)}\n`,
);
console.log(`Recorded ${inventory.packages.length} installed package licenses.`);
