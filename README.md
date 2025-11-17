# MessZola (LiteTalk)

MessZola là ứng dụng trò chuyện thời gian thực gồm backend Node.js (Express + WebSocket) và frontend web HTML/CSS/JS với phong cách Flat + Soft UI. Dự án lưu trữ dữ liệu bằng sql.js (SQLite in-memory + file persistence) và triển khai WebRTC để gọi video nhiều người.

## Thư mục chính

```
LiteTalk/
├─ server/
│  ├─ core/            # HTTP, WS, RTC, DB, config
│  ├─ shared/          # Entity, Repository, Service, UseCase
│  ├─ features/        # auth, user, friend, room, chat, call, file
│  ├─ presentation/    # REST router + WS router
│  └─ server.js        # điểm khởi động
└─ web/
   ├─ app/             # AppShell + khởi động SPA
   ├─ core/            # HttpClient, WsClient, RtcClient, Store
   ├─ features/        # auth, chat, friends, profile, call UI
   ├─ assets/          # CSS theme
   └─ index.html
```

## Cách chạy

```bash
npm install
npm run dev   # sử dụng nodemon
# hoặc
npm start
```

Server mặc định lắng nghe tại http://localhost:4000 và phục vụ frontend từ thư mục `web/`.

## Chức năng chính

- **Đăng nhập/đăng ký** bằng số điện thoại, giữ phiên bằng JWT.
- **Quản lý bạn bè**: tìm kiếm, gửi lời mời, xem trạng thái online/offline.
- **Chat 1-1 và nhóm** với lịch sử tin nhắn, call history và typing indicator.
- **Quản trị nhóm**: tạo nhóm, đổi tên, mời thêm bạn, rời hoặc giải tán nhóm.
- **Gửi file**: kéo/thả hoặc chọn file để gửi ngay trong khung chat.
- **Gọi video** nhiều người với bật/tắt mic, camera, chia sẻ màn hình.
- **Tối ưu UX**: cache dữ liệu cục bộ, tự reconnect WS, giữ nguyên tab khi F5.

## Luồng dữ liệu chính

1. **Auth**: người dùng đăng ký/đăng nhập bằng số điện thoại + mật khẩu. Backend sử dụng bcrypt + JWT. Token được lưu trên client và gắn vào REST + WS.
2. **Friends**: sau khi xác thực, client gọi `/friends` để lấy danh bạ, `/friends/requests` để nhận lời mời. Tìm kiếm người dùng qua `/users/search` và gửi lời mời qua `/friends/requests`.
3. **Chat**: danh sách phòng (`/rooms`) hiển thị ở sidebar. Khi chọn phòng, client tải lịch sử `/rooms/:id/messages` và giữ kết nối WS. Mỗi thông điệp mới → WS gửi sự kiện `send`, backend lưu vào DB và broadcast qua EventBus. Danh sách tin nhắn trên UI có virtualization (chỉ render tối đa 200 bản ghi gần nhất).
4. **Call**: nút “Gọi video” trong phòng mở CallModal. Client lấy media stream, gửi `rtc-join` qua WS. Server dùng `RtcSignaler` broadcast peers, WS tiếp tục relay offer/answer/ICE. Tất cả camera được hiển thị trong lưới video; trạng thái mic/cam/share screen điều khiển qua `RtcClient`.
5. **File**: upload thông qua `/files/upload` (REST + multer). Sau khi file lưu thành công, server tạo message `type=file`, lưu metadata vào bảng `files` và dùng EventBus đẩy thông điệp đến toàn bộ thành viên phòng. UI hiển thị chip file và cho phép tải xuống.
