# YouTube Automation Tool - Full Stack

A comprehensive, production-ready YouTube automation platform with a modern web interface and powerful backend for managing views, comments, likes, and account operations at scale.

## 🌟 Features

### Backend (Node.js + Playwright)
- ✅ **Multi-Browser Support**: Playwright with Firefox for maximum stealth
- ✅ **Anonymous & Logged-in Viewing**: Support both account-based and anonymous views
- ✅ **Auto-Comment & Auto-Like**: Random comments from library with human-like typing
- ✅ **Auto-Subscribe**: Optional channel subscriptions during campaigns
- ✅ **2FA Support**: Full authenticator app (TOTP) integration
- ✅ **Proxy Rotation**: Per-tab proxy support for IP diversity
- ✅ **Anti-Detection**: Browser fingerprinting, random delays, human behavior simulation
- ✅ **Batch Processing**: Handle multiple accounts/sessions concurrently
- ✅ **Error Recovery**: Robust error handling and retry mechanisms

### Frontend (Next.js 14 + TypeScript + TailwindCSS)
- ✅ **Modern Dashboard**: Real-time campaign statistics and monitoring
- ✅ **Campaign Management**: Start, monitor, and manage watch campaigns
- ✅ **Account Management**: Upload, view, and manage YouTube accounts
- ✅ **Comment Library**: Create and organize comment templates
- ✅ **Campaign History**: Detailed logs and metrics for all campaigns
- ✅ **Settings Panel**: Configure automation preferences and anti-detection features
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile
- ✅ **Real-time Updates**: Live progress tracking and statistics

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Frontend Guide](#frontend-guide)
- [Anti-Detection Features](#anti-detection-features)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🚀 Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for authenticator helper)
- 2GB+ RAM
- Linux/macOS/Windows

### Backend Setup

```bash
# Clone the repository
git clone <repository-url>
cd tool-manager-ytb-acc

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install firefox

# Create accounts CSV file
cp proxies.example.txt proxies.txt
# Edit with your proxies (optional)

# Start the backend server
npm start
```

The backend will run on `http://localhost:3000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if needed

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3001`

## ⚡ Quick Start

### 1. Using the Frontend (Recommended)

1. **Start Backend**: `npm start` (from root directory)
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Open Browser**: Navigate to `http://localhost:3001`
4. **Upload Accounts**: Go to Accounts page and upload CSV
5. **Start Campaign**: Go to Watch page and configure your campaign

### 2. Using cURL/API

```bash
# Watch video with accounts (logged-in)
curl -X POST http://localhost:3000/api/youtube/watch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "watchTimeSeconds": 180,
    "useAccounts": true,
    "accountsFilePath": "./accounts.csv",
    "autoComment": true,
    "autoLike": true,
    "autoSubscribe": false
  }'

# Watch video anonymously
curl -X POST http://localhost:3000/api/youtube/watch \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "watchTimeSeconds": 120,
    "useAccounts": false,
    "anonymousCount": 10
  }'
```

## 🔧 Configuration

### Accounts CSV Format

```csv
email,password,recoveryEmail
user1@gmail.com,SecurePass123!,recovery1@gmail.com
user2@gmail.com,SecurePass456!,recovery2@gmail.com
```

### Comments Library (`comments.json`)

```json
{
  "comments": [
    { "text": "Great video!", "category": "general" },
    { "text": "Very informative!", "category": "educational" },
    { "text": "Thanks for sharing!", "category": "general" }
  ]
}
```

### Proxy Configuration (`proxies.txt`)

```
http://username:password@proxy1.example.com:8080
http://username:password@proxy2.example.com:8080
socks5://proxy3.example.com:1080
```

## 📚 API Documentation

### Watch Video

**Endpoint**: `POST /api/youtube/watch`

**Request Body**:
```json
{
  "videoUrl": "string (required)",
  "watchTimeSeconds": "number (required)",
  "useAccounts": "boolean (required)",
  "anonymousCount": "number (optional, if useAccounts=false)",
  "accountsFilePath": "string (optional, if useAccounts=true)",
  "autoComment": "boolean (optional, default: false)",
  "autoLike": "boolean (optional, default: false)",
  "autoSubscribe": "boolean (optional, default: false)"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Watch campaign completed",
  "results": {
    "successful": 15,
    "failed": 0,
    "accounts": [...],
    "anonymous": [...]
  }
}
```

### Additional Endpoints

- `GET /api/accounts` - Get all accounts
- `POST /api/accounts/upload` - Upload accounts CSV
- `DELETE /api/accounts/:email` - Delete account
- `GET /api/comments` - Get comment library
- `POST /api/comments` - Save comments
- `GET /api/campaigns/history` - Get campaign history
- `GET /api/stats` - Get dashboard statistics

For complete API documentation, see [WATCH_VIDEO_API.md](./WATCH_VIDEO_API.md)

## 🎨 Frontend Guide

### Dashboard (`/`)
- View overall statistics
- Monitor active campaigns
- Quick access to all features

### Watch Video (`/watch`)
- **Video URL**: Enter YouTube video URL
- **Watch Time**: Duration in seconds (30-3600)
- **Mode**: Accounts (logged-in) or Anonymous
- **Features**: Auto-comment, auto-like, auto-subscribe
- **Advanced**: Proxy rotation, fingerprinting

### Accounts (`/accounts`)
- **Upload**: CSV file with email, password, recoveryEmail
- **View Status**: Active, inactive, or 2FA required
- **Statistics**: Videos watched, comments posted per account
- **Export**: Download accounts as CSV

### Comments Library (`/comments`)
- **Add Comments**: Create comment templates
- **Categorize**: Organize by type (general, educational, etc.)
- **Edit/Delete**: Manage existing comments
- **Export**: Download as JSON

### Campaign History (`/history`)
- **Filter**: By status (running, completed, failed)
- **Metrics**: Views, comments, likes, watch time
- **Errors**: Detailed error logs
- **Progress**: Real-time tracking for running campaigns

### Settings (`/settings`)
- **API Configuration**: Backend URL
- **Automation**: Max concurrent browsers, default watch time
- **Anti-Detection**: Proxies, fingerprinting, headless mode
- **General**: Auto-save settings

For detailed frontend documentation, see [frontend/API_REFERENCE.md](./frontend/API_REFERENCE.md)

## 🛡️ Anti-Detection Features

### Browser Fingerprinting
- Randomized user agents
- Random viewport sizes
- Random screen resolutions
- Randomized device types
- Canvas/WebGL noise

### Human Behavior Simulation
- Random delays between actions (2-8 seconds)
- Mouse movements and scrolling
- Realistic typing speeds (40-80ms per character)
- Random pauses during video playback
- Natural navigation patterns

### Proxy Support
- Per-session proxy rotation
- HTTP/HTTPS/SOCKS5 support
- Automatic IP diversity
- Proxy health checking

### Account Management
- Session persistence with cookies
- Automatic 2FA handling
- Login state management
- Account cooldown periods

For detailed anti-detection guide, see [ANTI_DETECTION_GUIDE.md](./ANTI_DETECTION_GUIDE.md)

## 💡 Examples

### Example 1: Watch with Accounts + Comments + Likes

```javascript
const response = await fetch('http://localhost:3000/api/youtube/watch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    watchTimeSeconds: 240,
    useAccounts: true,
    accountsFilePath: './accounts.csv',
    autoComment: true,
    autoLike: true,
    autoSubscribe: false
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: Anonymous Batch Viewing

```javascript
const response = await fetch('http://localhost:3000/api/youtube/watch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID',
    watchTimeSeconds: 120,
    useAccounts: false,
    anonymousCount: 20
  })
});
```

### Example 3: Using Frontend Watch Page

1. Navigate to `http://localhost:3001/watch`
2. Enter video URL
3. Select "Use Accounts" mode
4. Set watch time to 180 seconds
5. Enable "Auto Comment" and "Auto Like"
6. Click "Start Campaign"

For more examples, see [curl-examples-advanced.sh](./curl-examples-advanced.sh)

## 🐛 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

**Frontend can't connect to backend**
```bash
# Verify backend is running
curl http://localhost:3000/api/stats

# Check .env.local
cat frontend/.env.local
```

**Playwright browsers not installed**
```bash
npx playwright install firefox
```

**2FA verification fails**
```bash
# Ensure authenticator service is running
# Check Python is installed
python3 --version
```

**Accounts show as "2FA Required"**
- Log in manually once to set up 2FA
- Run the 2FA setup endpoint
- Ensure authenticator codes are valid

### Performance Tips

1. **Limit Concurrent Browsers**: 3-5 recommended for optimal performance
2. **Use Headless Mode**: Faster but slightly less natural
3. **Enable Proxy Rotation**: Distribute load across IPs
4. **Batch Processing**: Process accounts in smaller batches
5. **Monitor Resources**: Watch CPU/RAM usage

### Error Handling

The system includes comprehensive error handling:
- Automatic retries for transient failures
- Detailed error logging
- Account status tracking
- Campaign failure recovery

## 📁 Project Structure

```
.
├── src/                          # Backend source code
│   ├── controllers/              # API route handlers
│   ├── services/                 # Business logic
│   │   └── playwright/           # Playwright automation
│   ├── helpers/                  # Utility functions
│   ├── models/                   # Data models
│   └── routes/                   # API routes
├── frontend/                     # Next.js frontend
│   ├── app/                      # App router pages
│   ├── components/               # React components
│   ├── lib/                      # API client & utilities
│   └── public/                   # Static assets
├── uploads/                      # Uploaded account files
├── config/                       # Configuration files
├── comments.json                 # Comment templates
├── proxies.txt                   # Proxy list (optional)
└── server.js                     # Main server entry
```

## 🔐 Security & Best Practices

### Account Security
- **Never commit** account credentials to version control
- Use strong, unique passwords
- Enable 2FA on all accounts
- Rotate accounts regularly

### API Security
- Add authentication/authorization (not included by default)
- Rate limit API endpoints
- Validate all inputs
- Use HTTPS in production

### Proxy Usage
- Use residential proxies for best results
- Rotate IPs frequently
- Monitor proxy health
- Respect rate limits

### YouTube Guidelines
- **Use responsibly**: Don't spam or abuse
- **Follow TOS**: Respect YouTube's terms of service
- **Rate limiting**: Don't overwhelm YouTube's servers
- **Natural patterns**: Keep automation human-like

## 📖 Additional Documentation

- [ANTI_DETECTION_GUIDE.md](./ANTI_DETECTION_GUIDE.md) - Detailed anti-detection strategies
- [PROXY_SETUP.md](./PROXY_SETUP.md) - Proxy configuration guide
- [COMMENT_LIKE_FEATURE.md](./COMMENT_LIKE_FEATURE.md) - Comment/like feature details
- [FRONTEND_SETUP.md](./FRONTEND_SETUP.md) - Frontend setup guide
- [WATCH_VIDEO_API.md](./WATCH_VIDEO_API.md) - Complete API reference
- [frontend/API_REFERENCE.md](./frontend/API_REFERENCE.md) - Frontend API docs

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📝 License

This project is for educational purposes only. Use responsibly and at your own risk.

## 🆘 Support

For issues, questions, or feature requests:
1. Check existing documentation
2. Review troubleshooting section
3. Check backend and frontend logs
4. Open an issue with detailed information

---

**Happy Automating! 🚀**
