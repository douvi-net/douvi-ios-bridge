# Douvi iOS Bridge

Công cụ mã nguồn mở giúp lập trình viên Windows chuẩn bị build iOS bằng macOS CI của mình, không bắt buộc sở hữu máy Mac.

**Đã có bộ cài Windows x64 bản phát triển `0.1.0-dev.1`, chưa ký số.** CI trên Windows Server 2022 đã kiểm tra build, cài đặt, mở ứng dụng, hộp chọn thư mục native, Rust IPC, ngôn ngữ/theme và gỡ cài đặt. Chưa nghiệm thu trên máy Windows 10/11 cá nhân; chưa có IPA thật hoặc public Release.

[Kết quả CI](https://github.com/douvi-net/douvi-ios-bridge/actions/runs/41631875336), [biên nhận artifact và SHA-256](docs/verification/windows-native-20261103.json), [hướng dẫn kiểm thử/cài Windows](docs/WINDOWS.md).

## Đã có gì?

- Giao diện Anh/Việt, sáng/tối, thiết kế cho desktop.
- Hộp chọn thư mục Windows native, đọc metadata Flutter qua Rust với giới hạn đường dẫn; trình duyệt có chọn/kéo thả thư mục để kiểm thử.
- Kiểm tra `pubspec.yaml`, iOS runner, Bundle ID, phiên bản và dependency lock.
- Tạo/tải workflow nháp build `.app` **chưa ký** trên macOS. Không tự ghi vào repo hoặc chạy CI.
- Chẩn đoán lỗi build offline, ẩn token nhận diện được và đường dẫn cá nhân.
- Installer NSIS cài theo người dùng, kèm văn bản giấy phép và inventory của 252 package.

## Mở bản làm việc

Cài Node.js 24. Mở terminal tại thư mục chứa `package.json`:

```powershell
npm ci
npm run dev
```

Mở địa chỉ localhost được in ra. Chọn thư mục Flutter gốc có `pubspec.yaml`, bấm **Xem cấu hình build**, nhập phiên bản Flutter chính xác đang dùng, đọc hai xác nhận và tạo workflow nháp. File nháp chưa thực hiện build.

Nếu chưa có thư mục iOS, sao lưu dự án trước khi chạy `flutter create --platforms=ios .` rồi xem kỹ thay đổi. Bridge không tự chạy lệnh này.

Để chạy desktop từ source: cài [C++ Build Tools, WebView2 và Rust MSVC theo Tauri](https://v2.tauri.app/start/prerequisites/), rồi chạy `npm run tauri -- dev`. Rust 1.99.1 và dependency lock đã được ghim. Xem các lệnh build/kiểm tra đầy đủ trong [hướng dẫn Windows](docs/WINDOWS.md).

Với bộ cài đã kiểm chứng, giải nén artifact, đối chiếu SHA-256 trong `native-smoke.json`, rồi chạy `Douvi iOS Bridge_0.1.0-dev.1_x64-setup.exe`. Đây là bản chưa ký Authenticode, nên Windows có thể hiện cảnh báo nhà phát hành chưa xác định. Không tắt các biện pháp bảo vệ của hệ điều hành để cài thử. Artifact CI chỉ được giữ một ngày; có thể tự build lại từ source đã ghi nhận.

## Phần cần làm tiếp

Repository [douvi-net/douvi-ios-bridge](https://github.com/douvi-net/douvi-ios-bridge) đã có source công khai với MIT. Bước tiếp theo là TASK 05: tích hợp GitHub trong ứng dụng với quyền theo repo, lưu credential an toàn, review workflow, dispatch và tải artifact thật. Chức năng này chưa triển khai.

IPA có ký cần chứng chỉ/profile hợp lệ; cài iPhone cần thiết bị thật. Upload TestFlight thành công chưa đồng nghĩa Apple duyệt ứng dụng. Bộ fixture hiện tại chỉ có metadata và không phải một dự án Flutter build được.

Xem [báo cáo nghiên cứu](docs/research/TASK-01.vi.md), [tiến độ](docs/PROGRESS.md) và [điều kiện nghiệm thu](docs/ACCEPTANCE.md). Không yêu cầu tài khoản Douvi. Phần mềm miễn phí; CI và Apple có chính sách/phí riêng.
