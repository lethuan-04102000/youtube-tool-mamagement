const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const sessionService = require('./session.service');

puppeteer.use(StealthPlugin());

class BrowserService {

  /**
   * Launch browser with optional profile for email
   * @param {boolean|null} headless - Headless mode
   * @param {string|null} email - Email to load profile for (null = no profile)
   * @param {number} retries - Number of retry attempts
   * @returns {Promise<Browser>}
   */
  async launchBrowser(headless = null, email = null, retries = 3) {
    // Use env variable if not explicitly set
    const isHeadless = headless !== null
      ? headless
      : process.env.HEADLESS === 'true';

    const profileInfo = email ? ` with profile [${email}]` : '';
    console.log(`🌐 Launching Chrome browser ${isHeadless ? '(headless)' : '(visible)'}${profileInfo}...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const launchOptions = {
          headless: isHeadless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1400,1200',
            '--disable-features=TranslateUI',
            '--disable-background-downloads-warning',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-popup-blocking',
            '--disable-infobars',
            '--disable-features=ChromeWhatsNewUI'
          ],
          ignoreDefaultArgs: ['--enable-automation'],
          defaultViewport: {
            width: 1400,
            height: 1200
          },
          timeout: 60000
        };

        // Add userDataDir if email provided
        if (email) {
          const profilePath = sessionService.getProfilePath(email);
          launchOptions.userDataDir = profilePath;
          console.log(`📂 Using profile: ${profilePath}`);
        }

        const browser = await puppeteer.launch(launchOptions);

        console.log(`✅ Browser launched successfully`);
        return browser;
      } catch (error) {
        console.error(`❌ Browser launch attempt ${attempt}/${retries} failed: ${error.message}`);
        if (attempt < retries) {
          console.log(`   Retrying in 2 seconds...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          throw error;
        }
      }
    }
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
