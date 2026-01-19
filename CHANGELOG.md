# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2024-01-16

### 🎉 Major Refactoring

#### Added
- **New folder structure** for better code organization
  - `src/config/constants.js` - Centralized constants
  - `src/helpers/` - Utility functions folder
  - `src/services/youtube/` - YouTube sub-services folder
- **Helper modules**
  - `name.generator.js` - Channel name generation with multiple strategies
  - `file.helper.js` - File operations and path utilities
- **YouTube sub-services**
  - `channel.service.js` - Dedicated channel creation logic
  - `avatar.service.js` - Dedicated avatar upload logic
  - `retry.service.js` - Retry and error handling logic
- **Documentation**
  - `CODE_STRUCTURE.md` - Comprehensive code structure documentation
  - `CHANGELOG.md` - This file

#### Changed
- **Refactored `youtube.service.js`**
  - Now acts as an orchestrator, delegating to sub-services
  - Removed 800+ lines of duplicated logic
  - Clean, maintainable interface
- **Improved `youtube.controller.js`**
  - Uses helper functions for file operations
  - Cleaner error handling
  - Better logging
- **Enhanced retry mechanism**
  - 4 attempts with different strategies
  - Preserves original channel name
  - Stores actual channel name in DB after retries

#### Fixed
- **Channel name retry logic**
  - Always keeps original name as base
  - Only adds suffix (timestamp/number/uuid)
  - Updates DB with actual name used
- **Error handling**
  - No DB update if all retry attempts fail
  - Proper error propagation
  - Graceful browser cleanup

#### Removed
- **Duplicate code** across controller and services
- **Magic strings** replaced with constants
- **Hardcoded selectors** moved to constants file

### 📝 Technical Improvements

#### Code Quality
- ✅ Separation of concerns
- ✅ DRY (Don't Repeat Yourself) principle
- ✅ Single responsibility principle
- ✅ Clean code practices
- ✅ Better error handling
- ✅ Comprehensive logging

#### Architecture
- ✅ Layered architecture (Controller → Service → Sub-Service → Helper)
- ✅ Centralized configuration
- ✅ Modular design
- ✅ Easy to test and maintain

#### Performance
- ✅ Reduced code duplication
- ✅ Optimized retry logic
- ✅ Better resource cleanup

---

## [1.5.0] - 2024-01-15

### Added
- YouTube video watching API with multiple tabs
- Watch videos anonymously or with logged-in accounts
- Configurable watch duration and tab count

### Changed
- Improved avatar upload logic
- Only use avatars from main `avatars/` folder
- Better avatar file sorting

### Fixed
- Avatar selection by index
- Channel link validation

---

## [1.4.0] - 2024-01-14

### Added
- Automatic channel creation after 2FA verification
- Skip 2FA if already verified
- Create channel only for accounts with 2FA but no channel

### Changed
- Optimized 2FA + channel creation workflow
- Better duplicate account handling

### Fixed
- Query filters for finding accounts without channels
- Duplicate account processing

---

## [1.3.0] - 2024-01-13

### Added
- Channel name retry with timestamp
- Channel name retry with random number
- Channel name retry with UUID suffix
- Update actual channel name in DB after retry

### Changed
- Improved input field detection (multiple selectors)
- Better error detection for channel creation

### Fixed
- Channel name input clearing issues
- Handle name validation errors properly

---

## [1.2.0] - 2024-01-12

### Added
- Avatar upload functionality
- Channel customization page navigation
- Profile picture upload

### Changed
- Improved browser automation service
- Better page waiting mechanisms

---

## [1.1.0] - 2024-01-11

### Added
- YouTube channel creation API
- Google Authentication service
- Browser service with Puppeteer
- Database models and migrations

### Changed
- Enhanced error handling
- Improved logging

---

## [1.0.0] - 2024-01-10

### Added
- Initial project setup
- Google Authenticator 2FA verification
- CSV import for bulk account management
- Basic CRUD operations for accounts
- Express.js server with REST API
- MySQL database integration

---

## Legend

- 🎉 Major features
- ✨ New features
- 🔧 Changes
- 🐛 Bug fixes
- 📝 Documentation
- ⚡ Performance improvements
- 🔒 Security updates
