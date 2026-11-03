import { describe, expect, it } from "vitest";
import { analyzeBuildLog, parseGitHubRepository, redactLog } from "../packages/core/src";

describe("local log protection", () => {
  it("redacts GitHub tokens, JWTs and auth headers", () => {
    const out = redactLog(
      "ghp_dummy_123 github_pat_dummy_456 Authorization: Bearer abc123\neyJhbGciOiJub25lIn0.cGF5bG9hZA.c2lnbmF0dXJl",
    );
    for (const x of ["ghp_dummy_123", "github_pat_dummy_456", "abc123", "eyJhbGci"])
      expect(out).not.toContain(x);
  });
  it("redacts passwords, secrets with spaces, URLs and personal paths", () => {
    const out = redactLog(
      'P12_PASSWORD="very secret phrase"\nC:\\Users\\John\\repo /Users/Jane/repo /home/alice/src\na@b.com\nhttps://user:pass@host/path?token=secret&sig=signature',
    );
    for (const x of [
      "very secret phrase",
      "John",
      "Jane",
      "alice",
      "a@b.com",
      "user:pass",
      "=secret",
      "=signature",
    ])
      expect(out).not.toContain(x);
  });
  it("removes PEM material, including an incomplete private key block", () => {
    expect(
      redactLog(
        "before\n-----BEGIN PRIVATE KEY-----\nprivatebytes\n-----END PRIVATE KEY-----\nafter",
      ),
    ).toBe("before\n[REDACTED KEY/CERTIFICATE]\nafter");
    expect(redactLog("-----BEGIN EC PRIVATE KEY-----\ntruncated")).not.toContain("truncated");
  });
  it("supports known secrets that have no recognizable pattern", () =>
    expect(redactLog("hello sensitivevalue hello", ["sensitivevalue"])).not.toContain(
      "sensitivevalue",
    ));
  it("redacts before diagnosing without retaining the raw value", () => {
    const out = analyzeBuildLog(
      "GITHUB_TOKEN=ghp_dummy_123\nNo profiles for net.douvi.app were found",
    );
    expect(out.redactedLog).not.toContain("dummy_123");
    expect(out.findings[0]?.code).toBe("SIGNING_PROFILE");
  });
  it.each([
    ["CocoaPods not installed", "COCOAPODS"],
    ["invalid active developer path", "XCODE_SDK"],
    ["version solving failed", "DART_SDK"],
    ["Resource not accessible by integration", "GITHUB_AUTH"],
    ["spending limit exceeded", "CI_BUDGET"],
    ["No space left on device", "RUNNER_DISK"],
  ])("classifies real failure patterns: %s", (log, code) =>
    expect(analyzeBuildLog(log ?? "").findings[0]?.code).toBe(code),
  );
  it("does not infer success when no rule matches", () =>
    expect(analyzeBuildLog("unrecognized failure").findings[0]?.code).toBe("UNCLASSIFIED"));
});
describe("repository references", () => {
  it.each([
    "douvi-net/douvi-ios-bridge",
    "https://github.com/douvi-net/douvi-ios-bridge.git",
    "https://github.com/douvi-net/douvi-ios-bridge/",
  ])("parses %s", (s) =>
    expect(parseGitHubRepository(s)).toEqual({ owner: "douvi-net", repo: "douvi-ios-bridge" }),
  );
  it.each([
    "https://github.com.evil.test/a/b",
    "https://token@github.com/a/b",
    "https://github.com/a/b?token=x",
    "https://github.com/a/b/actions",
    "https://github.com/a/b#readme",
    "a/..",
    "a/$(touch-x)",
    "file:///a/b",
    "a/.git",
  ])("rejects misleading or unsafe reference: %s", (s) => {
    expect(() => parseGitHubRepository(s)).toThrow();
  });
});
