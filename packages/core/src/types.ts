export type Locale = "en" | "vi";
export type Severity = "error" | "warning" | "info";
export type BuildMode = "unsigned" | "development" | "ad-hoc" | "app-store";
export interface Finding {
  code: string;
  severity: Severity;
  title: Record<Locale, string>;
  fix: Record<Locale, string>;
}
export interface ProjectFile {
  path: string;
  content: string;
}
export interface ProjectInspection {
  kind: "flutter" | "unsupported";
  name: string;
  version: string | null;
  hasIos: boolean;
  hasPods: boolean;
  bundleIds: string[];
  findings: Finding[];
  fileCount: number;
}
export interface WorkflowConfig {
  flutterVersion: string;
  projectDirectory: string;
  runner: "macos-15" | "macos-26";
  timeoutMinutes: number;
  retentionDays: number;
  mode: BuildMode;
}
export interface BuildEvidence {
  commitSha: string;
  runId: number;
  conclusion: string;
  artifactName: string;
  artifactBytes: number;
  artifactSha256: string;
  downloaded: boolean;
  signatureVerified: boolean;
  payloadVerified: boolean;
  artifactKind: "unsigned-app" | "signed-ipa";
}
export interface BuildEngineAdapter {
  readonly id: string;
  readonly supportedModes: readonly BuildMode[];
  prepare(config: WorkflowConfig): string;
}
