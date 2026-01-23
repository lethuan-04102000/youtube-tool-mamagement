const { AccountYoutube } = require('../models');
const browserService = require('../services/browser.service');
const browserPlaywrightService = require('../services/playwright/browser.service');
const googleAuthService = require('../services/google.auth.service');
const googleAuthPlaywrightService = require('../services/playwright/google.auth.service');
const watchService = require('../services/watch.service');
const watchPlaywrightService = require('../services/playwright/watch.service');
const antiDetectionHelper = require('../helpers/anti-detection.helper');

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
        autoSubscribe = false,
        autoComment = false,        // ⚡ NEW: Auto comment on video
        autoLike = false,           // ⚡ NEW: Auto like video
        batchSize = 4,
        proxyFile = null,           // ⚡ NEW: Path to proxy file
        proxyList = null            // ⚡ NEW: Array of proxies
      } = req.body;

      if (!videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'videoUrl is required'
        });
      }

      // Validate YouTube URL (support regular videos, shorts, and short links)
      const isValidYouTubeUrl = 
        videoUrl.includes('youtube.com/watch') || 
        videoUrl.includes('youtube.com/shorts/') || 
        videoUrl.includes('youtu.be/');
        
      if (!isValidYouTubeUrl) {
        return res.status(400).json({
          success: false,
          message: 'Invalid YouTube URL. Supported formats: youtube.com/watch, youtube.com/shorts, youtu.be'
        });
      }

      // ⚡ Validate: Comment/Like only work with logged-in accounts
      if ((autoComment || autoLike) && !useAccounts) {
        return res.status(400).json({
          success: false,
          message: 'autoComment and autoLike require useAccounts=true (must be logged in)'
        });
      }

      // ⚡ Load proxies if provided
      let proxies = [];
      if (proxyFile || proxyList) {
        proxies = antiDetectionHelper.loadProxies(proxyFile || proxyList);
        console.log(`🌐 Loaded ${proxies.length} proxies for rotation`);
      }

      console.log(`\n🎬 Starting video watch task...`);
      console.log(`📹 Video URL: ${videoUrl}`);
      console.log(`📊 Total Views: ${tabs}`);
      console.log(`🔢 Batch Size: ${batchSize} tabs at a time`);
      console.log(`⏱️  Duration: ${duration}s per tab`);
      console.log(`👤 Use Accounts: ${useAccounts}`);
      console.log(`🎭 Human Behavior: ${humanBehavior}`);
      console.log(`🎲 Random Duration: ${randomDuration}`);
      console.log(`📺 Auto Subscribe: ${autoSubscribe}`);
      console.log(`💬 Auto Comment: ${autoComment}`);
      console.log(`👍 Auto Like: ${autoLike}`);
      console.log(`🌐 Proxies: ${proxies.length > 0 ? `${proxies.length} available` : 'None'}\n`);

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

      console.log(`🚀 Opening ${tabsToOpen} tabs in batches of ${batchSize}...\n`);

      const watchOptions = {
        humanBehavior,
        randomDuration,
        autoSubscribe,
        autoComment,        // ⚡ Pass to watch service
        autoLike           // ⚡ Pass to watch service
      };
      
      // Process in batches
      const totalBatches = Math.ceil(tabsToOpen / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, tabsToOpen);
        const currentBatchSize = batchEnd - batchStart;
        
        console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches}: Opening ${currentBatchSize} tabs (${batchStart + 1}-${batchEnd})...`);
        
        const watchPromises = [];
        
        for (let i = batchStart; i < batchEnd; i++) {
          const account = useAccounts ? accounts[i] : null;
          
          // ⚡ Get random proxy for this tab (if proxies available)
          const proxy = proxies.length > 0 
            ? antiDetectionHelper.getRandomProxy(proxies) 
            : null;
          
          watchPromises.push(
            this.watchInSingleTab(videoUrl, duration, account, i + 1, watchOptions, proxy)
          );
        }

        const batchResults = await Promise.allSettled(watchPromises);
        
        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              tabIndex: batchStart + index + 1,
              success: false,
              error: result.reason?.message || 'Unknown error'
            });
          }
        });
        
        const batchSuccess = batchResults.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ Batch ${batchIndex + 1} completed: ${batchSuccess}/${currentBatchSize} successful\n`);
      }

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
  async watchInSingleTab(videoUrl, duration, account = null, tabIndex = 1, options = {}, proxy = null) {
    let browser = null;
    
    try {
      const label = account ? account.email : `Anonymous-${tabIndex}`;
      const proxyLabel = proxy ? `🌐 Proxy: ${proxy.server}` : '🌐 No proxy';
      console.log(`\n🌐 [Tab ${tabIndex}] [${label}] ${proxyLabel}`);
      console.log(`🚀 [Tab ${tabIndex}] Launching browser...`);
      
      const headless = process.env.HEADLESS === 'true';
      
      // Use Playwright Firefox for watch controller (lighter and better performance)
      browser = await browserPlaywrightService.launchBrowser(headless);
      
      // ⚡ Create page with proxy (if provided) and randomized fingerprint
      const page = await browserPlaywrightService.createPage(browser, { proxy });

      // Login if account is provided
      if (account) {
        console.log(`🔐 [Tab ${tabIndex}] Logging in as ${account.email}...`);
        await googleAuthPlaywrightService.login(page, account.email, account.password);
      }

      // Watch video with options (human behavior, random duration, etc.)
      await watchPlaywrightService.watchVideo(page, videoUrl, duration, options);

      await browser.close();
      console.log(`✅ [Tab ${tabIndex}] [${label}] Browser closed`);

      return {
        tabIndex,
        account: account ? account.email : 'anonymous',
        proxy: proxy ? proxy.server : 'none',
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
        proxy: proxy ? proxy.server : 'none',
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
