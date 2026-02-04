# Batch Upload Feature

## Tổng quan
Feature batch upload cho phép upload tối đa 4 videos cùng lúc lên YouTube từ một account. Mỗi video có thể có cấu hình riêng về title, description, visibility và schedule date.

## Tính năng chính

### 1. Multi-Video Upload (Tối đa 4 videos)
- Giao diện cho phép thêm tối đa 4 video inputs
- Mỗi video có form riêng với đầy đủ thông tin
- Nút **+ Thêm video** để duplicate form
- Nút **🗑️** để xóa video input (không thể xóa nếu chỉ có 1 video)

### 2. Cấu hình mỗi video
Mỗi video có thể cấu hình:
- **Link Video** (*bắt buộc): URL từ Facebook, TikTok, Instagram, Google Drive, etc.
- **Tiêu đề** (tùy chọn): Tự động lấy từ video nguồn nếu để trống
- **Mô tả** (tùy chọn): Mô tả cho video
- **Hiển thị**: Public / Unlisted / Private
- **Lên lịch** (tùy chọn): Thời gian đăng video (tối thiểu 2 giờ sau hiện tại)

### 3. Tab Upload Mode
- **🔗 Từ URL**: Upload từ link video (đang hoạt động)
- **📁 Từ File**: Upload từ file local (sẽ bổ sung sau)

### 4. Kết quả Upload
- Hiển thị kết quả chi tiết cho từng video
- Badge tổng kết: X/Y thành công (màu sắc theo trạng thái)
- Mỗi video hiển thị:
  - Icon trạng thái (✓ thành công / ✗ thất bại)
  - Số thứ tự video
  - Link video gốc
  - Message chi tiết
  - Link video YouTube (nếu thành công)
  - Thông báo lỗi (nếu thất bại)

## API Endpoint

### POST `/api/v1/upload/batch-upload`

**Request Body:**
```json
{
  "id": 123,
  "videos": [
    {
      "sourceUrl": "https://www.facebook.com/reel/...",
      "title": "Video 1",
      "description": "Mô tả video 1",
      "visibility": "public",
      "scheduleDate": "2026-02-05T15:00:00"
    },
    {
      "sourceUrl": "https://www.tiktok.com/@user/video/...",
      "title": "Video 2",
      "visibility": "unlisted"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch upload completed: 2/2 success",
  "data": {
    "results": [
      {
        "index": 1,
        "sourceUrl": "https://www.facebook.com/reel/...",
        "success": true,
        "message": "Upload thành công",
        "videoUrl": "https://www.youtube.com/watch?v=..."
      },
      {
        "index": 2,
        "sourceUrl": "https://www.tiktok.com/@user/video/...",
        "success": true,
        "message": "Upload thành công",
        "videoUrl": "https://www.youtube.com/watch?v=..."
      }
    ],
    "summary": {
      "total": 2,
      "success": 2,
      "failed": 0
    }
  }
}
```

## Backend Implementation

### Controller: `src/controllers/upload.controller.js`

```javascript
async batchUpload(req, res) {
  // Validate input (tối đa 4 videos)
  // Tìm account
  // Upload từng video tuần tự
  // Delay 3s giữa các video để tránh spam
  // Trả về kết quả chi tiết cho từng video
}
```

### Route: `src/routes/v1/upload.routes.js`

```javascript
router.post('/batch-upload', uploadController.batchUpload);
```

## Frontend Implementation

### Types: `frontend/lib/api.ts`

```typescript
export interface BatchUploadVideoItem {
  sourceUrl: string;
  title?: string;
  description?: string;
  visibility?: 'public' | 'unlisted' | 'private';
  tags?: string[];
  scheduleDate?: string;
}

export interface BatchUploadRequest {
  id?: number;
  email?: string;
  videos: BatchUploadVideoItem[];
}

export interface BatchUploadResult {
  index: number;
  sourceUrl: string;
  success: boolean;
  message: string;
  videoUrl?: string;
  error?: string;
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  data?: {
    results: BatchUploadResult[];
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  };
}
```

### API Function: `frontend/lib/api.ts`

```typescript
batchUpload: (data: BatchUploadRequest): Promise<BatchUploadResponse> => {
  return request<BatchUploadResponse>(API_ENDPOINTS.UPLOAD.BATCH_UPLOAD, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### UI Component: `frontend/app/upload-video/page.tsx`

**State Management:**
```typescript
const [videos, setVideos] = useState<VideoInput[]>([
  { id: '1', sourceUrl: '', visibility: 'public' }
]);
const [results, setResults] = useState<BatchUploadResult[] | null>(null);
```

**Key Functions:**
- `addVideoInput()`: Thêm video input mới (max 4)
- `removeVideoInput(id)`: Xóa video input (min 1)
- `updateVideoInput(id, field, value)`: Cập nhật field của video
- `handleSubmit()`: Gọi batch upload API

## Flow hoạt động

1. User chọn kênh YouTube
2. User nhập thông tin cho video đầu tiên
3. User click **+ Thêm video** để thêm video thứ 2, 3, 4
4. User nhập thông tin cho từng video
5. User click **Upload X Videos**
6. Frontend gọi API `POST /api/v1/upload/batch-upload`
7. Backend:
   - Validate input (max 4 videos)
   - Tìm account trong database
   - Upload từng video tuần tự:
     - Download video từ URL
     - Upload lên YouTube
     - Lưu vào database
     - Delay 3s trước video tiếp theo
8. Backend trả về kết quả chi tiết
9. Frontend hiển thị kết quả cho từng video
10. Nếu thành công, reset form về 1 video input trống

## Giới hạn & Lưu ý

- **Tối đa 4 videos** mỗi lần batch upload
- **Delay 3 giây** giữa các video để tránh spam YouTube
- **Upload tuần tự** (không parallel) để đảm bảo ổn định
- **Validation**: Tất cả video phải có sourceUrl
- **Schedule date**: Tối thiểu 2 giờ sau hiện tại
- **Error handling**: Nếu 1 video fail, các video khác vẫn tiếp tục upload

## Cải tiến trong tương lai

1. **Progress indicator** cho từng video đang upload
2. **Upload từ file** thay vì URL
3. **Batch upload nhiều accounts** cùng lúc
4. **Queue system** cho số lượng lớn videos
5. **Retry mechanism** cho videos thất bại
6. **Template presets** cho visibility, description
7. **Bulk edit** để apply cùng settings cho nhiều videos

## Testing

### Test Case 1: Upload 1 video
- Input: 1 video URL
- Expected: Upload thành công, hiển thị kết quả

### Test Case 2: Upload 4 videos
- Input: 4 video URLs
- Expected: Upload 4 videos tuần tự, hiển thị kết quả từng video

### Test Case 3: Upload với 1 video lỗi
- Input: 3 videos hợp lệ + 1 video URL sai
- Expected: 3 videos upload thành công, 1 video báo lỗi

### Test Case 4: Thêm/xóa video inputs
- Action: Click + Thêm video, Click 🗑️ xóa
- Expected: UI cập nhật đúng, không thể xóa nếu chỉ có 1 video

### Test Case 5: Schedule date validation
- Input: Schedule date < 2 giờ
- Expected: Browser validation error

## Files Changed

### Backend
- `src/controllers/upload.controller.js` - Added `batchUpload` method
- `src/routes/v1/upload.routes.js` - Added batch-upload route

### Frontend
- `frontend/lib/api.ts` - Added batch upload types and API function
- `frontend/lib/constants.ts` - Added `BATCH_UPLOAD` endpoint
- `frontend/app/upload-video/page.tsx` - Complete rewrite with batch upload UI

## Deployment

1. Build backend: No build needed (Node.js)
2. Build frontend: `npm run build`
3. Test upload với 1-4 videos
4. Monitor logs cho errors
5. Check YouTube videos uploaded successfully

---

**Ngày tạo**: 2026-02-04  
**Phiên bản**: 1.0  
**Tác giả**: Development Team
