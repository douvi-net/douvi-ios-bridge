# Tiến độ Douvi iOS Bridge — 03/11/2026

Repository chính thức: https://github.com/douvi-net/douvi-ios-bridge, **Public, MIT**, theo phê duyệt của chủ tài khoản. **Đã hoàn tất kiểm thử tự động và đóng gói bộ cài phát triển Windows x64 `0.1.0-dev.1`. Chưa có IPA thật hoặc public Release.**

## TASK 03 — Kết quả Windows

[GitHub Actions run 41631875336](https://github.com/douvi-net/douvi-ios-bridge/actions/runs/41631875336) hoàn tất thành công trên source `9fb9c19bbaaefc94ccc5eac2f2ba117794c701d4`. Bản NSIS cài theo người dùng đã được cài, mở bằng executable vừa cài và gỡ thành công trên Windows Server 2022 x64. Kiểm thử kết nối vào WebView2 thật của Tauri, không thay bằng giao diện web giả lập.

- JavaScript: lint, TypeScript, **71 tests / 3 files**, production web build, npm audit không báo advisory và **9 nhóm browser smoke** đều đạt.
- Native: Rust **1.99.1**, Cargo.lock, rustfmt, **7 test Rust** và Clippy với `-D warnings` đều đạt trên Windows.
- **8 nhóm native smoke** đạt: PE/hash, cài per-user và đối chiếu binary, mở WebView2, mở/hủy folder picker, drop-handler fallback, chọn fixture qua native dialog → Rust IPC → findings, từ chối IPC lạ cùng VI/EN/theme persistence, gỡ cài đặt.
- Bộ cài kèm giấy phép upstream và inventory cho 252 package. RustSec preflight không có vulnerability entry; hai cảnh báo thông tin nằm ngoài dependency graph Windows đã chọn, xem [audit](verification/task03-rust-audit.json).
- ZIP artifact đã tải về và được đối chiếu digest GitHub, CRC, biên nhận PASS, source/run ID, hash/size installer, Cargo.lock và toolchain. [Biên nhận cuối](verification/windows-native-20261103.json), [cách tái tạo](WINDOWS.md).

Installer `Douvi iOS Bridge_0.1.0-dev.1_x64-setup.exe`: 2,132,970 byte, SHA-256 `16b8db8fb91fb1c8a5e5b8d1265d00894cb906ddb1c0623e645b2441d381aac3`. Artifact GitHub `13229835008` được giữ một ngày, hết hạn `2026-11-04T12:08:06Z`. Commit thêm biên nhận/tài liệu sau run chỉ cập nhật tài liệu; source đã build vẫn là SHA nêu trên.

**Phạm vi:** runner Windows Server không thay cho nghiệm thu máy Windows 10/11 cá nhân, kéo thả vật lý hoặc máy sạch thiếu WebView2. Đây là bộ cài phát triển chưa ký Authenticode. Fixture chỉ có metadata; không suy ra Flutter/iOS build, signing, cài iPhone hoặc TestFlight đã hoạt động.

| Hạng mục | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| TASK 01 — Research & Architecture | **PASS** | So sánh repo, snapshot và 3 ADR. [Nghiên cứu](research/TASK-01.vi.md). |
| TASK 02 — Foundation/GitHub | **PASS trong phạm vi source và CI** | Source MIT trên GitHub, tài liệu/templates, npm lock và manual CI đã chạy thật. |
| TASK 03 — Desktop Windows | **PASS gate tự động** | Build/test/Clippy và bộ cài cài–mở–native UI–gỡ đạt trong run nêu trên; nghiệm thu máy cá nhân và ký số còn riêng. |
| TASK 04 — Project Detection | **PASS core/browser/native metadata** | Kiểm tra allowlist, path boundary/junction, Unicode, UTF-8, kích thước và đọc fixture qua Rust trên Windows. Không phải build Flutter thật. |
| TASK 05 — GitHub Integration | **Chưa triển khai** | Chưa có OAuth/PAT store, network integration, review/dispatch/download trong sản phẩm. |
| TASK 06 — First Real IPA | **Chưa nghiệm thu** | Chỉ xuất workflow nháp unsigned `.app`; chưa chạy macOS hoặc tạo signed IPA. |
| TASK 07 — Build Log Analyzer | **PASS bộ quy tắc ban đầu** | Phân loại lỗi offline, redaction và unknown-log handling; corpus CI thật còn thiếu. |
| TASK 08–10 — Signing / Device / TestFlight | **Chưa triển khai** | Chưa ký IPA, cài iPhone hoặc upload TestFlight. |
| TASK 11–12 — Release / Community | **Chưa thực hiện** | Chưa phát hành Release hoặc đăng bài cộng đồng. |

## Chứng cứ lịch sử và chi phí

[Manifest](verification/manifest.json), [local checks](verification/local-checks.txt), [production build](verification/build-check.txt) và [browser checks](verification/browser-smoke.json) là bằng chứng mã nền cục bộ trước khi công khai source. [Native preflight](verification/task03-native-preflight.json) là trạng thái trước Windows CI; không thay cho biên nhận cuối ở trên.

CI đã duyệt chỉ dùng standard GitHub-hosted Ubuntu/Windows runner cho repository công khai, quyền đọc, không cache upload, artifact tối đa 51 MiB và một ngày. Không tạo tài nguyên trả phí, không chạy macOS, không gửi signing assets hoặc phát hành Release. Billing/storage vẫn phải rà soát trước lần chạy mới.

## Bước tiếp theo

PR Windows được chuẩn bị để review. Tiếp theo về chức năng là TASK 05 — tích hợp GitHub trong ứng dụng. Một lượt build macOS thật cần dự án Flutter hoàn chỉnh, source SHA, workflow và chi phí được duyệt; TASK 06 chỉ PASS khi có signed IPA thật được tải và kiểm chứng theo [ACCEPTANCE.md](ACCEPTANCE.md).
