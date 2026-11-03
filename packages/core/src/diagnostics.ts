import { finding } from "./detector";
import { redactLog } from "./security";
import type { Finding } from "./types";

const rules: { pattern: RegExp; finding: Finding }[] = [
  {
    pattern:
      /no profiles for|requires a provisioning profile|provisioning profile.*(?:doesn't|does not|not)|no signing certificate/i,
    finding: finding(
      "SIGNING_PROFILE",
      "error",
      "Signing assets are missing or mismatched",
      "Thiếu hoặc sai hồ sơ ký",
      "Check bundle ID, team, profile expiry, certificate private key and export method on the macOS runner.",
      "Kiểm tra Bundle ID, team, hạn profile, private key của chứng chỉ và phương thức xuất trên macOS.",
    ),
  },
  {
    pattern:
      /CocoaPods.*(?:not installed|out.of.date)|pod install.*(?:failed|error)|could not find compatible versions for pod/i,
    finding: finding(
      "COCOAPODS",
      "error",
      "CocoaPods dependencies failed",
      "Lỗi thư viện CocoaPods",
      "Check the macOS CocoaPods version, Podfile.lock, deployment target and native plugin compatibility.",
      "Kiểm tra CocoaPods trên macOS, Podfile.lock, phiên bản iOS tối thiểu và plugin native.",
    ),
  },
  {
    pattern:
      /xcode.*(?:not found|not installed)|invalid active developer path|requires Xcode|SDK.*cannot be located/i,
    finding: finding(
      "XCODE_SDK",
      "error",
      "Xcode or iOS SDK is unavailable",
      "Thiếu Xcode hoặc iOS SDK",
      "Use a supported macOS runner and record xcodebuild -version and xcode-select -p.",
      "Dùng runner macOS phù hợp; kiểm tra xcodebuild -version và xcode-select -p.",
    ),
  },
  {
    pattern: /version solving failed|requires SDK version|current Dart SDK version/i,
    finding: finding(
      "DART_SDK",
      "error",
      "Flutter and Dart versions do not match",
      "Phiên bản Flutter và Dart không phù hợp",
      "Pin a Flutter release satisfying environment.sdk and your plugin requirements.",
      "Chọn phiên bản Flutter đáp ứng environment.sdk và điều kiện plugin.",
    ),
  },
  {
    pattern: /resource not accessible by|HTTP 403|bad credentials|HTTP 401/i,
    finding: finding(
      "GITHUB_AUTH",
      "error",
      "GitHub access needs attention",
      "Cần kiểm tra quyền GitHub",
      "Check the selected account, repository permissions, token expiry and Actions policy. Do not grant all-repository access as a shortcut.",
      "Kiểm tra tài khoản, quyền repo, hạn token và chính sách Actions; chỉ cấp quyền repo cần dùng.",
    ),
  },
  {
    pattern:
      /billing.*(?:limit|disabled)|spending limit|insufficient.*(?:credit|minute)|exceeded.*(?:minute|budget)/i,
    finding: finding(
      "CI_BUDGET",
      "error",
      "CI billing or quota blocked this run",
      "CI bị chặn bởi hạn mức",
      "Check GitHub billing and stop-spending controls before approving another run.",
      "Kiểm tra hạn mức và chặn chi tiêu trên GitHub trước khi chạy lại.",
    ),
  },
  {
    pattern: /(?:no space left on device|disk quota exceeded)/i,
    finding: finding(
      "RUNNER_DISK",
      "error",
      "Runner storage is full",
      "Runner hết dung lượng",
      "Inspect disk usage and build outputs; reduce retained artifacts or choose an appropriate runner after cost review.",
      "Kiểm tra dung lượng, giảm artifact lưu lại hoặc chọn runner sau khi xem chi phí.",
    ),
  },
];
export function analyzeBuildLog(
  raw: string,
  knownSecrets: readonly string[] = [],
): { redactedLog: string; findings: Finding[] } {
  const redactedLog = redactLog(raw, knownSecrets);
  const findings = rules
    .filter((rule) => rule.pattern.test(redactedLog))
    .map((rule) => rule.finding);
  if (!findings.length)
    findings.push(
      finding(
        "UNCLASSIFIED",
        "info",
        "No known error rule matched",
        "Chưa khớp quy tắc lỗi có sẵn",
        "This does not prove success. Review the sanitized log and actual workflow conclusion.",
        "Kết quả này không chứng minh build thành công; hãy kiểm tra log đã ẩn dữ liệu và kết quả workflow.",
      ),
    );
  return { redactedLog, findings };
}
