const { firefox } = require('playwright');

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

  async createPage(browser) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
    });
    
    const page = await context.newPage();
    
    console.log(`🔧 Playwright page created`);
    
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
