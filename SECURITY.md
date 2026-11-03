# Security

This development foundation is not approved for handling live GitHub tokens or Apple signing credentials. No such integration is enabled.

## Current boundary

- Only the chosen folder's five allowlisted metadata files are read. Native code refuses resolved paths outside the folder and bounds reads to 1 MiB per file. Browser selection uses the browser's file permission boundary.
- Imported project scripts are not executed. A remote build would execute both repository code and dependency scripts; it requires a reviewed commit and consent.
- The webview has a Content Security Policy and no generic filesystem, shell or networking plugin permissions. The only application command opens a folder dialog, then reads scoped metadata.
- Logs and project inspection results remain in memory. Language/theme are the only persisted preferences. No telemetry or cloud AI is enabled.
- Redaction is pattern-based, not a guarantee. Review manually before sharing. If a secret was exposed, revoke/rotate it; masking does not revoke it.
- Workflow drafts require manual execution, a full reviewed source SHA, runtime/retention bounds, cost/source acknowledgements and read-only content access.

## Required before live integration

GitHub auth must use selected-repository access, revocable credentials and Windows Credential Manager or an approved equivalent. Never send secrets to the renderer for storage, put them in localStorage, log them, place them in shell arguments or forward bearer tokens across artifact redirects. OAuth device flow alone does not imply repository-level scopes; do not silently substitute classic broad `repo` access.

Workflow write confirmation must display repository/ref, target path and before/after content, use the current blob SHA for conflict detection, and require fresh review if it changed. A dispatch must bind consent to account, repository, immutable commit, workflow revision, runner and cost context. Never retry dispatch blindly after an ambiguous response; correlate a unique request/run identifier first. Read-only polling may retry with bounded backoff and cancellation.

Signing uses explicit GitHub secrets only with informed consent, or the user's own macOS runner. Use an ephemeral keychain, clean it in an `always()` step and never upload certificates/profiles as artifacts. GitHub is a third party receiving signing data if this option is chosen. No Apple ID password is needed for the initial signed CI lane.

Artifact verification must check source/run association, result, expiry, size and digest. ZIP extraction must refuse traversal, absolute paths, symlinks escaping its destination and decompression bombs. Validate IPA payload and signature on macOS; never trust an extension or uploaded filename. A `.app` ZIP cannot be relabelled as a signed IPA.

Self-hosted runners require separate isolation and cleanup. Do not offer public forks a signing-capable self-hosted runner or expose secrets to pull requests from untrusted sources.

## Reporting

Before public launch, maintainers must enable GitHub private vulnerability reporting and document the verified contact channel here. That contact is not configured in this local foundation. Do not post secret-bearing reproduction steps or signing material in public issues. Only development `0.1.0-dev.1` is in scope; there is no supported stable release yet.
