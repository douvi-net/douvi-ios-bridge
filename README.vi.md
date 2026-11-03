# Douvi iOS Bridge

Công cụ mã nguồn mở giúp lập trình viên Windows chuẩn bị build iOS bằng macOS CI của mình, không bắt buộc sở hữu máy Mac.

**Đây là mã nền đang phát triển. Chưa có Windows installer được kiểm chứng hoặc IPA thật đã nghiệm thu.**

## Đã có gì?

- Giao diện Anh/Việt, sáng/tối, thiết kế cho desktop.
- Chọn hoặc kéo thả thư mục trong trình duyệt để đọc cấu hình Flutter; Rust có hộp chọn thư mục native, còn chờ kiểm thử Windows.
- Kiểm tra `pubspec.yaml`, iOS runner, Bundle ID, phiên bản và dependency lock.
- Tạo/tải workflow nháp build `.app` **chưa ký** trên macOS. Không tự ghi vào repo hoặc chạy CI.
- Chẩn đoán lỗi build offline, ẩn token nhận diện được và đường dẫn cá nhân.
- Bộ kiểm thử tự động và tài liệu nghiên cứu, kiến trúc, nghiệm thu.

## Mở bản làm việc

Cài Node.js 24. Mở terminal tại thư mục chứa `package.json`:

```powershell
npm ci
npm run dev
```

Mở địa chỉ localhost được in ra. Chọn thư mục Flutter gốc có `pubspec.yaml`, bấm **Xem cấu hình build**, nhập phiên bản Flutter chính xác đang dùng, đọc hai xác nhận và tạo workflow nháp. File nháp chưa thực hiện build.

Nếu chưa có thư mục iOS, sao lưu dự án trước khi chạy `flutter create --platforms=ios .` rồi xem kỹ thay đổi. Bridge không tự chạy lệnh này.

Muốn chạy shell Windows: cài [C++ Build Tools, WebView2 và Rust MSVC theo Tauri](https://v2.tauri.app/start/prerequisites/), rồi chạy `npm run tauri -- dev`. Các bước build installer và trạng thái giới hạn có trong [README tiếng Anh](README.md).

## Phần cần làm tiếp

Chọn tài khoản và chế độ công khai/riêng tư để tạo repo `douvi-ios-bridge`; tiếp đến kết nối GitHub với quyền theo repo, kiểm thử workflow và tải artifact thật. IPA có ký cần chứng chỉ/profile hợp lệ; cài iPhone cần thiết bị thật. Upload TestFlight thành công chưa đồng nghĩa Apple duyệt ứng dụng.

Xem [báo cáo nghiên cứu](docs/research/TASK-01.vi.md), [tiến độ](docs/PROGRESS.md) và [điều kiện nghiệm thu](docs/ACCEPTANCE.md). Không yêu cầu tài khoản Douvi. Phần mềm miễn phí; CI và Apple có chính sách/phí riêng.
