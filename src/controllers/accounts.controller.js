const { AccountYoutube } = require('../models');
const { Op } = require('sequelize');
const { successListResponse, errorResponse } = require('../helpers/response.helper');
const csvService = require('../services/csv.service');

/**
 * Get accounts list with pagination and search
 */
exports.getAccounts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      searchBy = 'all', // 'email', 'channelName', 'all'
      status = 'all' // 'all', 'incomplete', 'complete'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where condition
    let whereCondition = {};
    
    // Search filter
    if (search) {
      if (searchBy === 'email') {
        whereCondition.email = { [Op.like]: `%${search}%` };
      } else if (searchBy === 'channelName') {
        whereCondition.channel_name = { [Op.like]: `%${search}%` };
      } else {
        // Search in both email and channel name
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { channel_name: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    // Status filter
    if (status === 'incomplete') {
      // Accounts that don't have authenticator OR don't have channel
      whereCondition[Op.or] = [
        { is_authenticator: false },
        { is_authenticator: null },
        { is_create_channel: false },
        { is_create_channel: null }
      ];
    } else if (status === 'complete') {
      // Accounts that have both authenticator AND channel
      whereCondition.is_authenticator = true;
      whereCondition.is_create_channel = true;
    }
    // 'all' status: no additional filter

    // Query database with pagination
    const { count, rows } = await AccountYoutube.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'email', 'channel_name', 'channel_link', 'is_authenticator', 'is_create_channel'],
      limit: limitNum,
      offset: offset,
      // Order by creation date ascending so older records appear first
      order: [['createdAt', 'ASC']]
    });

    // Format data to match frontend expectations
    const accounts = rows.map(account => ({
      id: account.id,
      email: account.email,
      channelName: account.channel_name || '',
      channelLink: account.channel_link || '',
      isAuthenticator: account.is_authenticator || false,
      isCreateChannel: account.is_create_channel || false
    }));

    // Use helper function for response
    return res.json(successListResponse({
      items: accounts,
      total: count,
      page: pageNum,
      limit: limitNum
    }));

  } catch (error) {
    console.error('Error getting accounts:', error);
    return res.status(500).json(errorResponse('Failed to get accounts', error));
  }
};

/**
 * Update avatar URLs from CSV file
 */
exports.updateAvatarUrls = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const csvPath = req.files.file[0].path;
    console.log('📁 CSV Path:', csvPath);
    
    // Load accounts from CSV
    const accounts = csvService.loadAccountsFromCSV(csvPath);
    
    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accounts found in CSV'
      });
    }

    console.log(`📊 Processing ${accounts.length} accounts...\n`);
    
    const results = {
      updated: 0,
      notFound: 0,
      skipped: 0,
      details: []
    };
    
    for (const account of accounts) {
      try {
        // Find account by email
        const existingAccount = await AccountYoutube.findOne({
          where: { email: account.email }
        });
        
        if (!existingAccount) {
          console.log(`⚠️  ${account.email} - NOT FOUND`);
          results.notFound++;
          results.details.push({
            email: account.email,
            status: 'not_found'
          });
          continue;
        }
        
        // Skip if no avatar_url in CSV
        if (!account.avatar_url) {
          console.log(`⏭️  ${account.email} - NO AVATAR URL`);
          results.skipped++;
          results.details.push({
            email: account.email,
            status: 'no_avatar_url'
          });
          continue;
        }
        
        // Update avatar_url
        await AccountYoutube.update(
          { avatar_url: account.avatar_url },
          { where: { email: account.email } }
        );
        
        console.log(`✅ ${account.email} - UPDATED`);
        console.log(`   avatar_url: ${account.avatar_url.substring(0, 50)}...`);
        results.updated++;
        results.details.push({
          email: account.email,
          status: 'updated',
          avatar_url: account.avatar_url
        });
        
      } catch (error) {
        console.error(`❌ ${account.email} - ERROR:`, error.message);
        results.details.push({
          email: account.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${results.updated}`);
    console.log(`   ⚠️  Not Found: ${results.notFound}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    
    // Clean up CSV file
    const fs = require('fs');
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    
    res.json({
      success: true,
      message: `Updated ${results.updated} accounts`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Export all accounts as CSV (Excel-compatible)
 */
exports.exportAccounts = async (req, res) => {
  try {
    const accounts = await AccountYoutube.findAll({
      attributes: [
        'id', 'email', 'password', 'channel_name', 'channel_link',
        'avatar_url', 'image_name', 'is_authenticator', 'is_create_channel', 'is_upload_avatar',
        'createdAt', 'updatedAt'
      ],
      order: [['createdAt', 'ASC']]
    });

    const headers = [
      'id','email','password','channel_name','channel_link',
      'avatar_url','image_name','is_authenticator','is_create_channel','is_upload_avatar',
      'createdAt','updatedAt'
    ];

    const escape = (value) => {
      if (value === null || value === undefined) return '';
      let s = String(value);
      // Convert boolean to 1/0 for Excel friendliness
      if (s === 'true' || s === 'false') return s;
      // Escape double quotes
      s = s.replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = accounts.map(a => {
      const values = [
        a.id,
        a.email,
        a.password || '',
        a.channel_name || '',
        a.channel_link || '',
        a.avatar_url || '',
        a.image_name || '',
        a.is_authenticator ? 'true' : 'false',
        a.is_create_channel ? 'true' : 'false',
        a.is_upload_avatar ? 'true' : 'false',
        a.createdAt ? a.createdAt.toISOString() : '',
        a.updatedAt ? a.updatedAt.toISOString() : ''
      ];
      return values.map(v => escape(v)).join(',');
    });

    const csvContent = `${headers.join(',')}
${rows.join('\n')}`;

    const fileName = `accounts_export_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csvContent);

  } catch (error) {
    console.error('❌ Error exporting accounts:', error);
    return res.status(500).json({ success: false, message: 'Failed to export accounts', error: error.message });
  }
};

/**
 * Track open browsers by email to prevent duplicate opens
 */
const openBrowsers = new Map();

/**
 * Open browser with profile for account
 * If profile exists, open with existing session
 * If not, open new browser to login and save profile
 */
exports.openBrowserWithProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Account ID is required'
      });
    }

    // Find account
    const account = await AccountYoutube.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: `Account with ID ${id} not found`
      });
    }

    // Check if browser already open for this email
    if (openBrowsers.has(account.email)) {
      return res.status(409).json({
        success: false,
        message: `Browser already open for ${account.email}. Please close it first.`,
        data: {
          email: account.email,
          note: 'Close the existing browser window before opening a new one.'
        }
      });
    }

    console.log(`\n🌐 Opening browser for account: ${account.email}`);

    const browserService = require('../services/browser.service');
    const sessionService = require('../services/session.service');
    const googleAuthService = require('../services/google.auth.service');
    const { isLoggedInOnYouTube } = require('../helpers/youtube.check.helper');
    
    // Check if profile exists
    const hasProfile = sessionService.hasProfile(account.email);
    
    if (hasProfile) {
      console.log(`✅ Profile found for ${account.email}, opening with existing session...`);
    } else {
      console.log(`⚠️  No profile found for ${account.email}, opening fresh browser to login...`);
    }

    // Launch browser with profile (headless=false to show UI)
    let browser = await browserService.launchBrowser(false, account.email);
    let page = await browserService.createPage(browser);

    // Track this browser
    openBrowsers.set(account.email, {
      browser,
      openedAt: new Date()
    });

    // Listen for browser disconnect to clean up
    browser.on('disconnected', () => {
      console.log(`🔴 Browser closed for ${account.email}`);
      openBrowsers.delete(account.email);
    });

    // Navigate to YouTube to check session
    await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // Check if already logged in using YouTube-specific check
    let isLoggedIn = await isLoggedInOnYouTube(page);
    let loginAttempted = false;
    let loginSuccess = false;
    let profileCleared = false;
    
    console.log(`📊 YouTube login status: ${isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}`);
    
    if (!isLoggedIn && hasProfile) {
      console.log(`⚠️  Session expired or not found for ${account.email}`);
      
      // If we have an existing profile but not logged in, likely session expired
      // Clear profile and reopen fresh browser
      console.log(`⚠️  Profile exists but session invalid - clearing...`);
      
      // Close current browser FIRST (while page is still valid)
      await browser.close();
      openBrowsers.delete(account.email);
      
      // Delete the old profile
      sessionService.deleteProfile(account.email);
      profileCleared = true;
      
      console.log(`✅ Profile cleared, reopening fresh browser for login...`);
      
      // Reopen browser without profile
      browser = await browserService.launchBrowser(false, account.email);
      page = await browserService.createPage(browser);
      
      // Update tracking
      openBrowsers.set(account.email, {
        browser: browser,
        openedAt: new Date()
      });
      
      browser.on('disconnected', () => {
        console.log(`🔴 Browser closed for ${account.email}`);
        openBrowsers.delete(account.email);
      });
      
      console.log(`✅ Fresh browser opened, proceeding to login...`);
    }
    
    // Attempt login if not logged in
    if (!isLoggedIn) {
      if (account.password) {
        console.log(`🔐 Attempting auto-login with stored credentials...`);
        loginAttempted = true;
        
        try {
          await googleAuthService.login(page, account.email, account.password);
          
          // Verify login was successful - go back to YouTube
          console.log(`🔄 Navigating to YouTube to verify login...`);
          await page.goto('https://www.youtube.com', { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(r => setTimeout(r, 3000));
          
          // Re-check login status using YouTube check
          isLoggedIn = await isLoggedInOnYouTube(page);
          
          if (isLoggedIn) {
            console.log(`✅ Auto-login successful for ${account.email}`);
            loginSuccess = true;
          } else {
            console.error(`❌ Auto-login failed: Session check failed after login`);
            console.log(`ℹ️  Please login manually in the browser`);
          }
        } catch (loginError) {
          console.error(`❌ Auto-login failed: ${loginError.message}`);
          console.log(`ℹ️  Please login manually in the browser`);
        }
      } else {
        console.log(`⚠️  No password stored for ${account.email}`);
        console.log(`ℹ️  Please login manually in the browser`);
      }
    } else {
      console.log(`✅ Session valid - Already logged in as ${account.email}`);
    }
    
    console.log(`📂 Profile path: ${sessionService.getProfilePath(account.email)}`);
    console.log(`ℹ️  Browser will stay open - close it manually when done`);

    // Don't close browser - let user interact with it
    // Browser will be closed manually by user
    
    const responseMessage = isLoggedIn 
      ? `Browser opened for ${account.email}. Session is valid.`
      : loginAttempted 
        ? `Browser opened for ${account.email}. ${loginSuccess ? 'Auto-login successful.' : 'Auto-login failed - please login manually.'}`
        : `Browser opened for ${account.email}. Please login manually.`;
    
    return res.json({
      success: true,
      message: responseMessage,
      data: {
        email: account.email,
        hasExistingProfile: hasProfile,
        profileCleared: profileCleared,
        sessionValid: isLoggedIn,
        loginAttempted: loginAttempted,
        loginSuccess: loginSuccess,
        note: isLoggedIn 
          ? 'Browser is open with valid session.' 
          : loginSuccess
            ? 'Auto-login successful. You can continue working.'
            : profileCleared
              ? 'Old profile was cleared due to signed out status. Fresh browser opened for login.'
              : account.password 
                ? 'Auto-login failed. Check browser window and login manually.'
                : 'No password stored. Please login manually in the browser.'
      }
    });

  } catch (error) {
    console.error('❌ Error opening browser:', error);
    
    // Clean up on error
    const account = await AccountYoutube.findByPk(req.params.id);
    if (account && openBrowsers.has(account.email)) {
      openBrowsers.delete(account.email);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to open browser',
      error: error.message
    });
  }
};

/**
 * Get list of open browsers
 */
exports.getOpenBrowsers = async (req, res) => {
  try {
    const browsers = Array.from(openBrowsers.entries()).map(([email, info]) => ({
      email,
      openedAt: info.openedAt,
      duration: Math.floor((Date.now() - info.openedAt.getTime()) / 1000) // seconds
    }));

    return res.json({
      success: true,
      data: {
        count: browsers.length,
        browsers
      }
    });
  } catch (error) {
    console.error('❌ Error getting open browsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get open browsers',
      error: error.message
    });
  }
};

/**
 * Close browser for specific account
 */
exports.closeBrowser = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await AccountYoutube.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: `Account with ID ${id} not found`
      });
    }

    if (!openBrowsers.has(account.email)) {
      return res.status(404).json({
        success: false,
        message: `No open browser found for ${account.email}`
      });
    }

    const { browser } = openBrowsers.get(account.email);
    
    try {
      await browser.close();
      console.log(`✅ Browser closed for ${account.email}`);
    } catch (err) {
      console.log(`⚠️  Browser already closed for ${account.email}`);
    }
    
    openBrowsers.delete(account.email);

    return res.json({
      success: true,
      message: `Browser closed for ${account.email}`
    });

  } catch (error) {
    console.error('❌ Error closing browser:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close browser',
      error: error.message
    });
  }
};

/**
 * Get openBrowsers map for other controllers to check/reuse
 * @returns {Map} openBrowsers map
 */
exports.getOpenBrowsersMap = () => {
  return openBrowsers;
};
