import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import {
  type BuildEvidence,
  generateUnsignedWorkflow,
  validateBuildEvidence,
  type WorkflowConfig,
} from "../packages/core/src";
import { config } from "./fixtures";

describe("workflow safety and output contract", () => {
  it("keeps the repository CI manual and gates Windows usage separately", () => {
    const doc = parseDocument(readFileSync(".github/workflows/ci.yml", "utf8"));
    expect(doc.errors).toEqual([]);
    const ci = doc.toJS();
    expect(Object.keys(ci.on)).toEqual(["workflow_dispatch"]);
    expect(ci.on.workflow_dispatch.inputs.confirm_ci_cost.default).toBe(false);
    expect(ci.on.workflow_dispatch.inputs.verify_windows.default).toBe(false);
    expect(ci.jobs.javascript.if).toContain("inputs.confirm_ci_cost");
    expect(ci.jobs["windows-native"].if).toContain(
      "inputs.confirm_ci_cost && inputs.verify_windows",
    );
    expect(ci.permissions).toEqual({ contents: "read" });
  });
  it("creates parseable manual-only YAML with explicit cost and source consents", () => {
    const doc = parseDocument(generateUnsignedWorkflow(config()));
    expect(doc.errors).toEqual([]);
    const w = doc.toJS();
    expect(Object.keys(w.on)).toEqual(["workflow_dispatch"]);
    expect(w.on.workflow_dispatch.inputs.confirm_ci_cost.default).toBe(false);
    expect(w.on.workflow_dispatch.inputs.confirm_source_execution.default).toBe(false);
    expect(w.permissions).toEqual({ contents: "read" });
    expect(w.jobs.build["timeout-minutes"]).toBe(30);
    expect(w.jobs.build.if).toContain("inputs.confirm_ci_cost && inputs.confirm_source_execution");
  });
  it("pins each external action to a full commit, checks out the reviewed SHA and persists no credential", () => {
    const w = parseDocument(generateUnsignedWorkflow(config())).toJS();
    const actions = w.jobs.build.steps.filter((s: { uses?: string }) => s.uses);
    expect(actions.length).toBe(3);
    for (const step of actions) expect(step.uses).toMatch(/^[\w-]+\/[\w-]+@[a-f\d]{40}$/);
    expect(actions[0].with.ref).toBe("${{ inputs.reviewed_commit }}");
    expect(actions[0].with["persist-credentials"]).toBe(false);
  });
  it("packages an actual arm64 app with checksum and fails on missing output", () => {
    const text = generateUnsignedWorkflow(config());
    const w = parseDocument(text).toJS();
    expect(text).toContain("flutter build ios --release --no-codesign");
    expect(text).toContain("'Mach-O'");
    expect(text).toContain("'arm64'");
    expect(text).toContain("shasum -a 256");
    expect(w.jobs.build.steps.at(-1).with["if-no-files-found"]).toBe("error");
    expect(w.jobs.build.steps.at(-1).with.path).not.toContain(".ipa");
  });
  it("supports monorepo paths without shell interpolation", () => {
    const text = generateUnsignedWorkflow({ ...config(), projectDirectory: "apps/mobile" });
    expect(text).toContain('BRIDGE_PROJECT_DIR: "apps/mobile"');
    expect(text).toContain('cd -- "$BRIDGE_PROJECT_DIR"');
  });
  it.each(["development", "ad-hoc", "app-store"] as const)(
    "does not pretend signed %s support exists",
    (mode) => expect(() => generateUnsignedWorkflow({ ...config(), mode })).toThrow("unavailable"),
  );
  it.each([
    "../app",
    "apps/../../private",
    "/tmp/app",
    "C:\\app",
    "app\npermissions: write-all",
    "${{ secrets.TOKEN }}",
    "$(curl example.com)",
    "app;whoami",
  ])("rejects dangerous paths: %s", (projectDirectory) =>
    expect(() => generateUnsignedWorkflow({ ...config(), projectDirectory })).toThrow(),
  );
  it.each([
    { flutterVersion: "stable" },
    { flutterVersion: "3.38.5\nrun: evil" },
    { flutterVersion: "3.38.5;evil" },
    { runner: "macos-26-xlarge" },
    { timeoutMinutes: 0 },
    { timeoutMinutes: 61 },
    { timeoutMinutes: 5.1 },
    { retentionDays: 0 },
    { retentionDays: 90 },
  ])("rejects invalid and potentially costly config: %o", (changes) =>
    expect(() => generateUnsignedWorkflow({ ...config(), ...changes } as WorkflowConfig)).toThrow(),
  );
});
describe("real-build evidence gate", () => {
  const valid = (): BuildEvidence => ({
    commitSha: "a".repeat(40),
    runId: 123,
    conclusion: "success",
    artifactName: "unsigned-app.zip",
    artifactBytes: 2000,
    artifactSha256: "b".repeat(64),
    downloaded: true,
    payloadVerified: true,
    signatureVerified: false,
    artifactKind: "unsigned-app",
  });
  it("accepts complete unsigned evidence without calling it a signed IPA", () =>
    expect(validateBuildEvidence(valid())).toEqual([]));
  it("rejects generated YAML as proof of a build", () =>
    expect(
      validateBuildEvidence({ ...valid(), runId: 0, artifactBytes: 0, downloaded: false }).length,
    ).toBeGreaterThanOrEqual(3));
  it("requires signature validation for signed IPA", () =>
    expect(validateBuildEvidence({ ...valid(), artifactKind: "signed-ipa" })).toContain(
      "IPA signature has not been verified.",
    ));
  it("rejects a failed run even if an artifact was uploaded", () =>
    expect(validateBuildEvidence({ ...valid(), conclusion: "failure" })).toContain(
      "Workflow did not conclude successfully.",
    ));
  it("requires payload inspection and valid digests", () =>
    expect(
      validateBuildEvidence({ ...valid(), payloadVerified: false, artifactSha256: "not-a-digest" })
        .length,
    ).toBe(2));
});
