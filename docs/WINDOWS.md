# Windows development installer verification

This lane produces an **unsigned x64 NSIS development installer**, not a public stable release. It does not build an IPA or enable GitHub authentication in the application.

## Reproduce

Use a Windows host with Tauri's C++/WebView2 prerequisites, Node.js 24 and Rustup. The repository's `rust-toolchain.toml` selects Rust 1.99.1 with rustfmt and Clippy. `Cargo.lock` pins the resolved native dependencies.

```powershell
npm ci
npm run check
npm run licenses:bundle
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --check
cargo test --locked --manifest-path apps/desktop/src-tauri/Cargo.toml
cargo clippy --locked --all-targets --manifest-path apps/desktop/src-tauri/Cargo.toml -- -D warnings
npm run tauri -- build --no-binary-patching -- --locked
npm run test:windows
```

Generate notices before invoking Cargo directly: Tauri's native build script reads configured resources even during `cargo test`. The Tauri dev/build hooks generate notices automatically. The installer is under `apps/desktop/src-tauri/target/release/bundle/nsis/`. Installation is per user. It does not require a system-wide install. The WebView2 bootstrapper needs internet only if the runtime is missing.

Use `--no-binary-patching` in this single-NSIS development lane so the installed executable and the compiled executable have the same SHA-256. Tauri otherwise patches bundle-type metadata while preparing the installer. No per-bundle-type updater is implemented here.

## What the automated Windows lane checks

- Real x64 PE executable and a nonempty NSIS installer with a 50 MiB bound.
- Installer SHA-256, exact source commit and run association in `native-smoke.json`.
- Silent install in a unique temporary location; the installed executable matches the compiled executable by SHA-256.
- Launch the **installed release executable**, attach Playwright to its actual WebView2, verify the workbench renders and Tauri IPC is present.
- Open/cancel the native folder picker, native drop-handler fallback, select the public metadata fixture and display Rust reader results.
- Reject an unregistered IPC command, switch to Vietnamese/light theme, reload and verify persistence.
- Silent uninstall removes the executable.
- Native Rust tests include Windows junction escape, Unicode paths, invalid UTF-8, oversize metadata and metadata directories.

The test sets WebView2 debugging arguments only on its own child process and uses a unique test profile. It does not enable a debugging port in the shipped config or change registry policies. No project scripts, private files, signing assets or GitHub credentials are used.

The Windows Server runner does not substitute for acceptance on a personal Windows 10/11 machine, physical drag-and-drop or a missing-WebView2 clean machine. Record those checks separately. A smoke-test failure is a failure even when the installer was produced.

## Manual CI and costs

The existing manual workflow accepts a full reviewed source SHA and refuses a moved branch. Both jobs are limited to public repositories and standard GitHub-hosted runners. The Windows job waits for JavaScript checks. There are no push/PR triggers, cache uploads, signing steps, Release creation or write permissions. The artifact is capped at 51 MiB and expires after one day; account-wide storage quota must be checked before dispatch. The artifact may contain failure evidence, so read `native-smoke.json` and the job conclusion before treating it as verified.

## Installing a verified development build

Compare the downloaded installer's SHA-256 against the recorded value before installation:

```powershell
Get-FileHash -Algorithm SHA256 '.\Douvi iOS Bridge_0.1.0-dev.1_x64-setup.exe'
```

Use the actual filename from the artifact. The installer has no Authenticode publisher signature, so Windows may show an unknown-publisher or SmartScreen notice. Code signing and public release remain separate gates. Do not disable operating-system protections for this test.
