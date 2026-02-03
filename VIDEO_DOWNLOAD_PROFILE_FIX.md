# Video Download & Upload Service - Browser Profile Integration

## Overview

Fixed video download and upload services to use browser profiles (userDataDir) for persistent login sessions, with smart session detection to skip login when already authenticated.

## Problem

1. When downloading/uploading videos, services were launching fresh browsers without loading profiles
2. Services always attempted login, even when session was still valid
3. Users had to login repeatedly for every operation
4. Wasted time on unnecessary authentication steps

## Root Cause

1. `video.download.service.js` and `youtube.upload.service.js` were not passing email to browser service
2. `browser.service.js` had parameters in an unintuitive order
3. **No session check before login** - always tried to login even if already authenticated
4. This caused errors when trying to find login inputs that don't exist on already-logged-in pages

## Solution

### 1. Updated `browser.service.js`

Changed parameter order to be more intuitive:

```javascript
// Before
async launchBrowser(headless = null, retries = 3, email = null)

// After
async launchBrowser(headless = null, email = null, retries = 3)
```

**Reasoning:** 
- `headless` and `email` are the most commonly used parameters
- `retries` is rarely changed, so it should be last
- Makes it easier to call: `launchBrowser(false, 'user@email.com')`

### 2. Updated `video.download.service.js`

```javascript
// Before
browser = await browserService.launchBrowser(false);

// After
browser = await browserService.launchBrowser(false, this.email);
```

Now the service passes the email from constructor to browser service.

### 3. Updated `youtube.login.service.js`

```javascript
// Before
browser = await browserService.launchBrowser(headless, 3, useProfile ? email : null);

// After
browser = await browserService.launchBrowser(headless, useProfile ? email : null, 3);
```

Updated to match new parameter order.

### 4. Updated `youtube.upload.service.js`

```javascript
// Before - No profile, always login
browser = await browserService.launchBrowser(false);
await googleAuthService.login(page, email, account.password);

// After - Use profile, check session before login
browser = await browserService.launchBrowser(false, email);
const isLoggedIn = await googleAuthService.isLoggedIn(page);

if (!isLoggedIn) {
  await googleAuthService.login(page, email, account.password);
} else {
  console.log('🎯 Sử dụng session đã lưu (bỏ qua login)');
}
```

**Key improvement:** Check if already logged in before attempting login!

### 5. Added `isLoggedIn()` to `google.auth.service.js`

```javascript
async isLoggedIn(page) {
  // Check if already authenticated by:
  // 1. URL redirects (myaccount.google.com, AccountChooser, etc.)
  // 2. Profile avatar presence
  // 3. Absence of email input (login form)
  
  // Returns true if logged in, false otherwise
}
```

This prevents unnecessary login attempts when session is valid.

## Usage

### With Profile (Persistent Login)

```javascript
const VideoDownloadService = require('./services/video.download.service');

// Pass email to use profile
const downloader = new VideoDownloadService('user@example.com');

// First time: will login and save to profile
// Next times: will reuse saved session (no login needed!)
const result = await downloader.downloadVideo('https://facebook.com/...', {
  quality: 'hd',
  outputFileName: 'my-video.mp4'
});
```

### Without Profile (Fresh Browser)

```javascript
// No email = no profile = fresh browser every time
const downloader = new VideoDownloadService();

const result = await downloader.downloadVideo('https://facebook.com/...');
```

## Benefits

✅ **No Repeated Logins:** Session is saved and reused  
✅ **Smart Session Detection:** Automatically detects valid sessions and skips login  
✅ **Faster Operations:** Skip authentication step when session is valid  
✅ **Better User Experience:** Seamless workflow without interruptions  
✅ **Error Prevention:** No more "input not found" errors on already-logged-in pages  
✅ **Consistent with Other Services:** Same pattern across all services

## Technical Details

### Browser Profile Location

```
browser-profiles/
  └── user_example_com/  (sanitized email)
      ├── Default/
      │   ├── Cookies
      │   ├── Local Storage
      │   └── ...
      └── ...
```

### Session Management

- Managed by `session.service.js`
- Profile path: `browser-profiles/{sanitized_email}/`
- Includes: cookies, localStorage, cache, etc.
- Automatically created on first use
- Reused on subsequent runs

## Files Changed

1. ✅ `src/services/browser.service.js` - Parameter order changed
2. ✅ `src/services/video.download.service.js` - Pass email to browser
3. ✅ `src/services/youtube.login.service.js` - Updated parameter order
4. ✅ `src/services/youtube.upload.service.js` - Pass email + smart session check
5. ✅ `src/services/google.auth.service.js` - Added `isLoggedIn()` method
6. ✅ `VIDEO_DOWNLOAD_UPDATES.md` - Documentation updated
7. ✅ `VIDEO_DOWNLOAD_PROFILE_FIX.md` - This document

## Testing

Test the fix with:

```javascript
const VideoDownloadService = require('./src/services/video.download.service');

(async () => {
  const email = 'test@example.com';
  const videoUrl = 'https://www.facebook.com/share/v/...';
  
  const downloader = new VideoDownloadService(email);
  
  console.log('🔄 First download - will create profile and login');
  await downloader.downloadVideo(videoUrl, { quality: 'hd' });
  
  console.log('\n🔄 Second download - should reuse session (no login!)');
  await downloader.downloadVideo(videoUrl, { quality: 'hd' });
})();
```

## Notes

- Profile cleanup can be done with `sessionService.deleteProfile(email)`
- Profile size can be checked with `sessionService.getProfileSize(email)`
- All profiles listed with `sessionService.listProfiles()`

---

**Date:** February 2, 2026  
**Status:** ✅ Fixed and Tested
