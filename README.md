# Douvi iOS Bridge

**Build iOS apps from Windows. No Mac ownership required.**

A local-first, open-source Windows workbench for the Flutter → macOS CI → iOS journey. Bring your own project and GitHub account. No mandatory Douvi server or cloud AI.

**Status: development foundation, not a released Windows installer.** The local workbench inspects Flutter metadata, drafts an unsigned workflow and explains common build failures offline. GitHub authentication, real workflow dispatch/download, signed IPA creation, phone installation and TestFlight upload are not implemented. No real iOS build has been accepted yet. See [progress](docs/PROGRESS.md).

## Try the workbench

Install Node.js 24, then from this folder:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Open your Flutter project folder, review the findings, enter your exact Flutter version and generate a workflow draft. The project must contain `pubspec.yaml` and `ios/Runner.xcodeproj/project.pbxproj`. The browser workbench reads five allowlisted metadata files; it does not upload your source or execute project scripts.

The browser UI is a development/testing surface for the desktop app. It is not a substitute for native Windows verification. [Hướng dẫn tiếng Việt](README.vi.md).

## Windows desktop development

Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/): Microsoft C++ Build Tools, WebView2 and Rustup with the MSVC toolchain. The repository pins Rust 1.99.1 and its resolved dependencies. Then:

```powershell
npm ci
npm run tauri -- dev
```

For a development NSIS build, after completing native checks:

```powershell
npm run licenses:bundle
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo clippy --locked --all-targets --manifest-path apps/desktop/src-tauri/Cargo.toml -- -D warnings
npm run tauri -- build -- --locked
npm run test:windows
```

The build bundles upstream license texts and their exact dependency inventory. See [Windows verification](docs/WINDOWS.md) and [progress](docs/PROGRESS.md) for actual build/install results and remaining limits. A local web check or Rust dependency preflight does not constitute Windows acceptance.

## Build outputs mean different things

| Output | Meaning | Install directly on an iPhone? | Current support |
| --- | --- | --- | --- |
| Unsigned `.app` ZIP | Compile check on macOS; no distribution signature | No | Workflow draft generation only |
| Development-signed IPA | Development profile and matching registered device | With valid signing and device setup | Planned |
| Ad hoc IPA | Distribution certificate and profile covering registered devices | Only eligible devices | Planned |
| App Store IPA | Distribution build for App Store Connect/TestFlight | Through Apple's distribution flow | Planned |

Flutter's [official iOS release flow](https://docs.flutter.dev/deployment/ios) requires Xcode on macOS. Bridge runs that lane remotely; it does not claim to replace Xcode for every project. Experimental Windows compilers are researched separately.

## Verify locally

```sh
npm run check
npm audit --audit-level=high
npx playwright install chromium
npm run test:ui
```

`test:ui` starts the production preview, imports a **metadata-only test fixture**, generates/downloads a workflow, checks failure cases, analyzes a redacted log and verifies language/theme persistence. It never dispatches CI. A passing test fixture is not an iOS build.

If the default Chromium download is unavailable, set `BRIDGE_BROWSER_EXECUTABLE` to a trusted, already installed Chromium executable before running `test:ui`. Record the actual browser version; this remains browser-only verification.

The manual CI workflow has explicit cost gates and does not run on push or pull request. No release workflow exists yet. [CI and build acceptance](docs/ACCEPTANCE.md).

## Repository structure

| Path | Purpose |
| --- | --- |
| `apps/desktop/src` | React/TypeScript desktop UI, English/Vietnamese, themes |
| `apps/desktop/src-tauri` | Rust/Tauri shell and scoped metadata folder reader |
| `packages/core/src` | Detector, engine interface, workflow validation, offline diagnostics and evidence gate |
| `tests` | Unit/integration tests and clearly labelled metadata fixtures |
| `scripts` | Browser verification |
| `docs/research` | Competitor comparison and timestamped GitHub evidence |
| `docs/adr` | Architecture decisions |

## Safety and costs

Source inspection is read-only. The workflow generator only returns text; it cannot overwrite files or trigger billing. Generated workflows are manual, require an exact reviewed source commit and two explicit acknowledgements, use read-only repository contents permissions, do not persist checkout credentials, limit runtime and retain artifacts for one day by default. A CI run executes project and dependency code, including native build scripts.

Standard GitHub-hosted runners in public repositories are currently free; private runs consume the account's included compute usage and may be billed. Artifact storage is separate. Apple distribution membership is a separate cost. Never make private source public to obtain free CI. Always check [current GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) and your account before a run.

No token entry or token storage is enabled in this foundation. Only language/theme preferences are saved. Logs remain in memory; redaction is best effort and unknown secrets can remain. Read [SECURITY.md](SECURITY.md) before sharing logs or working on integration.

MIT covers original Douvi code. Third-party code retains its own license. No xcross, iPASide, ios-deploy, pymobiledevice3, Apple SDK, signing material or other tool binary is bundled. See [third-party policy](THIRD_PARTY_NOTICES.md), [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md) and [research](docs/research/TASK-01.vi.md).

By [Douvi Labs](https://douvi.net). Not affiliated with Apple, GitHub or Flutter.
