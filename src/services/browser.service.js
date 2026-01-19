const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class BrowserService {
  
  async launchBrowser(headless = null, browserType = 'chrome') {
    // Use env variable if not explicitly set
    const isHeadless = headless !== null 
      ? headless 
      : process.env.HEADLESS === 'true';
    
    console.log(`🌐 Launching ${browserType} browser ${isHeadless ? '(headless)' : '(visible)'}...`);

    const launchOptions = {
      headless: isHeadless,
      timeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,900',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-popup-blocking',
        '--disable-infobars',
        '--disable-features=ChromeWhatsNewUI'
      ],
      defaultViewport: {
        width: 1280,
        height: 900
      },
      ignoreDefaultArgs: ['--enable-automation']
    };

    const browser = await puppeteer.launch(launchOptions);
    
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
