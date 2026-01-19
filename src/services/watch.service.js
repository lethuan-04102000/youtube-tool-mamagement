const browserService = require('./browser.service');

class WatchService {
  
  /**
   * Watch a YouTube video
   * @param {Object} page - Puppeteer page object
   * @param {string} videoUrl - YouTube video URL
   * @param {number} duration - Duration to watch in seconds (default: 30s)
   */
  async watchVideo(page, videoUrl, duration = 30) {
    try {
      console.log(`🎬 Navigating to video: ${videoUrl}`);
      
      await page.goto(videoUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('⏳ Waiting for video player...');
      
      // Wait for video player
      await page.waitForSelector('video', { timeout: 30000 });

      // Try to click play button if paused
      try {
        const playButton = await page.$('button.ytp-play-button[aria-label*="Play"]');
        if (playButton) {
          await playButton.click();
          console.log('▶️  Clicked play button');
        }
      } catch (e) {
        console.log('ℹ️  Video already playing or no play button found');
      }

      // Close any popups (consent, premium ads, etc)
      try {
        // Close consent dialog
        const consentButton = await page.$('button[aria-label*="Accept"], button[aria-label*="Agree"]');
        if (consentButton) {
          await consentButton.click();
          console.log('✅ Closed consent dialog');
        }

        // Close premium popup
        const closeButtons = await page.$$('button[aria-label*="No thanks"], button[aria-label*="Close"]');
        for (const btn of closeButtons) {
          try {
            await btn.click();
            await page.waitForTimeout(500);
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.log('ℹ️  No popups to close');
      }

      console.log(`👀 Watching video for ${duration} seconds...`);
      
      // Watch video for specified duration
      await page.waitForTimeout(duration * 1000);

      console.log('✅ Finished watching video');
      
      return true;
    } catch (error) {
      console.error('❌ Error watching video:', error.message);
      throw error;
    }
  }

  /**
   * Simulate user interactions while watching
   * @param {Object} page - Puppeteer page object
   */
  async simulateWatching(page) {
    try {
      // Random scroll
      const scrollDistance = Math.floor(Math.random() * 200) + 100;
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);

      await page.waitForTimeout(2000 + Math.random() * 3000);

      // Scroll back up
      await page.evaluate(() => {
        window.scrollBy(0, -100);
      });

    } catch (error) {
      // Ignore interaction errors
    }
  }
}

module.exports = new WatchService();
