# ADR 0001 — Use the official Flutter/macOS lane first

Status: accepted for foundation design, 2026-11-03.

The first user is a Windows developer with a Flutter app and limited budget. Flutter's official iOS release process uses Xcode/macOS. Local alternatives advertise useful capabilities, but do not establish compatibility with arbitrary CocoaPods, project resources or signing configurations.

Choose a GitHub/macOS adapter, BYO repository/account, standard runner only and explicit cost/source consent. Create an unsigned `.app` artifact for a preliminary compile check, then implement signed IPA export as a separate milestone. Reject unsupported modes instead of faking output.

Alternatives: Codemagic is easier hosted CI but adds a mandatory service dependency if used as the only lane; EAS targets Expo/React Native; xtool focuses on SwiftPM; xcross is promising but needs compatibility tests and separate AGPL distribution review. None is bundled in this foundation.

Consequences: no Mac ownership is required for the remote lane, but macOS infrastructure and valid Apple signing remain necessary. Public standard runner compute can be free; private compute/storage requires account-specific checks. SDK/source may not be redistributed merely because an upstream tool is open source.

Evidence: [research](../research/TASK-01.vi.md), [Flutter deployment](https://docs.flutter.dev/deployment/ios), [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
