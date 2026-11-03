import type { ProjectFile, WorkflowConfig } from "../packages/core/src";
export const validPubspec = `name: bridge_example
version: 1.0.0+1
environment:
  sdk: '>=3.6.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
`;
export const projectFiles = (): ProjectFile[] => [
  { path: "pubspec.yaml", content: validPubspec },
  { path: "pubspec.lock", content: "packages: {}" },
  {
    path: "ios/Runner.xcodeproj/project.pbxproj",
    content:
      'PRODUCT_BUNDLE_IDENTIFIER = net.douvi.bridgeexample;\nPRODUCT_BUNDLE_IDENTIFIER = "net.douvi.bridgeexample";',
  },
  { path: "ios/Runner/Info.plist", content: "<plist/>" },
];
export const config = (): WorkflowConfig => ({
  flutterVersion: "3.38.5",
  projectDirectory: ".",
  runner: "macos-15",
  timeoutMinutes: 30,
  retentionDays: 1,
  mode: "unsigned",
});
