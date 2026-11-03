# Contributing

Start with [architecture](docs/ARCHITECTURE.md) and [acceptance gates](docs/ACCEPTANCE.md). This is an early foundation; do not advertise unsupported functionality as complete.

1. Open an issue describing the concrete user problem and supported operating systems.
2. Use a branch and keep changes within one module. Never include credentials, profiles, private keys, private source or downloaded Apple SDK files.
3. Use Node.js 24 and `npm ci`. Run `npm run check`; for UI changes, also run `npm run test:ui` after installing Playwright Chromium. Add scenario tests for new behavior and security boundaries.
4. For native changes, use stable Rust on Windows, run `cargo fmt`, `cargo test`, `cargo clippy -- -D warnings`, and a Tauri build. Commit/review `Cargo.lock`. Document actual host, tool versions and limitations.
5. Submit a PR using the template. Include commands, real outputs and any CI run/artifact link. Use PASS, FAIL or BLOCKED; no invented completion percentages.

Changes affecting workflow writes, dispatch, secret management, installation, uploads or cost controls need explicit review and human approval before execution. Avoid mutable action tags, broad PAT scopes, shell string interpolation and unreviewed binaries.

The proposed GitHub owner and public/private visibility must be approved before remote creation. No automated public release or automatic merge is configured. Maintainers should enable private vulnerability reporting before opening the repository to the public.
