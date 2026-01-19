# Cấu hình Headless Browser

Hệ thống hỗ trợ 2 biến môi trường để điều khiển chế độ headless của browser:

## 1. `HEADLESS_AUTHENTICATOR`

**Dùng cho:** Setup 2FA/Authenticator

**Vị trí sử dụng:**
- `POST /api/v1/verify/setup-2fa` - Auto setup 2FA cho accounts

**Khuyến nghị:** 
- Đặt `HEADLESS_AUTHENTICATOR=false` để thấy QR code và xác nhận 2FA
- QR code cần được scan bằng app Authenticator (Google Authenticator, Authy, etc.)

```bash
# .env
HEADLESS_AUTHENTICATOR=false  # Hiển thị browser để scan QR code
```

## 2. `HEADLESS`

**Dùng cho:** Các tác vụ khác (tạo channel, upload avatar)

**Vị trí sử dụng:**
- `POST /api/v1/youtube/create-channels` - Tự động tạo YouTube channels
- `POST /api/v1/youtube/upload-avatars` - Upload avatars cho channels

**Khuyến nghị:** 
- Đặt `HEADLESS=true` để chạy nhanh hơn (không hiển thị UI)
- Đặt `HEADLESS=false` nếu muốn debug hoặc theo dõi quá trình

```bash
# .env
HEADLESS=true  # Chạy background, nhanh hơn
```

## Tổng hợp cấu hình khuyến nghị

```bash
# .env
PORT=3006
NODE_ENV=development

# Browser Settings
HEADLESS=true                   # Tạo channel/upload avatar chạy nền
HEADLESS_AUTHENTICATOR=false    # Setup 2FA hiển thị browser để scan QR
CONCURRENT_TABS=10

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASS=r00t
DB_NAME=accounts_ytb
DB_DIALECT=mysql
DB_PORT=3306
```

## Lưu ý

- Khi `HEADLESS_AUTHENTICATOR=false`, browser sẽ hiển thị và tạm dừng tại trang QR code
- Bạn cần scan QR code bằng app Authenticator trước khi quá trình tiếp tục
- Sau khi setup 2FA xong, nên đổi lại `HEADLESS_AUTHENTICATOR=true` để chạy nhanh hơn cho lần sau
