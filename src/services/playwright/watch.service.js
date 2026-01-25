/**
 * Playwright-based YouTube Watch Service - Main Router
 * 
 * Automatically detects video type and delegates to appropriate service:
 * - YouTube Shorts → watch.short.service.js
 * - Regular Videos → watch.normal.service.js
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

const watchShortsService = require('./watch.short.service');
const watchNormalService = require('./watch.normal.service');

class WatchPlaywrightService {
  
  /**
   * Detect if URL is a YouTube Short
   */
  isYouTubeShort(url) {
    return url.includes('/shorts/');
  }
  
  /**
   * Watch YouTube video/short (auto-detect type and delegate)
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
    const isShort = this.isYouTubeShort(videoUrl);
    
    console.log(`\n🎯 Detected: ${isShort ? '� YouTube Short' : '� Regular Video'}`);
    
    if (isShort) {
      return await watchShortsService.watchShort(page, videoUrl, duration, options);
    } else {
      return await watchNormalService.watchVideo(page, videoUrl, duration, options);
    }
  }
}

module.exports = new WatchPlaywrightService();
