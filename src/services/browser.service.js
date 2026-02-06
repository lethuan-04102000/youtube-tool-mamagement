const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const sessionService = require('./session.service');

puppeteer.use(StealthPlugin());

class BrowserService {
  constructor() {
    // Track active browsers: Map<email, { browser, pages: Page[] }>
    this.activeBrowsers = new Map();
  }

  /**
   * Get active browser for email (if exists)
   */
  getActiveBrowser(email) {
    return this.activeBrowsers.get(email);
  }

  /**
   * Check if browser is still open and valid
   */
  async isBrowserActive(email) {
    const browserInfo = this.activeBrowsers.get(email);
    if (!browserInfo) return false;

    try {
      // Check if browser process is still running
      const pages = await browserInfo.browser.pages();
      return pages.length > 0;
    } catch (error) {
      // Browser crashed or closed
      this.activeBrowsers.delete(email);
      return false;
    }
  }

  /**
   * Launch browser with optional profile for email
   * OR reuse existing browser and open new tab
   * @param {boolean|null} headless - Headless mode
   * @param {string|null} email - Email to load profile for (null = no profile)
   * @param {number} retries - Number of retry attempts
   * @param {boolean} reuseIfOpen - If true, reuse existing browser (open new tab instead of new browser)
   * @returns {Promise<{browser: Browser, page: Page, isNewBrowser: boolean}>}
   */
  async launchBrowser(headless = null, email = null, retries = 3, reuseIfOpen = true) {
    // Check if browser already open for this email and should reuse
    if (reuseIfOpen && email) {
      const isActive = await this.isBrowserActive(email);
      
      if (isActive) {
        console.log(`🔄 Browser already open for [${email}], opening new tab...`);
        const browserInfo = this.activeBrowsers.get(email);
        const page = await this.createPage(browserInfo.browser);
        
        // Track new page
        browserInfo.pages.push(page);
        
        return {
          browser: browserInfo.browser,
          page: page,
          isNewBrowser: false
        };
      }
    }
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
            '--disable-features=ChromeWhatsNewUI',
            // ===== THÊM CÁC FLAG MỚI ĐỂ GIỐNG NGƯỜI DÙNG THẬT HƠN =====
            '--disable-web-security', // Tắt security để tránh CORS issues
            '--disable-features=IsolateOrigins,site-per-process', // Tắt site isolation
            '--allow-running-insecure-content',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-domain-reliability',
            '--disable-component-extensions-with-background-pages',
            // Language và timezone
            '--lang=en-US,en',
            // WebGL và Canvas fingerprinting
            '--use-gl=swiftshader',
            '--enable-webgl',
            '--enable-unsafe-swiftshader',
            // Audio
            '--autoplay-policy=no-user-gesture-required',
            // Permissions
            '--deny-permission-prompts'
          ],
          ignoreDefaultArgs: [
            '--enable-automation',
            '--enable-blink-features=IdleDetection' // Tắt idle detection
          ],
          defaultViewport: {
            width: 1400,
            height: 1200
          },
          timeout: 60000,
          // ===== THÊM EXECUTABLE PATH ĐỂ SỬ DỤNG CHROME THẬT =====
          // Nếu có Chrome/Chromium đã cài trên máy, sử dụng nó thay vì Chromium của Puppeteer
          // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
          // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
          // executablePath: '/usr/bin/google-chrome', // Linux
        };

        // Add userDataDir if email provided
        if (email) {
          const profilePath = sessionService.getProfilePath(email);
          launchOptions.userDataDir = profilePath;
          console.log(`📂 Using profile: ${profilePath}`);
        }

        const browser = await puppeteer.launch(launchOptions);
        const page = await this.createPage(browser);

        // Track browser and page
        if (email) {
          this.activeBrowsers.set(email, {
            browser: browser,
            pages: [page]
          });

          // Clean up when browser closes
          browser.on('disconnected', () => {
            console.log(`🔴 Browser closed for [${email}]`);
            this.activeBrowsers.delete(email);
          });
        }

        console.log(`✅ Browser launched successfully`);
        return {
          browser: browser,
          page: page,
          isNewBrowser: true
        };
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

    // Set realistic user agent (latest Chrome on macOS)
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set viewport to match common screen resolutions
    await page.setViewport({
      width: 1400,
      height: 1200,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });

    // Set extra HTTP headers to look more human
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    });

    // Advanced anti-detection - MUST run before page navigation
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });
      
      // Mock plugins to look like a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: {type: "application/pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin},
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin},
            1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin},
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ]
      });
      
      // Set languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Override chrome property
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      
      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Add missing properties to make it look more real
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => 0
      });

      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel'
      });

      Object.defineProperty(navigator, 'vendor', {
        get: () => 'Google Inc.'
      });

      // Override getUserMedia to prevent detection
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function(constraints) {
          return getUserMedia(constraints);
        };
      }

      // Mock battery API
      if (!navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1,
          addEventListener: () => {},
          removeEventListener: () => {}
        });
      }

      // Override permissions
      const originalPermissions = navigator.permissions;
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: (parameters) => {
            if (parameters.name === 'notifications') {
              return Promise.resolve({ state: 'default' });
            }
            return originalPermissions.query(parameters);
          }
        })
      });

      // Remove automation-related properties
      delete navigator.__proto__.webdriver;
      
      // Mock connection API
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        })
      });

      // Mock deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });

      // Mock hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });
    });

    // Add random mouse movements to mimic human behavior
    page.on('load', async () => {
      try {
        await page.evaluate(() => {
          // Add random delays to make actions look more human
          const addRandomDelay = () => Math.floor(Math.random() * 100) + 50;
          
          // Simulate mouse movements occasionally
          let moveCount = 0;
          const maxMoves = Math.floor(Math.random() * 5) + 3;
          
          const moveMouseRandomly = () => {
            if (moveCount < maxMoves) {
              const x = Math.floor(Math.random() * window.innerWidth);
              const y = Math.floor(Math.random() * window.innerHeight);
              
              const event = new MouseEvent('mousemove', {
                clientX: x,
                clientY: y,
                bubbles: true
              });
              
              document.dispatchEvent(event);
              moveCount++;
              
              setTimeout(moveMouseRandomly, addRandomDelay() * 10);
            }
          };
          
          // Start random mouse movements after a delay
          setTimeout(moveMouseRandomly, addRandomDelay());
        });
      } catch (err) {
        // Ignore errors in random mouse movements
      }
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

  /**
   * Close specific page/tab
   */
  async closePage(email, page) {
    const browserInfo = this.activeBrowsers.get(email);
    if (!browserInfo) return;

    try {
      await page.close();
      
      // Remove from tracked pages
      browserInfo.pages = browserInfo.pages.filter(p => p !== page);
      
      console.log(`🗑️  Closed tab for [${email}]. Remaining tabs: ${browserInfo.pages.length}`);
      
      // If no pages left, close browser
      if (browserInfo.pages.length === 0) {
        await browserInfo.browser.close();
        this.activeBrowsers.delete(email);
        console.log(`🔴 Browser closed for [${email}] (no tabs remaining)`);
      }
    } catch (error) {
      console.error('Error closing page:', error);
    }
  }

  /**
   * Close browser for email
   */
  async closeBrowser(email) {
    const browserInfo = this.activeBrowsers.get(email);
    if (!browserInfo) {
      console.log(`⚠️  No active browser found for [${email}]`);
      return false;
    }

    try {
      await browserInfo.browser.close();
      this.activeBrowsers.delete(email);
      console.log(`✅ Browser closed for [${email}]`);
      return true;
    } catch (error) {
      console.error(`❌ Error closing browser for [${email}]:`, error);
      this.activeBrowsers.delete(email); // Clean up anyway
      return false;
    }
  }

  /**
   * Get all active browsers
   */
  getActiveBrowsers() {
    const result = [];
    for (const [email, info] of this.activeBrowsers.entries()) {
      result.push({
        email: email,
        tabCount: info.pages.length
      });
    }
    return result;
  }
}

module.exports = new BrowserService();
