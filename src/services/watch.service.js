const humanBehaviorService = require('./human-behavior.service');

class WatchService {
  
  /**
   * Watch a YouTube video with human-like behavior simulation
   * @param {Object} page - Puppeteer page object
   * @param {string} videoUrl - YouTube video URL
   * @param {number} duration - Duration to watch in seconds (default: 30s)
   * @param {Object} options - Options for watching
   * @param {boolean} options.humanBehavior - Enable human-like behavior (default: true)
   * @param {boolean} options.randomDuration - Use random duration (default: false)
   * @param {boolean} options.autoSubscribe - Auto subscribe to channel (default: false)
   */
  async watchVideo(page, videoUrl, duration = 30, options = {}) {
    const {
      humanBehavior = true,
      randomDuration = false,
      autoSubscribe = false
    } = options;

    try {
      console.log(`🎬 Navigating to video: ${videoUrl}`);
      
      // Add initial random delay (simulate user navigation)
      if (humanBehavior) {
        const initialDelay = humanBehaviorService.randomDelay(1000, 3000);
        await humanBehaviorService.sleep(initialDelay);
        console.log(`⏱️  Initial delay: ${initialDelay}ms`);
      }

      await page.goto(videoUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('⏳ Waiting for video player...');
      
      // Wait for video player with human behavior service
      const videoReady = await humanBehaviorService.waitForVideoReady(page, 30000);
      
      if (!videoReady) {
        console.warn('⚠️  Video player not ready, but continuing...');
      }

      // Try to click play button if paused
      try {
        const playButton = await page.$('button.ytp-play-button[aria-label*="Play"]');
        if (playButton) {
          if (humanBehavior) {
            // Move mouse to play button before clicking
            const buttonBox = await playButton.boundingBox();
            if (buttonBox) {
              await page.mouse.move(
                buttonBox.x + buttonBox.width / 2,
                buttonBox.y + buttonBox.height / 2,
                { steps: humanBehaviorService.randomDelay(5, 15) }
              );
              await humanBehaviorService.sleep(humanBehaviorService.randomDelay(500, 1000));
            }
          }
          
          await playButton.click();
          console.log('▶️  Clicked play button');
          
          if (humanBehavior) {
            await humanBehaviorService.sleep(humanBehaviorService.randomDelay(1000, 2000));
          }
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
          
          if (humanBehavior) {
            await humanBehaviorService.sleep(humanBehaviorService.randomDelay(500, 1000));
          }
        }

        // Close premium popup
        const closeButtons = await page.$$('button[aria-label*="No thanks"], button[aria-label*="Close"]');
        for (const btn of closeButtons) {
          try {
            await btn.click();
            if (humanBehavior) {
              await humanBehaviorService.sleep(500);
            }
          } catch (e) {
            // Ignore
          }
        }
      } catch (e) {
        console.log('ℹ️  No popups to close');
      }

      // Auto subscribe if enabled
      if (autoSubscribe) {
        try {
          console.log('🔍 Checking for subscribe button...');
          
          // Wait a bit for page to load
          await humanBehaviorService.sleep(2000);
          
          // Try to find subscribe button (not subscribed yet)
          const subscribeButton = await page.$('#subscribe-button-shape button[aria-label*="Subscribe"]');
          
          if (subscribeButton) {
            const buttonText = await page.evaluate(el => {
              const span = el.querySelector('.yt-core-attributed-string');
              return span ? span.textContent.trim() : '';
            }, subscribeButton);
            
            // Check if button says "Subscribe" (not "Subscribed")
            if (buttonText === 'Subscribe') {
              console.log('📺 Found Subscribe button, clicking...');
              
              if (humanBehavior) {
                // Move mouse to button
                const buttonBox = await subscribeButton.boundingBox();
                if (buttonBox) {
                  await page.mouse.move(
                    buttonBox.x + buttonBox.width / 2,
                    buttonBox.y + buttonBox.height / 2,
                    { steps: humanBehaviorService.randomDelay(5, 15) }
                  );
                  await humanBehaviorService.sleep(humanBehaviorService.randomDelay(500, 1000));
                }
              }
              
              await subscribeButton.click();
              console.log('✅ Subscribed to channel!');
              
              if (humanBehavior) {
                await humanBehaviorService.sleep(humanBehaviorService.randomDelay(1000, 2000));
              }
            } else {
              console.log('ℹ️  Already subscribed to this channel');
            }
          } else {
            console.log('ℹ️  Subscribe button not found (might need login)');
          }
        } catch (e) {
          console.log('⚠️  Subscribe failed:', e.message);
        }
      }

      // Use random duration if enabled
      let actualDuration = duration;
      if (randomDuration) {
        actualDuration = humanBehaviorService.getRandomWatchDuration();
        console.log(`🎲 Random duration: ${actualDuration} seconds`);
      }

      console.log(`👀 Watching video for ${actualDuration} seconds...`);
      
      // Watch video with human-like behavior
      if (humanBehavior) {
        // Initial random scroll to see video description/comments
        if (Math.random() > 0.5) {
          await humanBehaviorService.randomScroll(page);
        }
        
        // Initial mouse movement
        await humanBehaviorService.randomMouseMovements(page);
        
        // Click on video to focus
        if (Math.random() > 0.6) {
          await humanBehaviorService.clickOnVideo(page);
        }
        
        // Simulate watching with random actions
        await humanBehaviorService.simulateWatching(page, actualDuration);
      } else {
        // Simple watch without simulation
        await humanBehaviorService.sleep(actualDuration * 1000);
      }

      console.log('✅ Finished watching video');
      
      return true;
    } catch (error) {
      console.error('❌ Error watching video:', error.message);
      throw error;
    }
  }
}

module.exports = new WatchService();
