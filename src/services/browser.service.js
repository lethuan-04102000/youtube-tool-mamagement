const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class BrowserService {
  
  async launchBrowser(headless = null) {
    // Use env variable if not explicitly set
    const isHeadless = headless !== null 
      ? headless 
      : process.env.HEADLESS === 'true';
    
    console.log(`🌐 Launching Chrome browser ${isHeadless ? '(headless)' : '(visible)'}...`);

    const browser = await puppeteer.launch({
      headless: isHeadless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,900'
      ],
      defaultViewport: {
        width: 1280,
        height: 900
      },
      timeout: 60000
    });
    
    return browser;
  }

  async createPage(browser) {
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Anti-detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override chrome property
      window.chrome = {
        runtime: {}
      };
    });

    return page;
  }

  async clearSession(page) {
    try {
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.send('Network.clearBrowserCache');
    } catch (error) {
      // Ignore
    }
  }
}

module.exports = new BrowserService();
