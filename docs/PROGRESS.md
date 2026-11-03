# Tiến độ Douvi iOS Bridge — 03/11/2026

Repository chính thức: https://github.com/douvi-net/douvi-ios-bridge, **Public, MIT**, theo phê duyệt của chủ tài khoản. Bản mã nền công khai gồm 73 tệp được theo dõi, bao gồm source, icon, test, fixture, nghiên cứu và tài liệu nghiệm thu. Các commit rút gọn bên dưới thuộc lịch sử local có trong gói bàn giao ban đầu; lịch sử commit trên GitHub được tạo khi công khai source. **Chưa chạy CI, chưa phát hành installer, chưa có IPA thật.**

| Hạng mục | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| TASK 01 — Research & Architecture | **PASS** | So sánh 7 repo bắt buộc và công cụ bổ sung; snapshot commit/release/license/issues; chính sách CI hiện hành; kiến trúc và 3 ADR. [Nghiên cứu](research/TASK-01.vi.md), commit `033793b`. |
| TASK 02 — Repository Foundation, phần source | **PASS trong phạm vi cục bộ** | README VI/EN, MIT, góp ý/bảo mật/ứng xử, issue/PR templates, CI thủ công có chặn chi phí, mã nền module và lockfile npm. Commit `9a8ea86`. |
| TASK 02 — Repository GitHub | **PASS phần công khai source** | Repo `douvi-net/douvi-ios-bridge` đã tạo Public với MIT. Source được công khai trên `main`, giữ đúng cây thư mục. Private vulnerability reporting đã bật. CI YAML chỉ chạy thủ công; chưa dispatch hoặc nghiệm thu CI thật. |
| TASK 03 — Desktop | **BLOCKED nghiệm thu Windows** | UI React/Tauri source có theme và VI/EN; browser workbench chạy được. `cargo metadata` không chạy được vì thiếu cargo. Chưa có Cargo.lock, Rust/native dependency audit, installer hay Windows thật. |
| TASK 04 — Project Detection | **PASS core/browser; BLOCKED native** | Nhận diện Flutter, iOS runner, Bundle ID, version, lock và lỗi; scenario tests. Native reader cần kiểm tra Windows. |
| TASK 05 — GitHub Integration | **BLOCKED / chưa triển khai tích hợp** | Có validation tên repo và thiết kế quyền, secure storage, workflow diff/dispatch; chưa có OAuth/PAT store/network integration. Không có đăng nhập giả. |
| TASK 06 — First Real IPA | **BLOCKED** | Generator chỉ xuất workflow nháp unsigned `.app`; chưa chạy macOS, không có run ID/artifact/IPA. |
| TASK 07 — Build Log Analyzer | **PASS bộ quy tắc ban đầu; chưa nghiệm thu corpus CI thật** | Phân loại signing/Pods/Xcode/Dart/GitHub/budget/disk; ẩn credential nhận diện được; log lạ không suy ra thành công. |
| TASK 08–10 — Signing / Device / TestFlight | **BLOCKED / chưa triển khai** | Các mục UI ghi rõ chưa sẵn sàng; không có cài/ký/upload giả. |
| TASK 11–12 — Release / Community | **BLOCKED / chưa thực hiện** | Không có phát hành công khai hoặc đăng bài cộng đồng. |

## Kiểm thử thực tế

- `npm run check`: **PASS**, gồm Biome lint, TypeScript, **71 tests / 3 test files**, Vite production build.
- `npm audit`: **0 advisory được báo trong lần kiểm tra**, xem [JSON](verification/npm-audit.json). Không diễn giải thành bảo đảm an toàn tuyệt đối.
- `npm run test:ui`: **PASS 9 nhóm kiểm tra** bằng Chromium `153.0.8010.0`: import thư mục có fixture metadata, render findings, hai chặn xác nhận, tạo và tải YAML, từ chối traversal, ẩn log và không lưu log, locale/theme, viewport nhỏ, không có page error/yêu cầu HTTP ngoài localhost.
- Browser mặc định của Playwright tải lỗi; đã dùng Chromium từ package QA riêng để chạy thành công. Không bundle browser QA vào repo/installer. Script hỗ trợ `BRIDGE_BROWSER_EXECUTABLE`; đây không phải kiểm thử Windows WebView2.
- `npm run tauri -- build --no-bundle`: **BLOCKED** tại `cargo metadata` vì môi trường không có cargo. Bốn test Rust trong source **chưa chạy**.
- Không có kiểm thử iPhone hoặc TestFlight; fixture tối giản không phải Flutter sample build được.

Chứng cứ kiểm thử cục bộ trước lần công khai: [manifest](verification/manifest.json), [local checks](verification/local-checks.txt), [production build](verification/build-check.txt), [browser checks](verification/browser-smoke.json). Chúng xác nhận mã nền trong lịch sử local, không phải kết quả GitHub Actions. QA screenshots chỉ dùng để kiểm tra nội bộ, không nằm trong gói giao.

## Chi phí và rủi ro còn lại

**Chi phí dịch vụ bên ngoài phát sinh: $0.** Không tạo tài nguyên trả phí, không chạy GitHub Actions, không gửi signing assets. Thời gian/compute trong phiên làm việc không phải báo giá CI.

Rủi ro chính: Rust/Tauri và native dependencies chưa compile/audit; trình duyệt không thay WebView2; chưa xác minh Flutter/Xcode/plugin trên runner; redaction có thể bỏ sót secret chưa nhận diện; signed lane và tải/xác thực artifact chưa triển khai. Bản nguồn hiện tại dùng cho phát triển, chưa quảng bá là ứng dụng Windows đã hoạt động toàn bộ.

## Bước tiếp theo cụ thể

Tiếp đến là gate Windows (Cargo.lock, fmt/test/clippy, installer), rồi TASK 05 — tích hợp GitHub trong ứng dụng. Chỉ source của dự án mới được công khai, không có source ứng dụng riêng hoặc signing material. Việc tạo repo và đưa source lên không tự đồng ý chạy CI hay phát hành Release.

Khi có quyền chạy CI, tạo Flutter sample thật và nghiệm thu unsigned compile trước; TASK 06 chỉ PASS khi có **IPA ký thật**, log/run ID và artifact tải về được kiểm chứng theo [ACCEPTANCE.md](ACCEPTANCE.md).
