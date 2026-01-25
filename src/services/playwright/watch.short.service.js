/**
 * YouTube Shorts Watch Service
 * 
 * Optimized for YouTube Shorts vertical video format
 * Simulates realistic Shorts viewing behavior
 */

const commentHelper = require('../../helpers/comment.helper');

class WatchShortsService {
  
  /**
   * Watch YouTube Short with human-like behavior
   */
  async watchShort(page, shortUrl, duration = 30, options = {}) {
    const {
      humanBehavior = true,
      autoLike = false,
      autoSubscribe = false,
      autoComment = false
    } = options;

    try {
      console.log(`🎬 [SHORTS] Navigating to: ${shortUrl}`);
      
      // Initial delay (simulating user thinking)
      if (humanBehavior) {
        const delay = this.randomDelay(2000, 5000);
        await page.waitForTimeout(delay);
        console.log(`⏱️  Initial delay: ${delay}ms`);
      }

      await page.goto(shortUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      console.log('⏳ Waiting for Shorts player...');
      
      // Wait for Shorts player and video element
      try {
        await page.waitForSelector('ytd-shorts, ytd-reel-video-renderer', { timeout: 30000 });
        await page.waitForSelector('video', { timeout: 10000 });
        await page.waitForTimeout(this.randomDelay(1500, 2500));
        console.log('✅ Shorts player ready');
      } catch (e) {
        console.warn('⚠️  Shorts player not ready, continuing...');
      }

      // Click on short to focus and play
      try {
        console.log('🖱️  Clicking short to play...');
        
        // Try clicking the video container first
        const videoContainer = await page.$('.html5-video-container');
        if (videoContainer) {
          await videoContainer.click();
          await page.waitForTimeout(this.randomDelay(1000, 2000));
          console.log('▶️  Video container clicked');
        } else {
          // Fallback to video element
          const video = await page.$('video');
          if (video) {
            await video.click();
            await page.waitForTimeout(this.randomDelay(1000, 2000));
            console.log('▶️  Video element clicked');
          }
        }
        
        // Verify video is playing
        const isPlaying = await page.evaluate(() => {
          const videoEl = document.querySelector('video');
          return videoEl && !videoEl.paused;
        });
        
        if (!isPlaying) {
          console.log('⚠️  Video not playing, trying space key...');
          await page.keyboard.press('Space');
          await page.waitForTimeout(500);
        } else {
          console.log('✅ Video is playing');
        }
        
      } catch (e) {
        console.log('⚠️  Could not click video:', e.message);
      }

      // Close popups and overlays
      try {
        // Close consent dialogs
        const consentButton = await page.$('button[aria-label*="Accept"], button[aria-label*="Agree"], button[aria-label*="Chấp nhận"]');
        if (consentButton) {
          await consentButton.click();
          console.log('✅ Closed consent dialog');
          await page.waitForTimeout(this.randomDelay(500, 1000));
        }

        // Press Escape to close any remaining overlays
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } catch (e) {
        console.log('ℹ️  No popups');
      }

      // Auto subscribe (25% conversion rate)
      if (autoSubscribe && Math.random() < 0.25) {
        await this.subscribeShort(page, humanBehavior);
      }

      // Watch with Shorts-specific behavior
      console.log(`👀 Watching Short for ${duration} seconds...`);
      if (humanBehavior) {
        await this.simulateShortsWatching(page, duration);
      } else {
        await page.waitForTimeout(duration * 1000);
      }

      console.log('✅ [SHORTS] Finished watching\n');
      
      return {
        success: true,
        type: 'short',
        duration,
        liked: autoLike,
        subscribed: autoSubscribe,
        commented: autoComment
      };

    } catch (error) {
      console.error('❌ [SHORTS] Error:', error.message);
      throw error;
    }
  }

  /**
   * Simulate human behavior on Shorts (simplified)
   */
  async simulateShortsWatching(page, durationInSeconds) {
    const endTime = Date.now() + (durationInSeconds * 1000);
    const actions = [];
    
    console.log('🎭 [SHORTS] Simulating human behavior...');
    
    while (Date.now() < endTime) {
      const remainingTime = Math.floor((endTime - Date.now()) / 1000);
      
      if (remainingTime <= 0) break;
      
      const action = Math.random();
      
      try {
        if (action < 0.2) {
          // Pause/Resume (20%)
          console.log(`⏯️  Pause/Resume (${remainingTime}s left)`);
          await page.keyboard.press('Space');
          await page.waitForTimeout(this.randomDelay(2000, 4000));
          await page.keyboard.press('Space');
          actions.push('pause_play');
          await page.waitForTimeout(this.randomDelay(1000, 2000));
          
        } else if (action < 0.3) {
          // Volume control (10%)
          const volumeKey = Math.random() < 0.5 ? 'ArrowUp' : 'ArrowDown';
          console.log(`� Volume ${volumeKey === 'ArrowUp' ? 'up' : 'down'} (${remainingTime}s left)`);
          await page.keyboard.press(volumeKey);
          await page.waitForTimeout(this.randomDelay(1000, 2000));
          actions.push('volume');
          
        } else {
          // Just watch (70%)
          const watchTime = Math.min(
            this.randomDelay(5, 15),
            remainingTime
          );
          console.log(`👀 Watching (${watchTime}s of ${remainingTime}s left)`);
          await page.waitForTimeout(watchTime * 1000);
          actions.push('watch');
        }
        
      } catch (e) {
        // Ignore action errors, continue watching
      }
    }
    
    console.log(`✅ [SHORTS] Actions: ${actions.join(', ')}`);
  }

  /**
   * Like a Short
   */
  async likeShort(page, humanBehavior = true) {
    try {
      console.log('👍 [SHORTS] Attempting to like...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(1000, 3000));
      }

      // Shorts like button selectors
      const likeSelectors = [
        'ytd-shorts like-button-view-model button',
        '#like-button button',
        'ytd-reel-video-renderer like-button-view-model button'
      ];

      for (const selector of likeSelectors) {
        try {
          const likeButton = await page.$(selector);
          
          if (likeButton) {
            const ariaLabel = await likeButton.getAttribute('aria-label');
            
            if (ariaLabel && !ariaLabel.toLowerCase().includes('dislike')) {
              await likeButton.click();
              console.log('✅ [SHORTS] Liked!');
              
              if (humanBehavior) {
                await page.waitForTimeout(this.randomDelay(500, 1500));
              }
              return;
            } else {
              console.log('ℹ️  [SHORTS] Already liked');
              return;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️  [SHORTS] Like button not found');

    } catch (error) {
      console.log('⚠️  [SHORTS] Like failed:', error.message);
    }
  }

  /**
   * Subscribe from Short
   */
  async subscribeShort(page, humanBehavior = true) {
    try {
      console.log('📺 [SHORTS] Attempting to subscribe...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      const subscribeSelectors = [
        'ytd-shorts #subscribe-button button',
        'ytd-reel-video-renderer #subscribe-button button'
      ];

      for (const selector of subscribeSelectors) {
        try {
          const subscribeButton = await page.$(selector);
          
          if (subscribeButton) {
            const text = await subscribeButton.textContent();
            
            if (text && text.trim().toLowerCase() === 'subscribe') {
              await subscribeButton.click();
              console.log('✅ [SHORTS] Subscribed!');
              
              if (humanBehavior) {
                await page.waitForTimeout(this.randomDelay(1000, 2000));
              }
              return;
            } else {
              console.log('ℹ️  [SHORTS] Already subscribed');
              return;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️  [SHORTS] Subscribe button not found');

    } catch (error) {
      console.log('⚠️  [SHORTS] Subscribe failed:', error.message);
    }
  }

  /**
   * Comment on Short
   */
  async commentOnShort(page, humanBehavior = true) {
    try {
      console.log('💬 [SHORTS] Attempting to comment...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      // Click comment button
      const commentButton = await page.$('ytd-shorts #comments-button button, ytd-reel-video-renderer #comments-button button');
      
      if (commentButton) {
        await commentButton.click();
        console.log('🖱️  Opened comments');
        
        if (humanBehavior) {
          await page.waitForTimeout(this.randomDelay(1000, 2000));
        }

        // Wait for comment input
        await page.waitForTimeout(1000);
        
        // Type comment
        const commentInput = await page.$('#contenteditable-root');
        
        if (commentInput) {
          const commentText = commentHelper.getSmartComment();
          
          console.log(`📝 Comment: "${commentText}"`);
          
          if (humanBehavior) {
            for (const char of commentText) {
              await commentInput.type(char);
              await page.waitForTimeout(this.randomDelay(50, 150));
            }
          } else {
            await commentInput.type(commentText);
          }
          
          if (humanBehavior) {
            await page.waitForTimeout(this.randomDelay(2000, 4000));
          }
          
          // Submit
          const submitButton = await page.$('#submit-button button');
          if (submitButton) {
            const isDisabled = await submitButton.getAttribute('disabled');
            if (!isDisabled) {
              await submitButton.click();
              console.log('✅ [SHORTS] Comment posted!');
              
              if (humanBehavior) {
                await page.waitForTimeout(this.randomDelay(1000, 2000));
              }
            }
          }
        }
      } else {
        console.log('⚠️  [SHORTS] Comment button not found');
      }

    } catch (error) {
      console.log('⚠️  [SHORTS] Comment failed:', error.message);
    }
  }

  /**
   * Helper: Random delay
   */
  randomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = new WatchShortsService();
