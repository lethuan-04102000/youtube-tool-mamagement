# YouTube Account Manager - Code Structure

## 📁 Project Structure

```
src/
├── config/
│   ├── database.js              # Database configuration
│   └── constants.js             # Application constants (selectors, errors, retry config)
├── controllers/
│   ├── verify.authenticator.controller.js  # 2FA verification controller
│   ├── youtube.controller.js               # YouTube channel & avatar controller
│   └── watch.controller.js                 # Video watching controller
├── database/
│   ├── migrate.js               # Database migration runner
│   └── migrations/              # Migration files
├── helpers/
│   ├── index.js                 # Helper exports
│   ├── name.generator.js        # Channel name generation utilities
│   └── file.helper.js           # File & path utilities
├── middlewares/
│   └── upload.js                # File upload middleware
├── models/
│   ├── index.js                 # Models exports
│   └── AccountYoutube.js        # Account model
├── routes/
│   ├── index.js                 # Main router
│   └── v1/                      # API v1 routes
├── services/
│   ├── authenticator.service.js # Google Authenticator service
│   ├── automation.service.js    # Browser automation utilities
│   ├── browser.service.js       # Puppeteer browser management
│   ├── csv.service.js           # CSV processing
│   ├── google.auth.service.js   # Google login/logout
│   ├── watch.service.js         # YouTube video watching
│   ├── youtube.service.js       # Main YouTube service (orchestrator)
│   └── youtube/                 # YouTube sub-services
│       ├── index.js             # YouTube services exports
│       ├── channel.service.js   # Channel creation logic
│       ├── avatar.service.js    # Avatar upload logic
│       └── retry.service.js     # Retry & error handling logic
└── server.js                    # Server entry point
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses, orchestrate services
- **Services**: Contain business logic
- **Helpers**: Utility functions (pure functions when possible)
- **Constants**: Centralized configuration values

### 2. **Service Layer Architecture**

#### Main Services (Orchestrators)
- `youtube.service.js` - Delegates to specialized sub-services
- `google.auth.service.js` - Handles Google login/logout
- `authenticator.service.js` - Handles 2FA verification

#### Sub-Services (Specialists)
- `channel.service.js` - All channel creation logic
- `avatar.service.js` - All avatar upload logic
- `retry.service.js` - Retry mechanisms & error handling

### 3. **Helper Functions**
- `name.generator.js` - Generate unique channel names with different strategies
- `file.helper.js` - File operations (get avatar by index, extract channel ID)

### 4. **Constants Management**
All magic strings, selectors, and configuration are centralized in `config/constants.js`:
- YouTube selectors
- Error messages
- Retry configuration
- Avatar settings
- Timeouts & delays

## 🔄 Data Flow

### Create Channel Flow
```
Controller
  ↓
youtube.service.js (orchestrator)
  ↓
channel.service.js
  ↓
retry.service.js (if errors occur)
  ↓
name.generator.js (generate alternative names)
```

### Upload Avatar Flow
```
Controller
  ↓
file.helper.js (get avatar path)
  ↓
youtube.service.js (orchestrator)
  ↓
avatar.service.js
```

## 📝 Key Features

### 1. **Retry Mechanism**
- 4 retry attempts for channel name errors
- Strategies: timestamp → random number → UUID suffix
- Always preserves original channel name as base

### 2. **Database Updates**
- Only update DB when channel creation succeeds
- Store actual channel name (after retries)
- If all 4 attempts fail: throw error, no DB update

### 3. **Avatar Management**
- Select avatar by index from `avatars/` folder
- Support multiple image formats (png, jpg, jpeg, gif, webp)
- Automatic file sorting by number in filename

### 4. **Error Handling**
- Graceful error handling at each layer
- Detailed logging for debugging
- Browser cleanup on errors

## 🚀 Usage Examples

### Create Channels
```bash
POST /api/v1/youtube/create-channels
```

### Upload Avatars
```bash
POST /api/v1/youtube/upload-avatars
```

### Verify 2FA
```bash
POST /api/v1/verify-authenticator
```

## 🔧 Configuration

### Environment Variables
```env
HEADLESS=true                    # Run browsers in headless mode
DB_HOST=localhost
DB_PORT=3306
DB_NAME=youtube_accounts
DB_USER=root
DB_PASSWORD=
```

### Constants
Edit `src/config/constants.js` to customize:
- Selectors
- Retry attempts
- Timeouts
- Error messages

## 📊 Database Schema

```sql
AccountYoutube {
  id: INTEGER (PK)
  email: STRING
  password: STRING
  channel_name: STRING
  channel_link: STRING
  index_avatar: INTEGER
  is_verify_authenticator: BOOLEAN
  is_create_channel: BOOLEAN
  is_upload_avatar: BOOLEAN
  secret_key_authenticator: STRING
  created_at: DATE
  updated_at: DATE
}
```

## 🧪 Testing

Run the server:
```bash
npm start
```

Test endpoints:
```bash
# Create channels for all accounts without channels
curl -X POST http://localhost:3000/api/v1/youtube/create-channels

# Upload avatars for all accounts without avatars
curl -X POST http://localhost:3000/api/v1/youtube/upload-avatars
```

## 🎨 Code Style

- **Async/Await**: Prefer over callbacks or raw promises
- **Error Handling**: Always use try-catch blocks
- **Logging**: Use emoji prefixes for visual clarity
- **Naming**: Descriptive variable/function names
- **Comments**: JSDoc for public functions

## 🔒 Security

- Passwords stored in database (consider encryption)
- 2FA secrets stored securely
- Browser runs in isolated contexts
- Automatic logout after operations

## 📈 Future Improvements

- [ ] Add unit tests
- [ ] Implement queue system for bulk operations
- [ ] Add webhook notifications
- [ ] Implement rate limiting
- [ ] Add monitoring/metrics
- [ ] Implement caching layer
- [ ] Add API documentation (Swagger)
