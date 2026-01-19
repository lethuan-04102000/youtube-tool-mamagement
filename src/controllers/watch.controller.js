const { AccountYoutube } = require('../models');
const browserService = require('../services/browser.service');
const googleAuthService = require('../services/google.auth.service');
const watchService = require('../services/watch.service');

class WatchController {
  
  /**
   * Watch a video with multiple tabs (anonymous or with accounts)
   */
  async watchVideo(req, res) {
    try {
      const { 
        videoUrl, 
        tabs = 1, 
        duration = 30, 
        useAccounts = false,
        humanBehavior = true,
        randomDuration = false,
        autoSubscribe = false
      } = req.body;

      if (!videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'videoUrl is required'
        });
      }

      // Validate YouTube URL
      if (!videoUrl.includes('youtube.com/watch') && !videoUrl.includes('youtu.be/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid YouTube video URL'
        });
      }

      console.log(`\n🎬 Starting video watch task...`);
      console.log(`📹 Video URL: ${videoUrl}`);
      console.log(`📊 Tabs: ${tabs}`);
      console.log(`⏱️  Duration: ${duration}s per tab`);
      console.log(`👤 Use Accounts: ${useAccounts}`);
      console.log(`🎭 Human Behavior: ${humanBehavior}`);
      console.log(`🎲 Random Duration: ${randomDuration}`);
      console.log(`📺 Auto Subscribe: ${autoSubscribe}\n`);

      let accounts = [];
      
      if (useAccounts) {
        // Get accounts from database that have channels
        accounts = await AccountYoutube.findAll({
          where: {
            is_create_channel: true
          },
          limit: tabs
        });

        if (accounts.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No accounts with channels found in database'
          });
        }

        console.log(`👥 Found ${accounts.length} accounts with channels\n`);
      }

      const results = [];
      const tabsToOpen = useAccounts ? Math.min(tabs, accounts.length) : tabs;

      console.log(`🚀 Opening ${tabsToOpen} tabs...\n`);

      // Open tabs in parallel
      const watchPromises = [];
      
      const watchOptions = {
        humanBehavior,
        randomDuration,
        autoSubscribe
      };
      
      for (let i = 0; i < tabsToOpen; i++) {
        const account = useAccounts ? accounts[i] : null;
        watchPromises.push(
          this.watchInSingleTab(videoUrl, duration, account, i + 1, watchOptions)
        );
      }

      const watchResults = await Promise.allSettled(watchPromises);

      // Process results
      watchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            tabIndex: index + 1,
            success: false,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      console.log(`\n✅ Completed: ${successCount}/${tabsToOpen} tabs watched successfully\n`);

      res.json({
        success: true,
        message: `Watched video in ${successCount}/${tabsToOpen} tabs`,
        data: results,
        summary: {
          total: tabsToOpen,
          success: successCount,
          failed: failCount,
          videoUrl,
          duration
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

  /**
   * Watch video in a single tab
   */
  async watchInSingleTab(videoUrl, duration, account = null, tabIndex = 1, options = {}) {
    let browser = null;
    
    try {
      const label = account ? account.email : `Anonymous-${tabIndex}`;
      console.log(`\n🌐 [Tab ${tabIndex}] [${label}] Launching browser...`);
      
      const headless = process.env.HEADLESS === 'true';
      browser = await browserService.launchBrowser(headless);
      const page = await browserService.createPage(browser);

      // Login if account is provided
      if (account) {
        console.log(`🔐 [Tab ${tabIndex}] Logging in as ${account.email}...`);
        await googleAuthService.login(page, account.email, account.password);
      }

      // Watch video with options (human behavior, random duration, etc.)
      await watchService.watchVideo(page, videoUrl, duration, options);

      await browser.close();
      console.log(`✅ [Tab ${tabIndex}] [${label}] Browser closed`);

      return {
        tabIndex,
        account: account ? account.email : 'anonymous',
        success: true,
        duration
      };

    } catch (error) {
      console.error(`❌ [Tab ${tabIndex}] Error:`, error.message);
      
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore
        }
      }

      return {
        tabIndex,
        account: account ? account.email : 'anonymous',
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Watch video with simple email/password login
   */
  async watchWithLogin(req, res) {
    let browser = null;
    
    try {
      const { 
        videoUrl, 
        email, 
        password, 
        duration = 30,
        humanBehavior = true,
        randomDuration = false
      } = req.body;

      if (!videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'videoUrl is required'
        });
      }

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'email and password are required'
        });
      }

      console.log(`\n🎬 Starting video watch with login...`);
      console.log(`📹 Video: ${videoUrl}`);
      console.log(`👤 Email: ${email}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🎭 Human Behavior: ${humanBehavior}\n`);

      const headless = process.env.HEADLESS === 'true';
      browser = await browserService.launchBrowser(headless);
      const page = await browserService.createPage(browser);

      // Login
      console.log(`🔐 Logging in...`);
      await googleAuthService.login(page, email, password);

      // Watch video
      const watchOptions = {
        humanBehavior,
        randomDuration
      };
      
      await watchService.watchVideo(page, videoUrl, duration, watchOptions);

      await browser.close();
      console.log(`✅ Browser closed\n`);

      res.json({
        success: true,
        message: 'Video watched successfully',
        data: {
          videoUrl,
          email,
          duration,
          humanBehavior
        }
      });

    } catch (error) {
      console.error('❌ Error:', error.message);
      
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore
        }
      }

      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new WatchController();
