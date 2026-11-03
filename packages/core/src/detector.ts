import { parseDocument } from "yaml";
import type { Finding, ProjectFile, ProjectInspection } from "./types";

export const finding = (
  code: string,
  severity: Finding["severity"],
  en: string,
  vi: string,
  fixEn: string,
  fixVi: string,
): Finding => ({ code, severity, title: { en, vi }, fix: { en: fixEn, vi: fixVi } });

function safePath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[a-z]:/i.test(normalized) ||
    normalized.split("/").some((x) => x === "..")
  ) {
    throw new Error("Only project-relative file paths are allowed.");
  }
  return normalized.replace(/^\.\//, "");
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function inspectProject(files: ProjectFile[]): ProjectInspection {
  if (files.length > 5000) throw new Error("Too many project metadata files.");
  const map = new Map<string, string>();
  for (const file of files) {
    if (file.content.length > 1_048_576) throw new Error("Project metadata file exceeds 1 MiB.");
    const path = safePath(file.path);
    if (map.has(path)) throw new Error("Duplicate project metadata path.");
    map.set(path, file.content);
  }
  const findings: Finding[] = [];
  const result: ProjectInspection = {
    kind: "unsupported",
    name: "Unknown project",
    version: null,
    hasIos: map.has("ios/Runner.xcodeproj/project.pbxproj"),
    hasPods: map.has("ios/Podfile"),
    bundleIds: [],
    findings,
    fileCount: files.length,
  };
  const pubspec = map.get("pubspec.yaml");
  if (!pubspec) {
    findings.push(
      finding(
        "PUBSPEC_MISSING",
        "error",
        "Select the Flutter project root",
        "Chọn thư mục gốc Flutter",
        "The folder must contain pubspec.yaml.",
        "Thư mục cần có pubspec.yaml.",
      ),
    );
    return result;
  }
  try {
    const doc = parseDocument(pubspec, { uniqueKeys: true });
    if (doc.errors.length || doc.warnings.length) throw new Error("Invalid or unsupported YAML.");
    const data: unknown = doc.toJS({ maxAliasCount: 30 });
    if (
      !object(data) ||
      !object(data.dependencies) ||
      !object(data.dependencies.flutter) ||
      data.dependencies.flutter.sdk !== "flutter"
    ) {
      throw new Error("Not a Flutter application.");
    }
    result.kind = "flutter";
    result.name = typeof data.name === "string" ? data.name : "Flutter project";
    result.version = typeof data.version === "string" ? data.version : null;
    if (!result.version)
      findings.push(
        finding(
          "VERSION_MISSING",
          "warning",
          "Version is not declared",
          "Chưa khai báo phiên bản",
          "Set version: 1.0.0+1 in pubspec.yaml before distribution.",
          "Đặt version: 1.0.0+1 trong pubspec.yaml trước khi phát hành.",
        ),
      );
    if (!object(data.environment) || typeof data.environment.sdk !== "string")
      findings.push(
        finding(
          "DART_CONSTRAINT_MISSING",
          "warning",
          "Dart SDK constraint is missing",
          "Thiếu điều kiện Dart SDK",
          "Declare environment.sdk and choose a matching Flutter version.",
          "Khai báo environment.sdk và chọn phiên bản Flutter phù hợp.",
        ),
      );
  } catch {
    findings.push(
      finding(
        "PUBSPEC_INVALID",
        "error",
        "Cannot validate pubspec.yaml",
        "Không xác thực được pubspec.yaml",
        "Use valid YAML with dependencies.flutter.sdk: flutter; custom tags and duplicate keys are rejected.",
        "Kiểm tra YAML và dependencies.flutter.sdk: flutter; không dùng khóa trùng hoặc tag tùy chỉnh.",
      ),
    );
    return result;
  }
  if (!result.hasIos)
    findings.push(
      finding(
        "IOS_MISSING",
        "error",
        "iOS runner is missing",
        "Thiếu dự án iOS",
        "Back up your project, then run flutter create --platforms=ios . and review the changes.",
        "Sao lưu, chạy flutter create --platforms=ios . rồi kiểm tra thay đổi.",
      ),
    );
  if (!map.has("pubspec.lock"))
    findings.push(
      finding(
        "LOCK_MISSING",
        "warning",
        "Dependencies are not locked",
        "Chưa khóa phiên bản thư viện",
        "Run flutter pub get and commit pubspec.lock for this application.",
        "Chạy flutter pub get và commit pubspec.lock của ứng dụng.",
      ),
    );
  if (result.hasPods)
    findings.push(
      finding(
        "PODS_REMOTE",
        "info",
        "CocoaPods requires the macOS build lane",
        "CocoaPods sẽ chạy trên macOS",
        "Resolve native plugin dependencies on the macOS runner. Windows does not need CocoaPods for this lane.",
        "Giải quyết thư viện native trên runner macOS; luồng này không cần CocoaPods trên Windows.",
      ),
    );
  const pbx = map.get("ios/Runner.xcodeproj/project.pbxproj") ?? "";
  result.bundleIds = [
    ...new Set(
      [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([A-Za-z0-9.-]+)"?\s*;/g)]
        .map((m) => m[1])
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (result.bundleIds.some((id) => id.startsWith("com.example.")))
    findings.push(
      finding(
        "BUNDLE_PLACEHOLDER",
        "warning",
        "Default bundle identifier found",
        "Bundle ID còn mặc định",
        "Choose your own bundle identifier before signing or publishing.",
        "Đổi sang Bundle ID riêng trước khi ký hoặc phát hành.",
      ),
    );
  return result;
}

export const metadataPaths = new Set([
  "pubspec.yaml",
  "pubspec.lock",
  "ios/Podfile",
  "ios/Runner.xcodeproj/project.pbxproj",
  "ios/Runner/Info.plist",
]);
