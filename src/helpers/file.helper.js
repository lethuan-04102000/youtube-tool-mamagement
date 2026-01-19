const fs = require('fs');
const path = require('path');
const { AVATAR_SETTINGS } = require('../config/constants');

class FileHelper {
  /**
   * Get all avatar files from avatars directory
   * @param {string} avatarsDir - Path to avatars directory
   * @returns {Array<string>} - Sorted array of avatar filenames
   */
  getAvatarFiles(avatarsDir) {
    if (!fs.existsSync(avatarsDir)) {
      return [];
    }

    return fs.readdirSync(avatarsDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return AVATAR_SETTINGS.ALLOWED_EXTENSIONS.includes(ext);
      })
      .sort((a, b) => {
        // Sort by number in filename (avatar_1.png, avatar_2.png, etc)
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });
  }

  /**
   * Get avatar file path by index
   * @param {string} avatarsDir - Path to avatars directory
   * @param {number} index - Avatar index (1-based)
   * @returns {Object} - { success: boolean, path?: string, filename?: string, error?: string }
   */
  getAvatarByIndex(avatarsDir, index) {
    const avatarFiles = this.getAvatarFiles(avatarsDir);

    if (avatarFiles.length === 0) {
      return { 
        success: false, 
        error: 'No avatar files found in avatars folder' 
      };
    }

    const avatarIndex = index - 1; // Convert to 0-based index

    if (avatarIndex < 0 || avatarIndex >= avatarFiles.length) {
      return { 
        success: false, 
        error: `Index ${index} exceeds available avatars (${avatarFiles.length})` 
      };
    }

    const filename = avatarFiles[avatarIndex];
    const filePath = path.join(avatarsDir, filename);

    return { 
      success: true, 
      path: filePath, 
      filename 
    };
  }

  /**
   * Extract channel ID from YouTube channel URL
   * @param {string} channelUrl - YouTube channel URL
   * @returns {string|null} - Channel ID or null
   */
  extractChannelId(channelUrl) {
    if (!channelUrl) return null;
    
    const match = channelUrl.match(/channel\/([^\/\?]+)/);
    return match ? match[1] : null;
  }
}

module.exports = new FileHelper();
