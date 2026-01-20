/**
 * Playwright-based YouTube Watch Service
 * 
 * ANTI-DETECTION BEST PRACTICES:
 * ================================
 * 
 * 1. VIDEO SELECTION:
 *    - Target videos >3 minutes long (better watch time ratio)
 *    - Avoid videos with suspicious activity (spam, fake views)
 *    - Focus on niche content with engaged communities
 * 
 * 2. CHANNEL SELECTION:
 *    - Use aged accounts (>3-6 months old)
 *    - Verified accounts with phone/2FA
 *    - Accounts with viewing history (not brand new)
 *    - Mix of subscribed and unsubscribed channels
 * 
 * 3. VIEWING PATTERNS:
 *    - Watch 40-70% of video duration (realistic retention)
 *    - Don't seek to end immediately
 *    - Space out views (don't spam 100 views in 1 minute)
 *    - Use different IPs/proxies for each view
 *    - Vary browser fingerprints
 * 
 * 4. INTERACTION PATTERNS:
 *    - Random intervals between actions (5-15s)
 *    - Not all views should subscribe (20-30% conversion is natural)
 *    - Some views should like/comment (but sparingly)
 *    - Simulate real user journey (search -> watch -> related video)
 * 
 * 5. TIMING:
 *    - Space out campaigns over hours/days, not minutes
 *    - Mimic natural traffic patterns (peak hours, weekdays)
 *    - Don't send 1000 views instantly
 * 
 * 6. TECHNICAL:
 *    - Use residential proxies (not datacenter)
 *    - Rotate user agents and browser fingerprints
 *    - Clear cookies between sessions
 *    - Use headless: false occasionally (more realistic)
 */

const commentHelper = require('../../helpers/comment.helper');

class WatchPlaywrightService {
  
  /**
   * Watch a YouTube video with human-like behavior simulation
   * @param {Object} page - Playwright page object
   * @param {string} videoUrl - YouTube video URL
   * @param {number} duration - Duration to watch in seconds (default: 30s)
   * @param {Object} options - Options for watching
   * @param {boolean} options.humanBehavior - Enable human-like behavior (default: true)
   * @param {boolean} options.randomDuration - Use random duration (default: false)
   * @param {boolean} options.autoSubscribe - Auto subscribe to channel (default: false)
   * @param {boolean} options.autoComment - Auto comment on video (default: false)
   * @param {boolean} options.autoLike - Auto like video (default: false)
   */
  async watchVideo(page, videoUrl, duration = 30, options = {}) {
    const {
      humanBehavior = true,
      randomDuration = false,
      autoSubscribe = false,
      autoComment = false,
      autoLike = false
    } = options;

    try {
      console.log(`🎬 Navigating to video: ${videoUrl}`);
      
      // ⚡ ANTI-DETECTION: Initial delay simulates real user behavior
      // Real users don't click videos instantly - they think, read title, etc.
      // This helps avoid bot detection patterns
      if (humanBehavior) {
        const initialDelay = this.randomDelay(2000, 5000); // Increased to 2-5s (was 1-3s)
        await page.waitForTimeout(initialDelay);
        console.log(`⏱️  Initial delay (simulate thinking): ${initialDelay}ms`);
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
        console.warn('⚠️  Video player not ready, but continuing...');
      }

      // Try to click play button if paused
      try {
        const playButton = await page.$('button.ytp-play-button[aria-label*="Play"]');
        if (playButton) {
          await playButton.click();
          console.log('▶️  Clicked play button');
          if (humanBehavior) {
            await page.waitForTimeout(this.randomDelay(1000, 2000));
          }
        }
      } catch (e) {
        console.log('ℹ️  Video already playing or no play button found');
      }

      // Close any popups
      try {
        const consentButton = await page.$('button[aria-label*="Accept"], button[aria-label*="Agree"]');
        if (consentButton) {
          await consentButton.click();
          console.log('✅ Closed consent dialog');
          if (humanBehavior) {
            await page.waitForTimeout(this.randomDelay(500, 1000));
          }
        }
      } catch (e) {
        console.log('ℹ️  No popups to close');
      }

      // Auto subscribe if enabled
      // ⚡ ANTI-DETECTION: Not all views should subscribe (20-30% is natural)
      // Real users don't subscribe to every video they watch
      if (autoSubscribe) {
        // Only subscribe 25% of the time (realistic conversion rate)
        const shouldSubscribe = Math.random() < 0.25;
        
        if (!shouldSubscribe) {
          console.log('ℹ️  Skipping subscribe (simulating natural behavior - 75% don\'t subscribe)');
        } else {
          try {
            console.log('🔍 Checking for subscribe button...');
            await page.waitForTimeout(2000);
            
            const subscribeButton = await page.$('#subscribe-button-shape button[aria-label*="Subscribe"]');
            
            if (subscribeButton) {
              const buttonText = await subscribeButton.textContent();
              
              if (buttonText && buttonText.trim() === 'Subscribe') {
                console.log('📺 Found Subscribe button, clicking...');
                
                if (humanBehavior) {
                  await page.waitForTimeout(this.randomDelay(500, 1000));
                }
                
                await subscribeButton.click();
                console.log('✅ Subscribed to channel!');
                
                if (humanBehavior) {
                  await page.waitForTimeout(this.randomDelay(1000, 2000));
                }
              } else {
                console.log('ℹ️  Already subscribed to this channel');
              }
            } else {
              console.log('ℹ️  Subscribe button not found');
            }
          } catch (e) {
            console.log('⚠️  Subscribe failed:', e.message);
          }
        }
      }

      // Use random duration if enabled
      let actualDuration = duration;
      if (randomDuration) {
        actualDuration = this.getRandomWatchDuration();
        console.log(`🎲 Random duration: ${actualDuration} seconds`);
      }

      console.log(`👀 Watching video for ${actualDuration} seconds...`);
      
      // Watch video with human-like behavior
      if (humanBehavior) {
        await this.simulateWatching(page, actualDuration);
      } else {
        // Simple watch without simulation
        await page.waitForTimeout(actualDuration * 1000);
      }

      console.log('✅ Finished watching video');
      
      // ⚡ Auto like if enabled (10-15% of users like videos)
      if (autoLike) {
        const shouldLike = Math.random() < 0.15; // 15% chance
        
        if (!shouldLike) {
          console.log('ℹ️  Skipping like (simulating natural behavior - 85% don\'t like)');
        } else {
          await this.likeVideo(page, humanBehavior);
        }
      }

      // ⚡ Auto comment if enabled (3-5% of users comment)
      if (autoComment) {
        const shouldComment = Math.random() < 0.05; // 5% chance
        
        if (!shouldComment) {
          console.log('ℹ️  Skipping comment (simulating natural behavior - 95% don\'t comment)');
        } else {
          await this.commentOnVideo(page, humanBehavior);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error watching video:', error.message);
      throw error;
    }
  }

  /**
   * Random delay helper
   */
  randomDelay(min = 1000, max = 3000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get random watch duration
   */
  getRandomWatchDuration(min = 30, max = 180) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Simulate watching with random actions
   */
  async simulateWatching(page, durationInSeconds) {
    const endTime = Date.now() + (durationInSeconds * 1000);
    let actionCount = 0;
    
    console.log('🎭 Starting human behavior simulation...');
    
    while (Date.now() < endTime) {
      const remainingTime = endTime - Date.now();
      const actionInterval = this.randomDelay(5000, 15000);
      
      await page.waitForTimeout(Math.min(actionInterval, remainingTime));
      
      if (Date.now() >= endTime) break;
      
      const action = Math.random();
      actionCount++;
      
      try {
        if (action < 0.2) {
          // Scroll
          await page.evaluate((amount) => {
            window.scrollBy({ top: amount, behavior: 'smooth' });
          }, this.randomDelay(100, 500));
          console.log('📜 Scrolled page');
        } else if (action < 0.4) {
          // Pause/play video
          await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video && !video.paused) {
              video.pause();
            }
          });
          console.log('⏸️  Paused video');
          
          await page.waitForTimeout(this.randomDelay(2000, 5000));
          
          await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video && video.paused) {
              video.play();
            }
          });
          console.log('▶️  Resumed video');
        } else if (action < 0.55) {
          // Seek video
          const seekTime = await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video && video.duration > 30) {
              const newTime = Math.floor(Math.random() * video.duration * 0.8);
              video.currentTime = newTime;
              return newTime;
            }
            return 0;
          });
          if (seekTime > 0) {
            console.log(`⏩ Seeked to ${Math.floor(seekTime)}s`);
          }
        } else if (action < 0.65) {
          // Change volume
          const volume = await page.evaluate(() => {
            const video = document.querySelector('video');
            if (video) {
              const vol = Math.random();
              video.volume = vol;
              return vol;
            }
            return 0;
          });
          console.log(`🔊 Volume: ${Math.floor(volume * 100)}%`);
        } else {
          // Mouse movement (move mouse to random position)
          await page.mouse.move(
            this.randomDelay(100, 1200),
            this.randomDelay(100, 800)
          );
        }
      } catch (e) {
        // Ignore action errors
      }
    }
    
    console.log(`✅ Simulation complete (${actionCount} actions)`);
  }

  /**
   * Like a video
   * @param {Object} page - Playwright page object
   * @param {boolean} humanBehavior - Add human delays
   */
  async likeVideo(page, humanBehavior = true) {
    try {
      console.log('👍 Attempting to like video...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(1000, 3000));
      }

      // Scroll to like button area
      await page.evaluate(() => {
        const likeButton = document.querySelector('like-button-view-model button[aria-label*="like"]');
        if (likeButton) {
          likeButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(500, 1000));
      }

      // Try different selectors for like button
      const likeSelectors = [
        'like-button-view-model button[aria-label*="like"]',
        'ytd-menu-renderer like-button-view-model button',
        '#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > like-button-view-model > toggle-button-view-model > button-view-model > button',
      ];

      let liked = false;

      for (const selector of likeSelectors) {
        try {
          const likeButton = await page.$(selector);
          
          if (likeButton) {
            const ariaLabel = await likeButton.getAttribute('aria-label');
            
            // Check if already liked
            if (ariaLabel && ariaLabel.toLowerCase().includes('dislike')) {
              console.log('ℹ️  Video already liked');
              liked = true;
              break;
            }
            
            // Click like button
            await likeButton.click();
            console.log('✅ Liked video!');
            
            if (humanBehavior) {
              await page.waitForTimeout(this.randomDelay(500, 1500));
            }
            
            liked = true;
            break;
          }
        } catch (e) {
          // Try next selector
          continue;
        }
      }

      if (!liked) {
        console.log('⚠️  Like button not found or already liked');
      }

    } catch (error) {
      console.log('⚠️  Like failed:', error.message);
    }
  }

  /**
   * Comment on a video
   * @param {Object} page - Playwright page object
   * @param {boolean} humanBehavior - Add human delays
   */
  async commentOnVideo(page, humanBehavior = true) {
    try {
      console.log('💬 Attempting to comment on video...');
      
      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 5000));
      }

      // Scroll to comments section
      console.log('📜 Scrolling to comments section...');
      await page.evaluate(() => {
        const commentsSection = document.querySelector('ytd-comments#comments');
        if (commentsSection) {
          commentsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 800, behavior: 'smooth' });
        }
      });

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      // Click on comment box to focus
      console.log('🖱️  Clicking comment box...');
      const commentBoxSelectors = [
        '#placeholder-area',
        'ytd-comments#comments #simplebox-placeholder',
        '#placeholder-area.ytd-comments-header-renderer',
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
        console.log('⚠️  Comment box not found');
        return;
      }

      if (humanBehavior) {
        await page.waitForTimeout(this.randomDelay(1000, 2000));
      }

      // Wait for input field to appear
      await page.waitForTimeout(1000);

      // Get random comment from helper
      const commentText = commentHelper.getSmartComment();
      console.log(`📝 Generated comment: "${commentText}"`);

      // Type comment with human-like typing speed
      const commentInputSelectors = [
        '#contenteditable-root',
        'div#contenteditable-root[contenteditable="true"]',
        'ytd-commentbox #contenteditable-root',
      ];

      let commentTyped = false;

      for (const selector of commentInputSelectors) {
        try {
          const input = await page.$(selector);
          if (input) {
            // Type with realistic delay
            if (humanBehavior) {
              // Type each character with 100-300ms delay
              for (const char of commentText) {
                await input.type(char);
                await page.waitForTimeout(this.randomDelay(50, 150));
              }
            } else {
              await input.type(commentText);
            }
            
            console.log('✅ Comment typed');
            commentTyped = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!commentTyped) {
        console.log('⚠️  Comment input not found');
        return;
      }

      if (humanBehavior) {
        // Pause before clicking submit (user reading their comment)
        await page.waitForTimeout(this.randomDelay(2000, 4000));
      }

      // Click submit button
      console.log('📤 Submitting comment...');
      const submitSelectors = [
        '#submit-button',
        'ytd-commentbox #submit-button button',
        'ytd-button-renderer#submit-button button',
      ];

      let submitted = false;

      for (const selector of submitSelectors) {
        try {
          const submitButton = await page.$(selector);
          if (submitButton) {
            // Check if button is enabled
            const isDisabled = await submitButton.getAttribute('disabled');
            if (isDisabled !== null) {
              console.log('⚠️  Submit button is disabled');
              continue;
            }

            await submitButton.click();
            console.log('✅ Comment submitted!');
            submitted = true;
            
            if (humanBehavior) {
              await page.waitForTimeout(this.randomDelay(1000, 2000));
            }
            
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!submitted) {
        console.log('⚠️  Submit button not found or disabled');
      }

    } catch (error) {
      console.log('⚠️  Comment failed:', error.message);
    }
  }
}

module.exports = new WatchPlaywrightService();
