# ADR 0002 — Tauri desktop, narrow native commands, no mandatory backend

Status: accepted for foundation design, 2026-11-03.

Choose Tauri 2, React/TypeScript and Rust. Share pure detection, validation and offline diagnostics with browser verification. Keep file access, credential storage, process execution and authenticated API operations in explicit native services. Do not expose generic shell, filesystem or network plugin permissions.

The first command opens its own native folder dialog and reads five bounded metadata files under that root. It accepts no renderer-supplied arbitrary path. Browser import is useful for development but does not prove native behavior.

Use Windows Credential Manager for future credential storage; no plaintext fallback. No authentication or secret entry is enabled until that implementation is verified. Language/theme are the only persisted values today.

Consequences: small native authority and no compulsory Douvi server; additional native tooling and real Windows verification are required before claiming a desktop release. Electron was considered but provides a wider Node/browser integration surface and larger runtime than this foundation needs.

Evidence: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri permissions](https://v2.tauri.app/security/permissions/), [Windows credential API](https://learn.microsoft.com/en-us/windows/win32/api/wincred/).
