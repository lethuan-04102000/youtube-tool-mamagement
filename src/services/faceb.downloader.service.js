const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Service to download Facebook avatars using faceb.com with Puppeteer
 */
class FacebDownloaderService {
  
  constructor() {
    this.baseUrl = 'https://faceb.com/?lang=en';
  }

  /**
   * Download avatar from Facebook URL using faceb.com
   * @param {string} facebookUrl - Facebook profile or photo URL
   * @param {string} outputFolder - Folder to save the avatar
   * @param {string} fileName - File name (without extension)
   * @returns {Promise<string>} - Path to downloaded file
   */
  async downloadAvatar(facebookUrl, outputFolder, fileName) {
    let browser = null;
    
    try {
      console.log(`\n📥 Downloading avatar from Facebook: ${facebookUrl}`);
      console.log(`🌐 Using faceb.com service with Puppeteer...`);
      
      // Launch browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to faceb.com
      console.log('🌐 Opening faceb.com...');
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Fill in the URL
      console.log('📝 Entering Facebook URL...');
      await page.type('#url', facebookUrl);
      await new Promise(r => setTimeout(r, 500));
      
      // Click download button
      console.log('🔘 Clicking Download button...');
      await page.click('button[type="submit"].btn-download');
      
      // Wait for result to appear
      console.log('⏳ Waiting for result...');
      await page.waitForSelector('.result-image img[alt="Thumbnail"]', { timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Get the download link
      console.log('🔍 Getting download link...');
      const downloadLink = await page.evaluate(() => {
        const link = document.querySelector('.download-button-wrapper a.download-button');
        return link ? link.href : null;
      });
      
      if (!downloadLink) {
        throw new Error('Could not find download link');
      }
      
      console.log(`✅ Got download link: ${downloadLink.substring(0, 80)}...`);
      
      await browser.close();
      browser = null;
      
      // Download the image using axios
      console.log('💾 Downloading image...');
      
      // Create output folder if not exists
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }
      
      const ext = '.jpg';
      const filePath = path.join(outputFolder, `${fileName}${ext}`);
      
      // Download the image
      const imageResponse = await axios({
        url: downloadLink,
        method: 'GET',
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://faceb.com/',
        },
        timeout: 30000,
      });

      const writer = fs.createWriteStream(filePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`✅ Downloaded to: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Error downloading avatar:', error.message);
      
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // Ignore
        }
      }
      
      throw error;
    }
  }

  /**
   * Download multiple avatars in batch
   * @param {Array<{email: string, avatar_url: string}>} accounts
   * @param {string} outputFolder
   * @returns {Promise<Array<{email: string, success: boolean, path?: string, error?: string}>>}
   */
  async downloadMultipleAvatars(accounts, outputFolder) {
    const results = [];
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      console.log(`\n[${i + 1}/${accounts.length}] Processing: ${account.email}`);
      
      try {
        const fileName = `avatar_${account.email.split('@')[0]}_${Date.now()}`;
        const avatarPath = await this.downloadAvatar(
          account.avatar_url,
          outputFolder,
          fileName
        );
        
        results.push({
          email: account.email,
          success: true,
          path: avatarPath
        });
        
        // Delay between downloads to avoid rate limiting
        if (i < accounts.length - 1) {
          console.log('⏳ Waiting 3s before next download...');
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (error) {
        console.error(`❌ Failed to download for ${account.email}:`, error.message);
        results.push({
          email: account.email,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new FacebDownloaderService();
