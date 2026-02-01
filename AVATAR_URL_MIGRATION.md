# Avatar URL Migration - Complete Refactoring

## Overview
This document describes the complete migration from legacy avatar system (`index_avatar`, `folder_avatar`) to the new `avatar_url` based system using Facebook avatar downloads.

## Changes Made

### 1. Database Schema Changes

#### Model Updates (`src/models/AccountYoutube.js`)
- ✅ Removed `index_avatar` field
- ✅ Removed `folder_avatar` field
- ✅ Kept `avatar_url` field (STRING(500))

#### Migration Created (`src/database/migrations/20260202_remove_legacy_avatar_fields.js`)
```bash
# To apply migration:
npm run migrate

# This will:
# - Remove index_avatar column
# - Remove folder_avatar column
```

### 2. Controller Changes

#### verify.authenticator.controller.js
**Removed:**
- Avatar ZIP upload and extraction logic
- `index_avatar` auto-increment logic
- `folder_avatar` assignment
- All references to legacy avatar fields
- `AdmZip` dependency

**Updated:**
- `setupSingleAccountWithBrowser()` - removed `avatarFolderName`, `indexAvatar` parameters
- `setupSingleAccount()` - removed `avatarFolderName`, `indexAvatar` parameters
- Avatar download now uses `facebookAvatarDownloader.downloadAvatar()`
- Only processes accounts with `avatar_url` set

**Flow:**
1. Import CSV with `avatar_url` column
2. Save accounts to DB with `avatar_url`
3. Download avatars from Facebook URLs
4. Upload avatars to YouTube channels

#### youtube.controller.js
**Updated:**
- Query changed from `index_avatar: { [Op.ne]: null }` to `avatar_url: { [Op.ne]: null }`
- Avatar download uses Facebook downloader instead of local folder
- Removed all `getAvatarByIndex()` calls
- Removed `index_avatar` logging

### 3. CSV Format

**Required Columns:**
```csv
email,password,channel_name,avatar_url
user@example.com,pass123,My Channel,https://www.facebook.com/photo/?fbid=XXXXX
```

**avatar_url field:**
- Must be a valid Facebook photo URL
- Format: `https://www.facebook.com/photo/?fbid=XXXXX`
- Can be NULL (avatar upload will be skipped)

### 4. Processing Logic

#### Account Processing Flow:
```
1. Check if account needs processing:
   - is_authenticator = false  → Setup 2FA
   - is_create_channel = false → Create channel
   - is_upload_avatar = false AND avatar_url NOT NULL → Upload avatar

2. Skip if:
   - is_authenticator = true
   - is_create_channel = true  
   - is_upload_avatar = true

3. Avatar Upload Conditions:
   - Account has channel (is_create_channel = true)
   - Account has channel_link
   - Account has NOT uploaded avatar (is_upload_avatar = false)
   - Account has avatar_url set
```

### 5. Logs Cleaned Up

**Removed Logs:**
- `📊 Starting index_avatar from: X`
- `[X] email - NEW - index_avatar: X`
- `[X] email - EXISTS - index_avatar: X`
- `📊 Index Avatar: X`
- `📁 Avatar folder: X`
- `📦 Avatar ZIP: X`
- `Using avatar[X]: path`

**New Logs:**
- `📥 Avatar URL: https://...`
- `📥 Downloading avatar from: https://...`
- `💾 Saving to: /path/to/avatar.jpg`
- `✅ Đã upload avatar từ link Facebook`

### 6. Database Queries

**Old Query:**
```javascript
where: {
  is_create_channel: true,
  is_upload_avatar: false,
  index_avatar: { [Op.ne]: null }
}
```

**New Query:**
```javascript
where: {
  is_create_channel: true,
  is_upload_avatar: false,
  avatar_url: { [Op.ne]: null }
}
```

### 7. Files Modified

- ✅ `src/controllers/verify.authenticator.controller.js`
- ✅ `src/controllers/youtube.controller.js`
- ✅ `src/models/AccountYoutube.js`
- ✅ `src/database/migrations/20260202_remove_legacy_avatar_fields.js` (new)

### 8. Dependencies

**Removed:**
- `adm-zip` (no longer needed)

**Added:**
- Already have `puppeteer` for Facebook scraping
- Already have `axios` for image download

## Migration Steps

### For Existing Users:

1. **Backup Database:**
   ```bash
   mysqldump -u root -p ytb_manager > backup.sql
   ```

2. **Run Migration:**
   ```bash
   npm run migrate
   ```

3. **Update CSV Files:**
   - Add `avatar_url` column to your CSV files
   - Remove any references to avatar folders or indexes
   - Format: `email,password,channel_name,avatar_url`

4. **Restart Application:**
   ```bash
   pm2 restart all
   ```

### For New Users:

1. **Setup Database:**
   ```bash
   npm run migrate
   ```

2. **Prepare CSV:**
   ```csv
   email,password,channel_name,avatar_url
   user1@example.com,pass123,Channel 1,https://www.facebook.com/photo/?fbid=123
   user2@example.com,pass456,Channel 2,https://www.facebook.com/photo/?fbid=456
   ```

3. **Upload via API:**
   - Upload CSV file (no need for avatar ZIP anymore)
   - System will automatically download avatars from Facebook URLs

## Benefits

1. **Simplified Workflow:**
   - No need to prepare avatar folders
   - No need to match avatar indexes
   - Just provide Facebook photo URLs

2. **Better Data Management:**
   - Avatar URL is stored with account
   - Easy to re-download if needed
   - Clear source of avatar

3. **Cleaner Codebase:**
   - Removed legacy avatar indexing logic
   - Removed ZIP upload handling
   - Single source of truth (avatar_url)

4. **Easier Debugging:**
   - Clear logs showing avatar URL
   - Easy to verify which avatar is used
   - No confusion about avatar folders

## Testing

1. **Import new accounts with avatar_url:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/authenticator \
     -F "file=@accounts.csv"
   ```

2. **Verify avatar download:**
   - Check logs for Facebook download
   - Check `avatars/` folder for downloaded images

3. **Retry from database:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/authenticator
   ```
   - Should use avatar_url from database
   - Should skip accounts with is_upload_avatar = true

## Troubleshooting

### Avatar download fails:
- Check if Facebook URL is valid
- Check if Puppeteer can access Facebook
- Check network/proxy settings

### Migration fails:
- Check if columns exist before removing
- Check database connection
- Run migration manually if needed

### Accounts not processing:
- Check query conditions (avatar_url NOT NULL)
- Check is_upload_avatar flag
- Check logs for skip reasons

## Notes

- All legacy avatar logic has been removed
- Old migration files are kept for reference
- Existing accounts with index_avatar/folder_avatar will be migrated
- New accounts only use avatar_url
