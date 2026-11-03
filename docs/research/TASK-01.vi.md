# TASK 01 — Nghiên cứu và kiến trúc

Ngày kiểm tra: **03/11/2026**. Kết quả: **PASS cho nghiên cứu và quyết định kiến trúc**, chưa xác nhận khả năng build/cài thật. Chứng cứ GitHub dạng máy đọc nằm trong [github-snapshot.json](github-snapshot.json): commit, release, license do API nhận diện và mẫu issue. Số issue API bao gồm PR; mẫu issue không đại diện toàn bộ chất lượng dự án. Nhận định thiết kế bên dưới là suy luận của dự án, không phải bảo đảm của upstream.

## Kết luận triển khai

MVP dùng **Tauri 2 + React/TypeScript + Rust**, ưu tiên Flutter và **macOS CI theo tài khoản GitHub của người dùng**. Mã Douvi tự viết dùng MIT. Chưa tích hợp compiler local, sideload engine hoặc fastlane vào binary. Hướng khác biệt có triển vọng: giúp người mới hiểu và hoàn thành hành trình dự án → kiểm tra → build → lỗi dễ hiểu → artifact, với tiếng Việt/Anh và chi phí rõ ràng. Chưa có bằng chứng thị trường để bảo đảm dự án thành công.

## So sánh công cụ

| Công cụ / nguồn chính | Chức năng và Windows | Giấy phép / cách dùng | Điểm mạnh và giới hạn | Quyết định cho Bridge |
| --- | --- | --- | --- | --- |
| [xtool](https://github.com/xtool-org/xtool) | Build/deploy ứng dụng SwiftPM; công bố hỗ trợ Linux, Windows, macOS. | MIT; CLI là điểm nối phù hợp. | Hợp với SwiftPM; không phải công cụ thay thế mọi Xcode project hoặc toàn bộ pipeline Flutter. | Để adapter thử nghiệm sau MVP; phải đo từng cấu hình Windows/WSL và plugin trước. |
| [xcross](https://github.com/arxdeus/xcross) | Công bố build/debug/hot reload Flutter và CMP trên Windows/Linux, có release AOT. | AGPL-3.0; chưa sao chép, link hoặc đóng gói. | Hướng native đáng theo dõi; cần Swift/LLVM và SDK từ Xcode của người dùng. Plugin chỉ có CocoaPods có thể bị bỏ qua. | Chưa là engine mặc định. Tách nhánh đánh giá license và tương thích; không xem gọi CLI là tự động miễn nghĩa vụ copyleft. |
| [iPASide](https://github.com/pwnapplehat/iPASide) | GUI Windows để ký/cài IPA; engine Python với device/auth/signing. | Mã chính MIT; cần kiểm tra riêng dependency và thành phần đóng gói. | Không phải compiler. Cần Apple Devices/iTunes, trust và signing phù hợp. Các giới hạn tài khoản miễn phí vẫn tồn tại. | Học luồng hướng dẫn; không nhúng Apple ID login hoặc sideload engine vào bản đầu. |
| [fastlane](https://github.com/fastlane/fastlane), [setup](https://docs.fastlane.tools/getting-started/ios/setup/) | Ruby automation, signing/release; công cụ Ruby có thể chạy đa nền tảng, build iOS chuẩn vẫn cần Xcode/macOS. | MIT; chạy CLI với Bundler trên runner. | Hệ sinh thái trưởng thành; nhiều action không đồng nghĩa có thể build trên Windows. | Dự kiến dùng trên macOS cho signed lane/TestFlight; chưa thêm dependency khi chưa cần. |
| [Tauri](https://github.com/tauri-apps/tauri), [Windows prerequisites](https://v2.tauri.app/start/prerequisites/) | Desktop Rust + webview; Windows cần C++ Build Tools và WebView2. | MIT hoặc Apache-2.0; rà soát từng crate/plugin. | Native boundary nhỏ; cần kiểm thử IPC, CSP và installer thực tế. | Chọn cho desktop, hạn chế quyền; không bật generic shell/fs/network. |
| [ios-deploy](https://github.com/ios-control/ios-deploy) | README yêu cầu macOS + Xcode + certificate; chủ yếu thiết bị trước iOS 17. | GPL-3.0 trong LICENSE, có LICENSE2 cho phần khác; không coi toàn bộ là MIT. | Đã có lịch sử sử dụng lâu; không phải backend cài app Windows và không thích hợp làm mặc định cho iOS mới. | Loại khỏi Windows MVP. |
| [runner-images](https://github.com/actions/runner-images) | Cấu hình image GitHub/Azure; có nhãn macOS 15/26 ARM64. | MIT cho mã repo, không cấp lại quyền phân phối Xcode/SDK. | Nguồn kiểm tra phần mềm runner; nhãn OS không khóa chính xác image/Xcode mãi mãi. | Dùng runner chuẩn, ghi lại tool/image version trong evidence; không tự cung cấp image tải xuống. |
| [pymobiledevice3](https://github.com/doronz88/pymobiledevice3) | Python CLI/API hoạt động Windows/Linux/macOS, có phát hiện và quản lý thiết bị. | GPL-3.0; chưa bundle/import. | Có khả năng cho device adapter; driver, trust, tunnel và phiên bản iOS cần xác minh bằng thiết bị thật. | Nghiên cứu thêm ở TASK 09; riêng ứng dụng MIT không tự giải quyết nghĩa vụ dependency. |
| [Codemagic](https://docs.codemagic.io/getting-started/about-codemagic/), [pricing](https://docs.codemagic.io/billing/pricing/) | Hosted mobile CI dùng được từ Windows, hỗ trợ Flutter. | Dịch vụ bên thứ ba, không xem là thư viện MIT để tái phân phối. | Setup thuận tiện; gói cá nhân có 500 phút macOS M2/tháng, không áp dụng quota đó cho Team. | Đối thủ trực tiếp về sự dễ dùng; có thể là adapter BYO tùy chọn sau này. |
| [Expo EAS](https://docs.expo.dev/build/setup/), [plans](https://docs.expo.dev/billing/plans/), [CLI](https://github.com/expo/eas-cli) | Cloud build iOS cho Expo/React Native từ máy Windows; không phải Flutter builder. | Repo CLI ghi nhận MIT cùng các license khác (có BUSL); dịch vụ có điều khoản/quota riêng. | Trải nghiệm onboarding mạnh, quota free ưu tiên thấp; không được gọi là iOS build miễn phí vô hạn. | Học UX và quản lý signing; không thay engine Flutter. |
| [Flutter iOS CI/CD](https://docs.flutter.dev/deployment/ios) | Pipeline chuẩn dùng Flutter + Xcode trên macOS. | Dùng CLI upstream; không tái phân phối SDK Apple. | Tương thích hệ sinh thái plugin chuẩn; vẫn cần signing assets cho IPA cài được/phân phối. | Chọn làm đường cơ sở cho MVP; unsigned trước, signed tiếp theo. |

## Hoạt động bảo trì

Bảng được tổng hợp từ API GitHub trong lần nghiên cứu này. “Push gần nhất” có thể thuộc nhánh khác; snapshot lưu riêng SHA và thời điểm commit của nhánh mặc định. Release của monorepo Tauri có thể thuộc CLI, không đồng nghĩa version crate Rust.

| Repo | Push gần nhất (UTC) | Release ổn định ghi nhận | Ngày release (UTC) | Stars | Open issues + PR |
| --- | --- | --- | --- | ---: | ---: |
| xtool-org/xtool | 2026-11-02T21:57:22Z | 1.24.0 | 2026-10-26T00:18:19Z | 14540 | 117 |
| arxdeus/xcross | 2026-11-03T05:27:33Z | v2.0.9 | 2026-10-28T17:44:18Z | 149 | 8 |
| pwnapplehat/iPASide | 2026-10-29T05:39:19Z | v1.2.14 | 2026-10-29T05:39:29Z | 165 | 3 |
| fastlane/fastlane | 2026-11-02T20:27:16Z | 2.241.2 | 2026-10-26T15:31:16Z | 42342 | 669 |
| tauri-apps/tauri | 2026-11-03T03:56:22Z | tauri-cli-v2.12.4 | 2026-10-21T11:56:45Z | 112451 | 1506 |
| ios-control/ios-deploy | 2024-06-24T15:30:35Z | 1.12.2 | 2023-04-20T17:27:49Z | 3638 | 45 |
| actions/runner-images | 2026-11-02T20:17:57Z | macos-26-arm64/20261026.0455 | 2026-10-28T12:03:32Z | 13563 | 196 |
| doronz88/pymobiledevice3 | 2026-11-02T22:53:56Z | v11.49.4 | 2026-11-02T22:53:57Z | 2960 | 33 |

Đã xem mẫu lỗi đang mở, không coi các báo cáo chưa xử lý là kết luận mọi máy đều lỗi:

- xtool: [#414](https://github.com/xtool-org/xtool/issues/414), [#407](https://github.com/xtool-org/xtool/issues/407) mô tả trục trặc xác thực/2FA. Do đó không đưa Apple ID handshake vào MVP.
- xcross: [#149](https://github.com/arxdeus/xcross/issues/149) nêu asset/entitlements; [#147](https://github.com/arxdeus/xcross/issues/147) yêu cầu hỗ trợ iOS cũ. Cần ma trận plugin, tài nguyên, entitlements và iOS trước khi quảng bá local build.
- iPASide: [#12](https://github.com/pwnapplehat/iPASide/issues/12), [#14](https://github.com/pwnapplehat/iPASide/issues/14) là ví dụ rủi ro auth thay đổi phía Apple.
- fastlane: [#30502](https://github.com/fastlane/fastlane/issues/30502) nhắc kiểm tra exit status; Bridge phải kiểm tra kết quả command và artifact thực.
- Tauri: [#16442](https://github.com/tauri-apps/tauri/issues/16442) nêu lỗi CSP trên WebKit; smoke test web không thay được test native từng hệ điều hành.
- ios-deploy: [#608](https://github.com/ios-control/ios-deploy/issues/608) báo vấn đề iOS mới; README đã giới hạn nền tảng.
- pymobiledevice3: [#2052](https://github.com/doronz88/pymobiledevice3/issues/2052) là ví dụ cần thử reconnect USB/Wi-Fi.
- runner-images: theo dõi [announcements và image support](https://github.com/actions/runner-images#software-and-image-support) vì image và phần mềm cài sẵn thay đổi.

## Miễn phí và chi phí

Theo [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) và [bảng runner](https://docs.github.com/en/billing/reference/actions-runner-pricing) tại lúc kiểm tra:

| Trường hợp | Chính sách được quan sát | Cách hiển thị trong Bridge |
| --- | --- | --- |
| Repo public, runner chuẩn | Compute được miễn phí; tuân thủ điều khoản Actions. | Kiểm tra visibility và label; không đồng nhất runner larger với runner chuẩn. |
| GitHub Free, repo private | Included compute hiện hiển thị $12/tháng, artifact 500 MB; dùng chung các nguồn compute được mô tả trong chính sách. | Không hardcode lời hứa “2.000 phút macOS”; xác minh allowance còn lại theo tài khoản. |
| macOS chuẩn tính phí | $0.062/phút; phút lẻ mỗi job được làm tròn lên. | Ví dụ 20 phút ≈ $1.24 compute trước khi trừ allowance, chưa tính storage/thuế; đây là ước lượng, không phải báo giá tài khoản. |
| Self-hosted macOS | GitHub không thu phí compute runner theo trang chính sách; người dùng chịu máy/điện/vận hành. | Cần runner của chính họ, không coi là hạ tầng không tốn tiền. |
| Apple distribution | [Apple Developer Program](https://developer.apple.com/programs/) niêm yết $99/năm, có điều kiện địa phương/miễn phí riêng. | Tách khỏi giá phần mềm; free developer account không tương đương quyền TestFlight/App Store. |

Không chuyển source riêng tư sang public để được miễn phí. Không tự bật billing hay nâng budget. Giá/quota cần kiểm tra lại khi chạy, không dùng báo cáo này làm số dư tài khoản.

## Chính sách license và chuỗi cung ứng

Đây là quyết định phân phối thận trọng cho MVP: MIT cho code mới; giữ notices của dependency; không copy/link/bundle xcross, pymobiledevice3, ios-deploy hay toàn bộ iPASide khi chưa rà soát các thành phần. Tách process hoặc cho người dùng tự cài không phải bằng chứng tự động rằng một tích hợp miễn mọi nghĩa vụ copyleft.

Apple SDK/Xcode do người dùng hoặc runner được cấp quyền cung cấp; không đưa vào GitHub/installer. Tham khảo [Apple agreements](https://developer.apple.com/support/terms/). Action đã khóa SHA trong snapshot; cache Flutter tắt. Khóa dependency npm và audit; lock/audit Rust còn là gate trước release. Xem [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use) về quyền tối thiểu, action pinning/lockfiles và mã không tin cậy.

## Điều kiện kiểm chứng tiếp theo

1. Tạo repo đúng tài khoản/visibility được chấp thuận. Repo trên tài khoản `douvi-net` chưa được tìm thấy qua kết nối ở lần kiểm tra này; không suy ra tên đã được giữ chỗ hoặc tài khoản khác không có repo.
2. Chạy native Windows để resolve Cargo.lock, fmt/test/clippy, thử chọn/thả thư mục và build installer.
3. Dùng ứng dụng Flutter mẫu có iOS runner thật. Chạy macOS CI được phép, lấy run ID, log version/Xcode/commit, artifact thật, tải về và kiểm tra checksum/payload.
4. TASK 06 chỉ PASS sau **IPA có ký thật** và evidence cần thiết. Unsigned `.app` hoặc YAML thành công chỉ là mốc con.

TASK tiếp theo: hoàn thiện TASK 02 từ bộ mã chuẩn bị, sau đó TASK 03–05 trước khi nghiệm thu TASK 06.
