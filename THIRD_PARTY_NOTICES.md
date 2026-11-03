# Third-party policy and notices

MIT in this repository covers original Douvi source only. Dependency licenses are not replaced by that license. Preserve upstream copyright/license texts in any distributed installer or bundled JS according to the actual packages used.

## Direct JavaScript packages in this foundation

| Package | Exact version | Declared license |
| --- | --- | --- |
| React / React DOM | 19.3.1 | MIT |
| @tauri-apps/api | 2.12.4 | Apache-2.0 OR MIT |
| yaml | 2.9.1 | ISC |
| @tauri-apps/cli | 2.12.4 | Apache-2.0 OR MIT |
| TypeScript | 7.0.2 | Apache-2.0 |
| Vite | 8.3.5 | MIT |
| @vitejs/plugin-react | 6.2.1 | MIT |
| Vitest | 5.1.0 | MIT |
| Biome | 2.6.4 | MIT OR Apache-2.0 |
| Playwright | 1.62.1 | Apache-2.0 |
| @types/node, @types/react, @types/react-dom | See package-lock.json | MIT |

Versions and license identifiers above were read from the installed packages. `package-lock.json` records dependency integrity, including optional platform binaries. [npm-license-inventory.json](docs/research/npm-license-inventory.json) records the package metadata found in the local install; it is an inventory, not full notice text or a legal conclusion. Before distribution generate the complete notices from the exact dependency tree and include license/NOTICE texts, including applicable transitive components.

Rust dependencies are resolved in `apps/desktop/src-tauri/Cargo.lock` and the toolchain is pinned in `rust-toolchain.toml`. The [native preflight](docs/verification/task03-native-preflight.json) records a RustSec audit with zero vulnerability entries and two informational warnings (`glib` unsoundness and unmaintained `proc-macro-error`); neither package is selected in the Windows dependency graph. This is not a blanket security guarantee or a native build result.

Before bundling, `npm run licenses:bundle` reads the locked Windows Cargo graph and npm production packages and preserves their upstream license/NOTICE files in the installer's `notices/` directory. Version-specific missing crate license files are preserved from upstream in `third_party/licenses/`, with sources and SHA-256 values in `third_party/license-overrides.json`. The generated inventory intentionally includes native build dependencies. Re-run the generator and review notices whenever dependencies change; it fails if a package lacks the expected upstream license text. No crate patches are applied.

## Researched, not bundled

| Upstream | Observed license / distribution decision |
| --- | --- |
| xtool | MIT; adapter evaluation only |
| xcross | AGPL-3.0; no copied, linked or bundled code |
| iPASide | Root MIT; dependency licensing including GPL components needs separate review before reuse |
| ios-deploy | GPL-3.0 LICENSE plus separate LICENSE2; excluded from Windows foundation |
| pymobiledevice3 | GPL-3.0; not imported or bundled |
| fastlane | MIT; future macOS-only automation dependency, not installed here |
| runner-images | MIT source; not permission to redistribute Apple SDKs/images |

Do not infer that a subprocess integration removes all copyleft obligations. Any future integration must document the exact release, files, distribution/linking model, upstream notices and resulting obligations. See [research](docs/research/TASK-01.vi.md) for original source links and evidence.

Apple SDKs/Xcode, Apple keys/certificates/profiles and device pairing files are not included. Codemagic and EAS are optional service comparisons, not bundled implementations. GitHub Actions pins are in [github-snapshot.json](docs/research/github-snapshot.json); pinning is not a replacement for reviewing transitive actions and downloaded executables.
