/**
 * YouTube Regular Video Watch Service
 * 
 * Optimized for standard horizontal YouTube videos
 * Simulates realistic video watching behavior
 */

const commentHelper = require('../../helpers/comment.helper');

class WatchNormalService {
  
  /**
   * Watch regular YouTube video with human-like behavior
   */
  async watchVideo(page, videoUrl, duration = 30, options = {}) {
    const {
      humanBehavior = true,
      randomDuration = false,
      autoLike = false,
      autoSubscribe = false,
      autoComment = false
    } = options;

    try {
      console.log(`🎬 [VIDEO] Navigating to: ${videoUrl}`);
      
      // Initial delay (simulating user thinking)
      if (humanBehavior) {
        const delay = this.randomDelay(2000, 5000);
        await page.waitForTimeout(delay);
        console.log(`⏱️  Initial delay: ${delay}ms`);
      }

      await page.goto(videoUrl, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      console.log('⏳ Waiting for video player...');
      
      // Wait for video player
      try {
        await page.waitForSelector('video', { timeout: 30000 });
        await page.waitForTimeout(this.randomDelay(1000, 2000));
        console.log('✅ Video player ready');
      } catch (e) {
        console.warn('⚠️  Video player not ready, continuing...');
      }

      // Click on video to focus and clear any blur
      try {
        console.log('🖱️  Clicking video player to focus...');
        const video = await page.$('video');
        if (video) {
          await video.click();
          await page.waitForTimeout(this.randomDelay(500, 1000));
        }
      } catch (e) {
        console.log('ℹ️  Could not click video');
      }

      // Click play if paused
      try {
        const playButton = await page.$('button.ytp-large-play-button, button.ytp-play-button[aria-label*="Play"]');
        if (playButton) {
          await playButton.click();
          console.log('▶️  Clicked play');
          await page.waitForTimeout(this.randomDelay(1000, 2000));
        }
      } catch (e) {
        console.log('ℹ️  Video already playing');
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

        // Close "Skip trial" or premium prompts
        const skipButton = await page.$('button[aria-label*="No thanks"], button[aria-label*="Skip"], tp-yt-paper-dialog button.yt-button-renderer');
        if (skipButton) {
          await skipButton.click();
          console.log('✅ Closed premium prompt');
          await page.waitForTimeout(this.randomDelay(500, 1000));
        }

        // Press Escape to close any remaining overlays
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
      } catch (e) {
        console.log('ℹ️  No popups');
      }

      // Auto subscribe (25% conversion)
      if (autoSubscribe && Math.random() < 0.25) {
        await this.subscribeChannel(page, humanBehavior);
      }

      // Use random duration if enabled
      let actualDuration = duration;
      if (randomDuration) {
        actualDuration = this.randomDelay(30, 180);
        console.log(`🎲 Random duration: ${actualDuration}s`);
      }

      // Watch video
      console.log(`👀 Watching for ${actualDuration} seconds...`);
      if (humanBehavior) {
        await this.simulateVideoWatching(page, actualDuration);
      } else {
        await page.waitForTimeout(actualDuration * 1000);
      }

      // Auto like (15% conversion)
      if (autoLike && Math.random() < 0.15) {
        await this.likeVideo(page, humanBehavior);
      }

      // Auto comment (5% conversion)
      if (autoComment && Math.random() < 0.05) {
        await this.commentOnVideo(page, humanBehavior);
      }

      console.log('✅ [VIDEO] Finished watching\n');
      
      return {
        success: true,
        type: 'video',
        duration: actualDuration,
        liked: autoLike,
        subscribed: autoSubscribe,
        commented: autoComment
      };

    } catch (error) {
      console.error('❌ [VIDEO] Error:', error.message);
      throw error;
    }
  }

  /**
   * Simulate human behavior on regular video (simplified)
   */
  async simulateVideoWatching(page, durationInSeconds) {
    const endTime = Date.now() + (durationInSeconds * 1000);
    const actions = [];
    
    console.log('🎭 [VIDEO] Simulating human behavior...');
    
    while (Date.now() < endTime) {
      const remainingTime = Math.floor((endTime - Date.now()) / 1000);
      
      if (remainingTime <= 0) break;
      
      const action = Math.random();
      
      try {
        if (action < 0.25) {
          // Scroll page (25%)
          console.log(`📜 Scrolling (${remainingTime}s left)`);
          const scrollAmount = this.randomDelay(100, 400);
          await page.evaluate((amount) => {
            window.scrollBy({ top: amount, behavior: 'smooth' });
          }, scrollAmount);
          actions.push('scroll');
          await page.waitForTimeout(this.randomDelay(2000, 4000));
          
        } else if (action < 0.45) {
          // Pause/Resume (20%)
          console.log(`⏯️  Pause/Resume (${remainingTime}s left)`);
          await page.keyboard.press('Space');
          await page.waitForTimeout(this.randomDelay(3000, 6000));
          await page.keyboard.press('Space');
          actions.push('pause_play');
          await page.waitForTimeout(this.randomDelay(1000, 2000));
          
        } else if (action < 0.55) {
          // Volume control (10%)
          const volumeKey = Math.random() < 0.5 ? 'ArrowUp' : 'ArrowDown';
          console.log(`🔊 Volume ${volumeKey === 'ArrowUp' ? 'up' : 'down'} (${remainingTime}s left)`);
          await page.keyboard.press(volumeKey);
          await page.waitForTimeout(this.randomDelay(1000, 2000));
          actions.push('volume');
          
        } else {
          // Just watch (45%)
          const watchTime = Math.min(
            this.randomDelay(8, 20),
            remainingTime
          );
          console.log(`👀 Watching (${watchTime}s of ${remainingTime}s left)`);
          await page.waitForTimeout(watchTime * 1000);
          actions.push('watch');
        }
        
      } catch (e) {
        // Ignore action errors
      }
    }
    
    console.log(`✅ [VIDEO] Actions: ${actions.join(', ')}`);
  }

  /**
   * Subscribe to channel
   */
  async subscribeChannel(page, humanBehavior = true) {
    try {
      console.log('📺 [VIDEO] Attempting to subscribe...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      const subscribeSelectors = [
        '#subscribe-button-shape button[aria-label*="Subscribe"]',
        'ytd-subscribe-button-renderer #subscribe-button button'
      ];

      for (const selector of subscribeSelectors) {
        try {
          const subscribeButton = await page.$(selector);
          
          if (subscribeButton) {
            const text = await subscribeButton.textContent();
            
            if (text && text.trim().toLowerCase() === 'subscribe') {
              await subscribeButton.click();
              console.log('✅ [VIDEO] Subscribed!');
              
              if (humanBehavior) {
                await page.waitForTimeout(this.randomDelay(1000, 2000));
              }
              return;
            } else {
              console.log('ℹ️  [VIDEO] Already subscribed');
              return;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️  [VIDEO] Subscribe button not found');

    } catch (error) {
      console.log('⚠️  [VIDEO] Subscribe failed:', error.message);
    }
  }

  /**
   * Like video
   */
  async likeVideo(page, humanBehavior = true) {
    try {
      console.log('👍 [VIDEO] Attempting to like...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(1000, 3000));
      }

      // Scroll to like button
      await page.evaluate(() => {
        const likeButton = document.querySelector('like-button-view-model button');
        if (likeButton) {
          likeButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(500, 1000));
      }

      const likeSelectors = [
        'like-button-view-model button[aria-label*="like"]',
        'ytd-menu-renderer like-button-view-model button',
        '#top-level-buttons-computed like-button-view-model button'
      ];

      for (const selector of likeSelectors) {
        try {
          const likeButton = await page.$(selector);
          
          if (likeButton) {
            const ariaLabel = await likeButton.getAttribute('aria-label');
            
            if (ariaLabel && !ariaLabel.toLowerCase().includes('dislike')) {
              await likeButton.click();
              console.log('✅ [VIDEO] Liked!');
              
              if (humanBehavior) {
                await page.waitForTimeout(this.randomDelay(500, 1500));
              }
              return;
            } else {
              console.log('ℹ️  [VIDEO] Already liked');
              return;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      console.log('⚠️  [VIDEO] Like button not found');

    } catch (error) {
      console.log('⚠️  [VIDEO] Like failed:', error.message);
    }
  }

  /**
   * Comment on video
   */
  async commentOnVideo(page, humanBehavior = true) {
    try {
      console.log('💬 [VIDEO] Attempting to comment...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 5000));
      }

      // Scroll to comments
      console.log('📜 Scrolling to comments...');
      await page.evaluate(() => {
        const commentsSection = document.querySelector('ytd-comments#comments');
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 800, behavior: 'smooth' });
        }
      });

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      // Click comment box
      const commentBoxSelectors = [
        '#placeholder-area',
        'ytd-comments#comments #simplebox-placeholder'
      ];

      let commentBoxClicked = false;

      for (const selector of commentBoxSelectors) {
        try {
          const commentBox = await page.$(selector);
          if (commentBox) {
            await commentBox.click();
            commentBoxClicked = true;
            console.log('✅ Comment box clicked');
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!commentBoxClicked) {
        console.log('⚠️  [VIDEO] Comment box not found');
        return;
      }

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(1000, 2000));
      }

      // Wait for input field
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
            console.log('✅ [VIDEO] Comment posted!');
            
            if (humanBehavior) {
              await page.waitForTimeout(this.randomDelay(1000, 2000));
            }
          }
        }
      } else {
        console.log('⚠️  [VIDEO] Comment input not found');
      }

    } catch (error) {
      console.log('⚠️  [VIDEO] Comment failed:', error.message);
    }
  }

  /**
   * Helper: Random delay
   */
  randomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = new WatchNormalService();
