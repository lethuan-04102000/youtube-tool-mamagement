const { firefox } = require('playwright');
const antiDetectionHelper = require('../../helpers/anti-detection.helper');

class BrowserPlaywrightService {
  
  async launchBrowser(headless = null) {
    const isHeadless = headless !== null 
      ? headless 
      : process.env.HEADLESS === 'true';
    
    console.log(`🦊 Launching Firefox (Playwright) ${isHeadless ? '(headless)' : '(visible)'}...`);

    try {
      const browser = await firefox.launch({
        headless: isHeadless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      console.log('✅ Firefox (Playwright) launched successfully');
      return browser;
    } catch (error) {
      console.error('❌ Firefox launch failed:', error.message);
      throw error;
    }
  }

  async createPage(browser, options = {}) {
    // ⚡ ANTI-DETECTION: Generate randomized browser context
    // Each page gets unique fingerprint (user agent, viewport, timezone, etc.)
    const contextOptions = antiDetectionHelper.generateContextOptions({
      proxy: options.proxy || undefined, // Optional proxy per page
    });
    
    console.log(`🔧 Creating context with:
      - Viewport: ${contextOptions.viewport.width}x${contextOptions.viewport.height}
      - Timezone: ${contextOptions.timezoneId}
      - Locale: ${contextOptions.locale}
      - Proxy: ${options.proxy ? '✓' : '✗'}
    `);
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    
    console.log(`✅ Playwright page created with unique fingerprint`);
    
    return page;
  }

  async clearSession(page) {
    try {
      // Clear cookies via context
      const context = page.context();
      await context.clearCookies();
      
      // Clear storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      console.log('🧹 Playwright session cleared');
    } catch (error) {
      console.warn('⚠️  Could not clear session:', error.message);
    }
  }
}

module.exports = new BrowserPlaywrightService();
