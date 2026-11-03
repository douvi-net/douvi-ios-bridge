# Acceptance gates

PASS is scoped to evidence actually collected. Source code, a generated workflow, a browser UI or a green parser test do not prove a Windows app, macOS build or signed IPA.

| TASK | Acceptance criteria |
| --- | --- |
| 01 Research | Primary-source comparison for required repos, license/maintenance/issues evidence, current cost policy, explicit architecture/ADRs and unresolved native compatibility |
| 02 Foundation | Reviewable source, repository docs/license/security/contribution/templates, reproducible JS checks and manual CI definition; remote repository created under approved owner/visibility and read back before claiming remote PASS |
| 03 Desktop | Windows installer produced and installed/launched, dialogs/drop/IPC tested on Windows, VI/EN and themes; clean native build/tests and lockfile |
| 04 Detection | Valid/invalid Flutter metadata, iOS presence, locked dependencies, bundle IDs and actionable errors; safe file boundaries; Windows-native read verified |
| 05 GitHub | Selected repo permissions, secure storage/revocation, conflict-safe workflow write after diff review, consent-bound dispatch, real run correlation, polling/cancel/timeouts without secret leaks |
| 06 Real IPA | Actual Flutter sample with full iOS project, approved macOS run ID and immutable source SHA, actual log/tool versions, **signed IPA** downloaded and checksum/payload/signature validated. Unsigned compile may PASS only as a sub-gate. |
| 07 Diagnostics | Actual error scenarios, bilingual guidance, redaction before classification, no unknown-log success inference; corpus of sanitized real CI failures |
| 08 Signing | Matching bundle/team/cert/private key/profile/entitlements/expiry/export method; failure fixtures and verified macOS signing outputs; no material leaks |
| 09 iPhone | USB/driver/trust/Developer Mode checks plus successful installation/launch of eligible IPA on a real iPhone; denied/mismatched signing handled honestly |
| 10 TestFlight | Authorized API key, exact app/version/build association and successful upload evidence; distinguish uploaded/processing/available/reviewed |
| 11 Release | Prior gates pass, Windows signed/unsigned installer status explicit, dependency/license/supply-chain review, release notes and clean install; publish only after approval |
| 12 Community | Accurate launch copy and working docs/demo; no publication or messages without approval |

## Evidence required for a real build

Store repository/ref and full source SHA, workflow revision, unique run ID/URL, job result/log, runner image/OS, Xcode/Flutter versions, export method, artifact identity/size/expiry, download SHA-256 and payload/signature inspection. Keep certificate/profile/UDID/private metadata out of public evidence. A manually filled evidence object is a record format, not independent verification.

## Next real macOS test

1. In an approved repository, create a real Flutter sample with `flutter create --platforms=ios --org net.douvi bridge_example`; review and commit its complete iOS tree. The fixture under `tests/fixtures` is metadata-only and is not this sample.
2. Generate/review the workflow for the chosen exact Flutter version and repository directory. Check runner/Xcode compatibility and account billing/storage limits. Workflow installation is a separate reviewed change.
3. Dispatch manually for the exact reviewed commit after approving code execution and cost. Do not dispatch until repo visibility/account are settled.
4. Download the nonempty unsigned `.app` archive, inspect the arm64 executable and hash. Record this as compile-only evidence.
5. Implement and review signed export using the developer's own signing assets and ephemeral keychain; repeat with signature verification. Only then consider TASK 06 PASS.

The initial foundation was prepared without CI execution. Subsequent Windows verification is recorded in the [native receipt](verification/windows-branding-20261103.json) and [progress](PROGRESS.md). No macOS run, signing upload or public Release is covered by that Windows result.
