import { describe, expect, it } from "vitest";
import { inspectProject } from "../packages/core/src";
import { projectFiles, validPubspec } from "./fixtures";

describe("Flutter project inspection", () => {
  it("recognizes a Flutter iOS app, deduplicates bundle IDs and does not require Pods", () => {
    const p = inspectProject(projectFiles());
    expect(p.kind).toBe("flutter");
    expect(p.version).toBe("1.0.0+1");
    expect(p.bundleIds).toEqual(["net.douvi.bridgeexample"]);
    expect(p.hasPods).toBe(false);
    expect(p.findings).toEqual([]);
  });
  it("reports a missing root pubspec", () =>
    expect(inspectProject([]).findings[0]?.code).toBe("PUBSPEC_MISSING"));
  it("does not mislabel a Dart command-line app as Flutter", () => {
    expect(
      inspectProject([
        { path: "pubspec.yaml", content: "name: cli\ndependencies:\n  args: ^2.0.0\n" },
      ]).kind,
    ).toBe("unsupported");
  });
  it.each([
    "name: [unterminated",
    `${validPubspec}\nname: duplicate`,
    "!!js/object name: bad",
    `${validPubspec}\ncustom: !unsafe x`,
  ])("rejects malformed YAML, duplicate keys and tags: %s", (content) => {
    const p = inspectProject([{ path: "pubspec.yaml", content }]);
    expect(p.findings.some((f) => f.code === "PUBSPEC_INVALID")).toBe(true);
  });
  it("requires an actual iOS runner, not just any ios path", () => {
    const p = inspectProject([
      { path: "pubspec.yaml", content: validPubspec },
      { path: "ios/random", content: "" },
    ]);
    expect(p.findings.some((f) => f.code === "IOS_MISSING" && f.severity === "error")).toBe(true);
  });
  it("tells users that CocoaPods executes remotely", () => {
    const p = inspectProject([
      ...projectFiles(),
      { path: "ios/Podfile", content: "platform :ios, '15.0'" },
    ]);
    expect(p.findings.some((f) => f.code === "PODS_REMOTE" && f.severity === "info")).toBe(true);
  });
  it("warns about default bundle identifiers", () => {
    const p = inspectProject(
      projectFiles().map((f) => ({
        ...f,
        content: f.content.replaceAll("net.douvi.bridgeexample", "com.example.app"),
      })),
    );
    expect(p.findings.some((f) => f.code === "BUNDLE_PLACEHOLDER")).toBe(true);
  });
  it.each([
    "../pubspec.yaml",
    "/pubspec.yaml",
    "C:\\Users\\someone\\pubspec.yaml",
    "ios/../../pubspec.yaml",
  ])("rejects unscoped paths: %s", (path) =>
    expect(() => inspectProject([{ path, content: "" }])).toThrow(),
  );
  it("rejects duplicate normalized metadata paths", () =>
    expect(() =>
      inspectProject([
        { path: "pubspec.yaml", content: "" },
        { path: "./pubspec.yaml", content: "" },
      ]),
    ).toThrow("Duplicate"));
  it("limits metadata size", () =>
    expect(() =>
      inspectProject([{ path: "pubspec.yaml", content: "x".repeat(1_048_577) }]),
    ).toThrow("1 MiB"));
  it("supports Windows relative path separators", () => {
    expect(
      inspectProject(projectFiles().map((f) => ({ ...f, path: f.path.replaceAll("/", "\\") })))
        .hasIos,
    ).toBe(true);
  });
});
