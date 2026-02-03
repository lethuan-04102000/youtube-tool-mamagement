# Video Download Service Updates

## Changelog - Latest Update (February 2, 2026)

### Fixed Browser Profile Support

**Issue:** Video download service was not using browser profiles (userDataDir) for persistent login sessions, causing users to login again every time.

**Fix:**
- Updated `video.download.service.js` to pass email to `browserService.launchBrowser()`
- Modified `browser.service.js` parameter order: `launchBrowser(headless, email, retries)` for better usability
- Updated `youtube.login.service.js` to match new parameter order

**Result:** When downloading videos with an email account, the service now uses the saved browser profile, eliminating the need to login repeatedly.

---

### Fixed Download Button Click Logic

**Issue:** After clicking search button, the service was clicking the search button again instead of clicking the "Tải xuống" (Download) link in the results table.

**Fix:**
- Removed `btn-red` and `ksearchvideo` checks from `clickDownloadButton()` method
- Prioritized table row detection by quality (720p, 360p, etc.)
- Added debug console.log to show which row/button is being clicked

**Priority order:**
1. Find table row matching quality
2. In that row, find `<a>` link with class `download-link-fb` or href containing "download" and text "Tải xuống"
3. If no link found, look for button with text "Render" or onclick containing "convertFile"
4. Fallback: find any link with "Tải xuống" in the entire page

---

### Added Support for "Render" Button

Enhanced `video.download.service.js` to handle "Render" buttons that appear on video download sites when the direct download link is not immediately available.

**What's New:**
- Button detection now checks for both text content ("Render") and onclick handlers (`convertFile`)
- Improved handling of dynamic download workflows where videos need to be rendered before downloading

---

## Changelog - February 2, 2026

### Added Support for Vietnamese UI Buttons

Updated `video.download.service.js` to handle Vietnamese language buttons on video download sites.

### Changes

#### 1. Enhanced `clickSearchButton()` method
Added support for buttons with:
- `onclick="ksearchvideo()"` attribute
- `class="btn-red"` CSS class
- Vietnamese text: "Tải xuống" (Download)

**Priority order:**
1. Button with `onclick*="ksearchvideo"` or `class="btn-red"` (highest priority)
2. Button with text "Tải xuống" or "Download"
3. Submit button in form (fallback)

#### 2. Enhanced `clickDownloadButton()` method
Added support for Vietnamese download buttons and "Render" buttons in quality selection:
- Checks for `btn-red` class and `ksearchvideo` onclick
- Falls back to table row selection by quality
- **NEW:** Detects "Render" buttons (text content or `convertFile` onclick handler)
- Then fallback to any download link

### Example Buttons Supported

```html
<!-- Case 1: Red button with onclick -->
<button class="btn-red" type="button" onclick="ksearchvideo(!1)">Tải xuống</button>

<!-- Case 2: Render button (NEW) -->
<button type="button" onclick="convertFile(...)">Render</button>

<!-- Case 3: Vietnamese text button -->
<button class="btn-download">Tải xuống</button>

<!-- Case 4: English text button -->
<button class="btn-download">Download</button>

<!-- Case 5: Form submit -->
<form>
  <button type="submit">Tải</button>
</form>
```

### Testing

Test with various Vietnamese video download sites that use:
- fbdown.to (Vietnamese UI)
- Other sites with "Tải xuống" buttons
- Sites with red download buttons

### Code Location

File: `src/services/video.download.service.js`

Methods updated:
- `clickSearchButton()` - Line ~115
- `clickDownloadButton()` - Line ~280

### Related Issues

- Support for Vietnamese language UI
- Handle different button styles (btn-red, onclick handlers)
- Improve button detection reliability
