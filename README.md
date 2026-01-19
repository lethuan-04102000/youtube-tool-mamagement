# YouTube Account Manager - Automation Tool

Công cụ tự động hóa quản lý tài khoản YouTube: Setup 2FA (Google Authenticator), tạo channel, upload avatar, và xem video.

## ✨ Tính năng chính

- 🔐 **Setup 2FA tự động** - Tự động cấu hình Google Authenticator cho hàng loạt tài khoản
- 📺 **Tạo YouTube Channel** - Tự động tạo channel với retry thông minh khi tên không hợp lệ
- 🖼️ **Upload Avatar** - Tự động upload avatar cho channel
- 👁️ **Xem Video** - Tự động xem video YouTube (anonymous hoặc với account)
- 📊 **Quản lý hàng loạt** - Import CSV để xử lý nhiều account cùng lúc
- 🔄 **Retry thông minh** - Tự động retry với tên khác khi gặp lỗi (4 attempts)

## 📁 Cấu trúc thư mục

```
src/
├── config/
│   ├── database.js          # Database configuration
│   └── constants.js         # Centralized constants (selectors, errors, retry config)
├── controllers/
│   ├── verify.authenticator.controller.js  # 2FA verification & channel creation
│   ├── youtube.controller.js               # YouTube channel & avatar operations
│   └── watch.controller.js                 # Video watching controller
├── models/
│   ├── index.js             # Models exports
│   └── AccountYoutube.js    # Account model
├── routes/
│   ├── index.js             # Main router
│   └── v1/                  # API v1 routes
│       ├── index.js
│       ├── verify.routes.js
│       ├── youtube.routes.js
│       └── watch.routes.js
├── services/
│   ├── authenticator.service.js     # Google Authenticator operations
│   ├── browser.service.js           # Puppeteer browser management
│   ├── google.auth.service.js       # Google login/logout
│   ├── csv.service.js               # CSV import/export
│   ├── watch.service.js             # YouTube video watching
│   ├── youtube.service.js           # Main YouTube service (orchestrator)
│   └── youtube/                     # YouTube sub-services
│       ├── channel.service.js       # Channel creation logic
│       ├── avatar.service.js        # Avatar upload logic
│       └── retry.service.js         # Retry & error handling
├── helpers/
│   ├── name.generator.js    # Channel name generation utilities
│   └── file.helper.js       # File & path utilities
├── database/
│   └── migrations/          # Database migrations
└── server.js                # Entry point
```

## 🚀 Cài đặt

```bash
# Clone project hoặc navigate đến folder
cd /Users/er_macbook_287/Documents/WorkSpace/research-and-development/tool-manager-ytb-acc

# Install dependencies
npm install

# Tạo database MySQL
mysql -u root -p
CREATE DATABASE accounts_ytb;

# Run migrations để tạo tables
npx sequelize-cli db:migrate

# Copy và cấu hình environment variables
cp .env.example .env
# Chỉnh sửa .env với thông tin database của bạn
```

## 🏃 Chạy ứng dụng

```bash
# Development mode với nodemon
npm run dev

# Production mode
npm start
```

Server sẽ chạy tại: `http://localhost:3006`

## 📚 API Endpoints

### 🔐 Authenticator & Channel Creation

#### 1. Setup 2FA + Tạo Channel (Tự động)
```http
POST /api/v1/verify-authenticator
Content-Type: multipart/form-data

# Upload CSV file với account list
file: accounts-list.csv

# Optional: Upload avatar zip
avatars: avatars.zip
```

**CSV Format:**
```csv
email,password,channel_name
account1@gmail.com,password123,My Channel 1
account2@gmail.com,password456,Tech Review Channel
```

**Response:**
```json
{
  "success": true,
  "message": "Completed: 5 success, 0 failed, 0 skipped",
  "data": [
    {
      "email": "account1@gmail.com",
      "success": true,
      "secretKey": "ABCD1234...",
      "channelCreated": true,
      "channelLink": "https://www.youtube.com/channel/UCxxx",
      "avatarUploaded": true
    }
  ],
  "summary": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "skipped": 0
  }
}
```

**Tính năng:**
- ✅ Import accounts từ CSV
- ✅ Setup Google Authenticator tự động
- ✅ Tạo YouTube channel ngay sau khi verify 2FA
- ✅ Upload avatar tự động (nếu có)
- ✅ Xử lý parallel với nhiều browser cùng lúc
- ✅ Skip accounts đã có 2FA + channel
- ✅ Retry accounts đã có 2FA nhưng chưa có channel

#### 2. Retry Failed Accounts (Không cần CSV)
```http
POST /api/v1/verify-authenticator
# Không gửi file gì, API sẽ tự động lấy accounts từ DB cần retry
```

### � YouTube Channel Operations

#### 3. Tạo Channel cho accounts chưa có channel
```http
POST /api/v1/youtube/create-channels
```

**Response:**
```json
{
  "success": true,
  "message": "Completed: 3 success, 0 failed",
  "data": [
    {
      "email": "account1@gmail.com",
      "success": true,
      "channelName": "My Channel 1",
      "channelLink": "https://www.youtube.com/channel/UCxxx",
      "avatarUploaded": true
    }
  ]
}
```

#### 4. Upload Avatar cho channels chưa có avatar
```http
POST /api/v1/youtube/upload-avatars
```

### 👁️ Watch Video

#### 5. Xem video với nhiều tab
```http
POST /api/v1/watch/watch-video
Content-Type: application/json

{
  "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
  "watchDuration": 30,
  "numberOfTabs": 5,
  "useAccounts": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xem video với 5 tabs trong 30 giây",
  "data": {
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "tabsOpened": 5,
    "duration": 30,
    "mode": "anonymous"
  }
}
```

## 🔧 Environment Variables

```env
# Server
PORT=3006
NODE_ENV=development

# Browser Settings
HEADLESS=true                          # Headless mode for YouTube operations (create channel, upload avatar)
HEADLESS_AUTHENTICATOR=false           # Headless mode for 2FA setup (set false to see QR code if needed)
CONCURRENT_TABS=5                      # Number of concurrent browsers for parallel processing

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASS=r00t
DB_NAME=accounts_ytb
DB_DIALECT=mysql
DB_PORT=3306
```

**Chi tiết cấu hình:** Xem [HEADLESS_CONFIG.md](HEADLESS_CONFIG.md)

## 🎯 Quy trình xử lý

### 1. Import & Setup 2FA + Channel
```
Upload CSV → Import vào DB → Setup 2FA parallel → Tạo Channel → Upload Avatar → Save to DB
```

### 2. Retry Logic (Channel Creation)
- **Attempt 1:** Tên gốc
- **Attempt 2:** Tên gốc + timestamp (6 digits)
- **Attempt 3:** Tên gốc + random number (4 digits)
- **Attempt 4:** Tên gốc + UUID suffix (12 chars)
- **Nếu fail hết:** Throw error, không update DB

### 3. Avatar Selection
- Avatar được chọn theo `index_avatar` từ folder `avatars/`
- Support: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- Sort theo số trong filename: `avatar_1.png`, `avatar_2.png`, ...

## � Database Schema

```sql
CREATE TABLE account_youtubes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  channel_link VARCHAR(512),
  code_authenticators TEXT,              -- Secret key for Google Authenticator
  is_authenticator BOOLEAN DEFAULT FALSE,
  is_create_channel BOOLEAN DEFAULT FALSE,
  is_upload_avatar BOOLEAN DEFAULT FALSE,
  folder_avatar VARCHAR(255),            -- Avatar folder name from zip
  index_avatar INT,                      -- Avatar index (1-based)
  last_login_at DATETIME,
  notes TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
```

## ⏰ Cronjob Setup (Optional)

Bạn có thể setup cronjob để tự động retry failed accounts:

```bash
# Edit crontab
crontab -e

# Chạy mỗi 6 giờ để retry accounts chưa setup xong
0 */6 * * * curl -X POST http://localhost:3006/api/v1/verify-authenticator

# Chạy hàng ngày lúc 2AM để tạo channel cho accounts mới
0 2 * * * curl -X POST http://localhost:3006/api/v1/youtube/create-channels

# Upload avatars cho channels mới mỗi ngày lúc 3AM
0 3 * * * curl -X POST http://localhost:3006/api/v1/youtube/upload-avatars
```

## 📦 Tech Stack

## 📦 Tech Stack

### Backend Framework
- **Node.js** (v18+) - JavaScript runtime
- **Express.js** (v4.18+) - Web framework
- **Sequelize** (v6.35+) - ORM for MySQL

### Database
- **MySQL** (v8.0+) - Relational database
- **Sequelize CLI** - Database migrations

### Browser Automation
- **Puppeteer** (v21+) - Headless Chrome automation
- **Puppeteer Extra** - Plugins for Puppeteer
  - `puppeteer-extra-plugin-stealth` - Bypass bot detection
  - `puppeteer-extra-plugin-adblocker` - Block ads

### Authentication & Security
- **Speakeasy** (v2.0+) - TOTP/HOTP generator for 2FA
- **QRCode** (v1.5+) - QR code generation

### File Processing
- **Multer** (v1.4+) - File upload middleware
- **CSV Parser** (v3.0+) - CSV file parsing
- **ADM-ZIP** (v0.5+) - ZIP file extraction

### Utilities
- **dotenv** (v16.3+) - Environment variables
- **Morgan** (v1.10+) - HTTP request logger
- **CORS** (v2.8+) - Cross-Origin Resource Sharing
- **Nodemon** (dev) - Auto-restart server

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Postman/CURL)                │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Express.js Router                     │
│  ┌────────────┬──────────────┬───────────────────────┐  │
│  │ Verify API │ YouTube API  │     Watch API         │  │
│  └────────────┴──────────────┴───────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Controllers                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  - verify.authenticator.controller.js            │   │
│  │  - youtube.controller.js                         │   │
│  │  - watch.controller.js                           │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                        Services                          │
│  ┌────────────────────────────────────────────────┐     │
│  │  Main Services:                                │     │
│  │  - google.auth.service.js (Login/Logout)       │     │
│  │  - authenticator.service.js (2FA)              │     │
│  │  - youtube.service.js (Orchestrator)           │     │
│  │  - watch.service.js (Watch videos)             │     │
│  │  - browser.service.js (Puppeteer)              │     │
│  │  - csv.service.js (Import/Export)              │     │
│  │                                                 │     │
│  │  YouTube Sub-Services:                         │     │
│  │  - youtube/channel.service.js                  │     │
│  │  - youtube/avatar.service.js                   │     │
│  │  - youtube/retry.service.js                    │     │
│  └────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Helpers & Utils                       │
│  ┌────────────────────────────────────────────────┐     │
│  │  - helpers/name.generator.js                   │     │
│  │  - helpers/file.helper.js                      │     │
│  │  - config/constants.js                         │     │
│  └────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Database (MySQL)                        │
│  ┌────────────────────────────────────────────────┐     │
│  │  Models: AccountYoutube                        │     │
│  │  ORM: Sequelize                                │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Code Quality

### Design Patterns
- ✅ **MVC Architecture** - Separation of concerns
- ✅ **Service Layer Pattern** - Business logic isolation
- ✅ **Repository Pattern** - Data access abstraction
- ✅ **Dependency Injection** - Loosely coupled components

### Best Practices
- ✅ **Clean Code** - Readable and maintainable
- ✅ **DRY Principle** - Don't Repeat Yourself
- ✅ **SOLID Principles** - Single Responsibility
- ✅ **Error Handling** - Graceful error management
- ✅ **Logging** - Comprehensive logging with emojis
- ✅ **Documentation** - JSDoc comments

## 🔍 Key Features Details

### 1. Intelligent Retry Mechanism
- 4 attempts with different naming strategies
- Preserves original channel name as base
- Automatic fallback strategies
- No database update on complete failure

### 2. Parallel Processing
- Configurable concurrent browsers
- Batch processing with delays
- Individual browser instances per account
- Automatic cleanup on errors

### 3. Avatar Management
- Index-based avatar selection
- Support multiple image formats
- Automatic file sorting
- Folder-based organization

### 4. Duplicate Prevention
- Email-based deduplication
- Skip already processed accounts
- Intelligent retry logic
- Status-based filtering

## 📖 Documentation

- **[CODE_STRUCTURE.md](CODE_STRUCTURE.md)** - Detailed code structure and design
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[HEADLESS_CONFIG.md](HEADLESS_CONFIG.md)** - Browser headless configuration
- **[WATCH_VIDEO_API.md](WATCH_VIDEO_API.md)** - Watch video API documentation
- **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** - Refactoring notes

## 🐛 Troubleshooting

### Common Issues

**1. Database connection error**
```bash
# Make sure MySQL is running
mysql.server start  # macOS
sudo service mysql start  # Linux

# Verify credentials in .env file
```

**2. Browser automation fails**
```bash
# Make sure Chrome/Chromium is installed
# Puppeteer will auto-download Chromium on first install
npm install puppeteer
```

**3. 2FA setup không thấy QR code**
```bash
# Set HEADLESS_AUTHENTICATOR=false trong .env
HEADLESS_AUTHENTICATOR=false
```

**4. Avatar không upload được**
```bash
# Check avatar files trong folder avatars/
# Format: avatar_1.png, avatar_2.png, ...
# Support: .png, .jpg, .jpeg, .gif, .webp
```

## 🚀 Performance Tips

1. **Adjust concurrent tabs:** Tăng/giảm `CONCURRENT_TABS` tùy theo cấu hình máy
2. **Use headless mode:** Set `HEADLESS=true` để tăng tốc độ
3. **Batch processing:** API tự động chia batch để tránh overload
4. **Database indexing:** Đã index sẵn trên `email`, `is_authenticator`, `is_create_channel`

## 📝 License

MIT License - Free to use and modify

## 👨‍💻 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📧 Support

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ trực tiếp.

---

**Made with ❤️ by [Your Name]**
