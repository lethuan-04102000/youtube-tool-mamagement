# Browser Profile & Session Management

## Overview

Hệ thống quản lý browser profiles để lưu session (cookies, localStorage, cache) cho mỗi email. Khi login một lần, lần sau mở browser với email đó sẽ tự động đăng nhập (không cần nhập password lại).

## How It Works

### 1. **UserDataDir per Email**
- Mỗi email có một thư mục profile riêng: `browser-profiles/<email_sanitized>/`
- Puppeteer lưu toàn bộ trạng thái browser vào thư mục này
- Bao gồm: cookies, localStorage, cache, extensions, preferences

### 2. **Auto-save Session**
- Khi login lần đầu, profile được tạo tự động
- Session được lưu ngay khi đóng browser
- Lần sau mở browser với cùng email → tự động restore session

### 3. **Profile Management**
- Check profile exists: `sessionService.hasProfile(email)`
- Delete profile: `sessionService.deleteProfile(email)`
- List all profiles: `sessionService.listProfiles()`
- Get profile size: `sessionService.getProfileSize(email)`

## Usage

### Login với Profile (lưu session)

```javascript
const youtubeLoginService = require('./services/youtube.login.service');

// Login lần đầu - tạo profile và lưu session
await youtubeLoginService.login('user@example.com', 'password', {
  useProfile: true,  // default: true
  keepBrowserOpen: false
});

// Lần sau - không cần password, tự động login
await youtubeLoginService.login('user@example.com', null, {
  useProfile: true
});
```

### Upload Video với Session đã lưu

```javascript
const browserService = require('./services/browser.service');

// Mở browser với profile của email
const browser = await browserService.launchBrowser(false, 3, 'user@example.com');
const page = await browserService.createPage(browser);

// Navigate to YouTube Studio - đã tự động login
await page.goto('https://studio.youtube.com');

// Upload video...
```

### Profile Management

```javascript
const sessionService = require('./services/session.service');

// Check if profile exists
if (sessionService.hasProfile('user@example.com')) {
  console.log('Profile exists - will reuse session');
}

// Delete profile (force re-login)
sessionService.deleteProfile('user@example.com');

// List all profiles
const profiles = sessionService.listProfiles();
console.log('Saved profiles:', profiles);

// Get profile size
const size = sessionService.getProfileSize('user@example.com');
console.log(`Profile size: ${size} MB`);
```

## Directory Structure

```
browser-profiles/
├── user1_example_com/
│   ├── Default/
│   │   ├── Cookies
│   │   ├── Local Storage/
│   │   ├── Cache/
│   │   └── ...
│   └── ...
├── user2_gmail_com/
│   └── ...
└── ...
```

## Benefits

✅ **No Re-login**: Khi upload video không cần login lại  
✅ **Full Session**: Lưu toàn bộ state (cookies, localStorage, cache)  
✅ **Stable**: Robust hơn việc chỉ lưu cookies  
✅ **Per-account**: Mỗi email có profile riêng, không xung đột  
✅ **Auto-cleanup**: Có thể xóa profile khi cần  

## Notes

- **Disk Space**: Mỗi profile ~50-200MB, cần monitor disk usage
- **Security**: Profile chứa session data, cần protect folder `browser-profiles/`
- **Windows**: Paths work cross-platform (Linux/Mac/Windows)
- **Cleanup**: Nên định kỳ xóa profiles cũ không dùng

## API Reference

### SessionService

#### `getProfilePath(email)`
Get profile directory path for email
- Returns: `string` - Path to profile directory

#### `hasProfile(email)`
Check if profile exists
- Returns: `boolean`

#### `getLaunchOptions(email, baseOptions)`
Get launch options with profile
- Returns: `object` - Puppeteer launch options

#### `deleteProfile(email)`
Delete profile for email

#### `listProfiles()`
List all saved profiles
- Returns: `Array<string>`

#### `getProfileSize(email)`
Get profile size in MB
- Returns: `number`

### BrowserService

#### `launchBrowser(headless, retries, email)`
Launch browser with optional profile
- `email`: Email to load profile for (null = no profile)
- Returns: `Promise<Browser>`

## Examples

### Example 1: Setup workflow with profile

```javascript
// Step 1: Login and save session (once)
await youtubeLoginService.login('user@example.com', 'password', {
  useProfile: true
});

// Step 2: Upload video (many times, no re-login)
const browser = await browserService.launchBrowser(false, 3, 'user@example.com');
const page = await browserService.createPage(browser);
await youtubeUploadService.uploadVideo(page, videoPath, metadata);
await browser.close();
```

### Example 2: Batch processing with profiles

```javascript
const accounts = await AccountYoutube.findAll();

for (const account of accounts) {
  // Check if session exists
  if (!sessionService.hasProfile(account.email)) {
    console.log(`No profile for ${account.email}, logging in...`);
    await youtubeLoginService.login(account.email, account.password, {
      useProfile: true
    });
  }
  
  // Use saved session
  const browser = await browserService.launchBrowser(false, 3, account.email);
  const page = await browserService.createPage(browser);
  
  // Do something (upload, comment, like...)
  await doSomething(page);
  
  await browser.close();
}
```

### Example 3: Profile cleanup

```javascript
// List all profiles with sizes
const profiles = sessionService.listProfiles();
for (const profile of profiles) {
  const size = sessionService.getProfileSize(profile);
  console.log(`${profile}: ${size} MB`);
  
  // Delete if too large
  if (size > 500) {
    sessionService.deleteProfile(profile);
    console.log(`Deleted large profile: ${profile}`);
  }
}
```

## Troubleshooting

### Profile corrupted
```javascript
// Delete and re-create
sessionService.deleteProfile('user@example.com');
await youtubeLoginService.login('user@example.com', 'password', {
  useProfile: true
});
```

### Disk space full
```javascript
// Clean up all profiles
const profiles = sessionService.listProfiles();
profiles.forEach(p => sessionService.deleteProfile(p));
```

### Session expired
Browser profile tự động refresh cookies khi vào YouTube. Nếu session thật sự expire (Google security check), cần login lại:
```javascript
// Force re-login
sessionService.deleteProfile('user@example.com');
await youtubeLoginService.login('user@example.com', 'password', {
  useProfile: true
});
```
