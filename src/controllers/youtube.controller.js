const { AccountYoutube } = require('../models');
const browserService = require('../services/browser.service');
const googleAuthService = require('../services/google.auth.service');
const youtubeService = require('../services/youtube.service');
const facebDownloader = require('../services/faceb.downloader.service');
const { fileHelper } = require('../helpers');
const path = require('path');

class YoutubeController {
  
  async createChannels(req, res) {
    try {
      // Get accounts from database that don't have channels yet
      const accounts = await AccountYoutube.findAll({
        where: {
          is_create_channel: false
        }
      });

      if (accounts.length === 0) {
        return res.json({
          success: true,
          message: 'No accounts need channel creation',
          data: []
        });
      }

      console.log(`📺 Tìm thấy ${accounts.length} accounts cần tạo channel\n`);

      const results = [];

      // Process accounts one by one for debugging
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(`\n📦 Processing ${i + 1}/${accounts.length}: ${account.email}...`);
        
        const result = await createChannelForAccount(account);
        results.push(result);
        
        console.log(`✅ Completed: ${result.success ? 'Success' : 'Failed'}\n`);
        
        // Delay between accounts
        if (i < accounts.length - 1) {
          console.log('⏳ Waiting 3s before next account...\n');
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      res.json({
        success: true,
        message: `Completed: ${successCount} success, ${failCount} failed`,
        data: results,
        summary: {
          total: accounts.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('❌ Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async uploadAvatars(req, res) {
    try {
      // Get accounts that have channels, avatar_url, and haven't uploaded avatar yet
      const { Op } = require('sequelize');
      const accounts = await AccountYoutube.findAll({
        where: {
          is_create_channel: true,
          channel_link: { [Op.ne]: null },
          is_upload_avatar: false,
          avatar_url: { [Op.ne]: null } // Must have avatar_url
        }
      });

      if (accounts.length === 0) {
        return res.json({
          success: true,
          message: 'No accounts need avatar upload',
          data: []
        });
      }

      console.log(`🖼️  Tìm thấy ${accounts.length} accounts cần upload avatar\n`);

      const results = [];

      // Process accounts one by one
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        console.log(`\n📦 Processing ${i + 1}/${accounts.length}: ${account.email}...`);
        
        const result = await uploadAvatarForAccount(account);
        results.push(result);
        
        console.log(`✅ Completed: ${result.success ? 'Success' : 'Failed'}\n`);
        
        if (i < accounts.length - 1) {
          console.log('⏳ Waiting 3s before next account...\n');
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      res.json({
        success: true,
        message: `Completed: ${successCount} success, ${failCount} failed`,
        data: results,
        summary: {
          total: accounts.length,
          success: successCount,
          failed: failCount
        }
      });

    } catch (error) {
      console.error('❌ Controller Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

async function createChannelForAccount(account) {
  let browser = null;
  
  try {
    console.log(`\n🌐 [${account.email}] Launching browser...`);
    
    // Use HEADLESS for YouTube operations
    const headless = process.env.HEADLESS === 'true';
    browser = await browserService.launchBrowser(headless);
    const page = await browserService.createPage(browser);

    // Login
    await googleAuthService.login(page, account.email, account.password);

    // Create channel
    const channelName = account.channel_name || `Channel ${account.email.split('@')[0]}`;
    const createResult = await youtubeService.createChannel(page, channelName);

    if (!createResult.created) {
      throw new Error(createResult.message || 'Failed to create channel');
    }

    // Get channel info
    const channelInfo = await youtubeService.getChannelInfo(page);

    // Update database with actual channel name
    const actualChannelName = createResult.channelName || channelInfo.name || channelName;
    const updateData = {
      channel_name: actualChannelName,
      is_create_channel: true
    };
    
    // Only add channel_link if it's a valid URL
    if (channelInfo.link && channelInfo.link.startsWith('http')) {
      updateData.channel_link = channelInfo.link;
    }

    await AccountYoutube.update(updateData, { where: { id: account.id } });

    console.log(`💾 [${account.email}] Đã lưu thông tin channel vào database`);
    console.log(`📝 Tên channel thực tế: "${actualChannelName}"`);

    // Avatar upload is now a separate step - use POST /api/v1/youtube/upload-avatar
    console.log('ℹ️  Avatar upload is a separate step. Download avatars first, then upload.');

    await googleAuthService.logout(page);
    await browser.close();
    console.log(`✅ [${account.email}] Browser closed`);

    return {
      email: account.email,
      success: true,
      channelName: actualChannelName,
      channelLink: channelInfo.link
    };

  } catch (error) {
    console.error(`❌ [${account.email}] Error:`, error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }

    return {
      email: account.email,
      success: false,
      error: error.message
    };
  }
}

async function uploadAvatarForAccount(account) {
  let browser = null;
  
  try {
    // Extract channel ID using helper
    const channelId = fileHelper.extractChannelId(account.channel_link);
    if (!channelId) {
      throw new Error('Invalid channel link');
    }

    console.log(`\n🌐 [${account.email}] Launching browser...`);
    
    // Use HEADLESS for YouTube operations
    const headless = process.env.HEADLESS === 'true';
    browser = await browserService.launchBrowser(headless);
    const page = await browserService.createPage(browser);

    // Login
    await googleAuthService.login(page, account.email, account.password);

    const avatarsDir = path.join(__dirname, '../../avatars');
    const fs = require('fs');
    let avatarPath = null;
    let imageName = account.image_name;
    
    // Check if avatar already downloaded
    if (account.image_name && fs.existsSync(path.join(avatarsDir, account.image_name))) {
      // Use existing file
      avatarPath = path.join(avatarsDir, account.image_name);
      console.log(`📸 Using downloaded avatar: ${account.image_name}`);
    } else if (account.avatar_url) {
      // Download now
      console.log(`📥 Downloading avatar from: ${account.avatar_url}`);
      const fileName = `avatar_${account.email.split('@')[0]}_${Date.now()}`;
      avatarPath = await facebDownloader.downloadAvatar(
        account.avatar_url,
        avatarsDir,
        fileName
      );
      imageName = path.basename(avatarPath);
      
      // Save image_name to DB
      await AccountYoutube.update(
        { image_name: imageName },
        { where: { id: account.id } }
      );
      console.log(`� Saved image_name: ${imageName}`);
    } else {
      throw new Error('No avatar_url or image_name available');
    }

    // Upload avatar to YouTube Studio
    await youtubeService.uploadAvatar(page, channelId, avatarPath);

    // Mark avatar as uploaded
    await AccountYoutube.update(
      { is_upload_avatar: true },
      { where: { id: account.id } }
    );

    console.log(`💾 [${account.email}] Đã upload avatar`);

    await googleAuthService.logout(page);
    await browser.close();
    console.log(`✅ [${account.email}] Browser closed`);

    return {
      email: account.email,
      success: true,
      channelId,
      avatar: imageName
    };

  } catch (error) {
    console.error(`❌ [${account.email}] Error:`, error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }

    return {
      email: account.email,
      success: false,
      error: error.message
    };
  }
}

module.exports = new YoutubeController();
