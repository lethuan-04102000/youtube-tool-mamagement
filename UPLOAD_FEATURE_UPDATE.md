# 🎉 Cập nhật tính năng Upload Video

## ✨ Tính năng mới

### 1. Hỗ trợ Upload File Trực Tiếp
API `POST /api/v1/upload/download-and-upload` hiện đã hỗ trợ **2 cách upload video**:

#### 🔄 Cách 1: Download từ URL (như cũ)
```bash
curl -X POST http://localhost:3000/api/v1/upload/download-and-upload \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "sourceUrl": "https://www.facebook.com/watch?v=123456",
    "title": "Facebook Video"
  }'
```

#### 📤 Cách 2: Upload File Trực Tiếp (MỚI)
```bash
curl -X POST http://localhost:3000/api/v1/upload/download-and-upload \
  -F "video=@video.mp4" \
  -F "email=test@gmail.com" \
  -F "title=My Video"
```

### 2. Tự động xóa file sau khi Upload
- File video sẽ **tự động bị xóa** sau khi upload thành công lên YouTube
- Tiết kiệm dung lượng ổ cứng
- Áp dụng cho cả 2 cách: download từ URL và upload file

---

## 📁 Files đã thêm/sửa

### Files mới:
1. **`src/middlewares/upload.video.js`** - Middleware xử lý upload video file
2. **`UPLOAD_API_DOCUMENTATION.md`** - Documentation chi tiết về API
3. **`test-upload-api.sh`** - Script test API
4. **`uploads/videos/`** - Folder chứa video tạm thời

### Files đã sửa:
1. **`src/controllers/upload.controller.js`** - Thêm logic hỗ trợ file upload
2. **`src/routes/v1/upload.routes.js`** - Thêm middleware upload
3. **`src/services/video.download.service.js`** - Thêm phương thức `deleteDownloadedFile()`
4. **`src/services/youtube.upload.service.js`** - Tự động xóa file sau upload

---

## 🚀 Cách sử dụng

### Upload file từ Frontend (React)
```jsx
const formData = new FormData();
formData.append('video', fileInput.files[0]);
formData.append('email', 'test@gmail.com');
formData.append('title', 'My Video');

fetch('http://localhost:3000/api/v1/upload/download-and-upload', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### Upload file với cURL
```bash
curl -X POST http://localhost:3000/api/v1/upload/download-and-upload \
  -F "video=@/path/to/video.mp4" \
  -F "email=test@gmail.com" \
  -F "title=My Video" \
  -F "visibility=public"
```

### Download từ URL
```bash
curl -X POST http://localhost:3000/api/v1/upload/download-and-upload \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "sourceUrl": "https://www.facebook.com/watch?v=123456"
  }'
```

---

## 📊 Flow hoàn chỉnh

### Với File Upload:
```
1. Client upload file → Server nhận file
2. Server lưu file tạm vào uploads/videos/{email}/
3. Upload file lên YouTube
4. Lưu video URL vào database
5. Xóa file tạm khỏi ổ cứng ✨ (MỚI)
```

### Với URL Download:
```
1. Client gửi sourceUrl
2. Server download video từ URL → downloads/{email}/video/
3. Upload video lên YouTube
4. Lưu video URL vào database
5. Xóa file đã download khỏi ổ cứng ✨ (MỚI)
```

---

## 🎯 Video Formats được hỗ trợ

- MP4 (.mp4)
- MPEG (.mpeg, .mpg)
- MOV (.mov)
- AVI (.avi)
- FLV (.flv)
- WebM (.webm)
- MKV (.mkv)

**File size limit:** 5GB

---

## 📝 Parameters

### Required
| Parameter | Type | Description |
|-----------|------|-------------|
| `email` hoặc `id` | string/number | Account YouTube |
| `video` hoặc `sourceUrl` | file/string | File video HOẶC URL |

### Optional
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | auto | Tiêu đề video |
| `description` | string | auto | Mô tả |
| `visibility` | string | 'public' | public/unlisted/private |
| `tags` | string[] | [] | Tags |
| `scheduleDate` | string | null | ISO format |

---

## 🔧 Testing

### Run test script:
```bash
chmod +x test-upload-api.sh
./test-upload-api.sh
```

### Test với Postman:
1. Import collection từ `UPLOAD_API_DOCUMENTATION.md`
2. Chọn request "Upload Video File"
3. Thêm file vào form-data
4. Send request

---

## ⚠️ Important Notes

1. ✅ File sẽ **tự động bị xóa** sau khi upload thành công
2. ✅ Nếu upload thất bại, file vẫn bị xóa (để tránh rác)
3. ✅ Folder `uploads/videos/` và `downloads/` đã có trong `.gitignore`
4. ✅ Mỗi account có folder riêng: `uploads/videos/{email}/`
5. ✅ Video URL được lưu vào database để tracking

---

## 📚 Documentation

Xem chi tiết tại: **`UPLOAD_API_DOCUMENTATION.md`**

---

## 🎨 Frontend Integration

### HTML Form Example
```html
<form enctype="multipart/form-data">
  <input type="file" name="video" accept="video/*">
  <input type="email" name="email" placeholder="Email">
  <input type="text" name="title" placeholder="Title">
  <select name="visibility">
    <option value="public">Public</option>
    <option value="unlisted">Unlisted</option>
    <option value="private">Private</option>
  </select>
  <button type="submit">Upload</button>
</form>
```

### React + Axios Example
```jsx
import axios from 'axios';

const uploadVideo = async (file, email, title) => {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('email', email);
  formData.append('title', title);

  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/upload/download-and-upload',
      formData,
      {
        onUploadProgress: (e) => {
          console.log(`Progress: ${Math.round(e.loaded * 100 / e.total)}%`);
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error(error.response.data);
  }
};
```

---

## 🐛 Troubleshooting

### Lỗi "Chỉ chấp nhận file video"
➡️ Kiểm tra file extension: phải là .mp4, .mov, .avi, etc.

### Lỗi "File size too large"
➡️ File vượt quá 5GB, cần nén hoặc cắt video

### Lỗi "Không tìm thấy account"
➡️ Kiểm tra email/id có trong database chưa

### Upload bị timeout
➡️ File quá lớn hoặc mạng chậm, thử giảm quality hoặc tăng timeout

---

## 🎯 Next Steps

- [ ] Thêm progress bar cho upload
- [ ] Hỗ trợ upload nhiều video cùng lúc
- [ ] Thêm thumbnail upload
- [ ] Hỗ trợ playlist
- [ ] Thêm video editing trước khi upload

---

Tạo bởi: GitHub Copilot
Ngày: January 27, 2026
