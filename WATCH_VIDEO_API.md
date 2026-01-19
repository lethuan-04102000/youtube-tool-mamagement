# Watch Video API Guide

## API: Watch YouTube Video with Multiple Tabs

### Endpoint
```
POST /api/v1/watch/video
```

### Description
Mở nhiều tabs cùng lúc để xem một video YouTube. Có thể xem anonymous hoặc đăng nhập bằng accounts từ database.

### Request Body

```json
{
  "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
  "tabs": 10,
  "duration": 30,
  "useAccounts": false
}
```

#### Parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `videoUrl` | string | ✅ Yes | - | YouTube video URL |
| `tabs` | number | ❌ No | 10 | Số lượng tabs mở cùng lúc |
| `duration` | number | ❌ No | 30 | Thời gian xem video (giây) |
| `useAccounts` | boolean | ❌ No | false | Sử dụng accounts đã đăng nhập |

### Response

```json
{
  "success": true,
  "message": "Watched video in 10/10 tabs",
  "data": [
    {
      "tabIndex": 1,
      "account": "anonymous",
      "success": true,
      "duration": 30
    },
    {
      "tabIndex": 2,
      "account": "user@example.com",
      "success": true,
      "duration": 30
    }
  ],
  "summary": {
    "total": 10,
    "success": 10,
    "failed": 0,
    "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
    "duration": 30
  }
}
```

## Usage Examples

### 1. Anonymous Watching (10 tabs, không cần login)

```bash
curl -X POST http://localhost:3000/api/v1/watch/video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
    "tabs": 10,
    "duration": 30
  }'
```

### 2. Watch with Logged-in Accounts

```bash
curl -X POST http://localhost:3000/api/v1/watch/video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
    "tabs": 5,
    "duration": 60,
    "useAccounts": true
  }'
```

### 3. Quick Test (1 tab, 10 seconds)

```bash
curl -X POST http://localhost:3000/api/v1/watch/video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
    "tabs": 1,
    "duration": 10
  }'
```

### 4. Mass View (20 tabs, 2 minutes)

```bash
curl -X POST http://localhost:3000/api/v1/watch/video \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=2xNYAHhOkoY",
    "tabs": 20,
    "duration": 120
  }'
```

## Features

✅ **Multiple Tabs**: Mở nhiều tabs cùng lúc (parallel)
✅ **Anonymous or Logged-in**: Xem không cần login hoặc dùng accounts
✅ **Auto Play**: Tự động play video
✅ **Close Popups**: Tự động đóng consent dialogs, premium ads
✅ **User Simulation**: Giả lập hành vi người dùng (scroll, wait)
✅ **Error Handling**: Xử lý lỗi cho từng tab riêng biệt

## Notes

- Mỗi tab sẽ chạy trong browser riêng biệt
- Tất cả tabs chạy song song (parallel) để tối ưu thời gian
- Nếu `useAccounts = true`, API sẽ lấy accounts từ database (có `is_authenticator = true`)
- Số tabs tối đa = số accounts có trong DB (khi `useAccounts = true`)
- Video sẽ được xem trong thời gian `duration` giây
- Browser sẽ tự động đóng sau khi hoàn thành

## Environment Variables

```env
HEADLESS=false  # Set to true for headless mode (no browser UI)
```

## Tips

1. **Test nhỏ trước**: Dùng 1-2 tabs để test trước khi scale lên
2. **Headless mode**: Set `HEADLESS=true` để chạy nhanh hơn và ít tốn tài nguyên
3. **Duration hợp lý**: 30-60 giây là đủ để tính view
4. **Không spam quá**: Tránh mở quá nhiều tabs cùng lúc (có thể bị rate limit)

## Error Handling

Nếu một tab bị lỗi, các tab khác vẫn tiếp tục chạy. Response sẽ có:
- `success: true/false` cho từng tab
- `error` message nếu có lỗi
- Summary tổng hợp kết quả
