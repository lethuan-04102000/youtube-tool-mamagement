const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class FacebDownloaderService {
  
  /**
   * Download avatar using popup window approach
   * Opens Facebook URL in popup, extracts image, downloads it
   */
  async downloadAvatarInTab(page, facebookUrl, outputFolder, fileName) {
    try {
      // Navigate to Facebook URL
      await page.goto(facebookUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Find and extract image URL
      const imageUrl = await page.evaluate(() => {
        const selectors = [
          'img[data-visualcompletion="media-vc-image"]',
          'img.x1ey2m1c',
          'img[src*="scontent"]',
          'img[src*="fbcdn"]',
          'div[role="img"] img',
          'img.spotlight'
        ];
        
        for (const selector of selectors) {
          const img = document.querySelector(selector);
          if (img && img.src && img.src.includes('scontent')) {
            return img.src;
          }
        }
        
        const allImages = Array.from(document.querySelectorAll('img'));
        const largeImage = allImages.find(img => 
          img.naturalWidth > 200 && 
          img.src && 
          (img.src.includes('scontent') || img.src.includes('fbcdn'))
        );
        
        return largeImage?.src || null;
      });
      
      if (!imageUrl) {
        throw new Error('Could not find image URL');
      }
      
      // Download image
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }
      
      let ext = '.jpg';
      const urlPath = imageUrl.split('?')[0];
      const urlExt = path.extname(urlPath);
      if (urlExt && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(urlExt.toLowerCase())) {
        ext = urlExt;
      }
      
      const imageName = `${fileName}${ext}`;
      const filePath = path.join(outputFolder, imageName);
      
      const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.facebook.com/',
        },
        timeout: 30000,
      });
      
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      return {
        success: true,
        imageName,
        path: filePath
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download multiple avatars in parallel using 10 tabs
   */
  async downloadMultipleAvatars(accounts, outputFolder) {
    const PARALLEL_TABS = 10;
    let browser = null;
    
    try {
      console.log(`\n�� Starting parallel avatar download (${PARALLEL_TABS} tabs)...`);
      console.log(`📊 Total accounts: ${accounts.length}\n`);
      
      browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1280,800',
          '--disable-web-security'
        ]
      });

      const results = [];
      
      // Process accounts in batches
      for (let i = 0; i < accounts.length; i += PARALLEL_TABS) {
        const batch = accounts.slice(i, Math.min(i + PARALLEL_TABS, accounts.length));
        const batchNum = Math.floor(i / PARALLEL_TABS) + 1;
        const totalBatches = Math.ceil(accounts.length / PARALLEL_TABS);
        
        console.log(`\n🔄 Batch ${batchNum}/${totalBatches} (${batch.length} accounts)...`);
        
        // Open tabs
        const tabs = await Promise.all(
          batch.map(() => browser.newPage())
        );
        
        // Set user agent for all tabs
        await Promise.all(
          tabs.map(tab => tab.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'))
        );
        
        // Download in parallel
        const batchResults = await Promise.all(
          batch.map(async (account, index) => {
            const tab = tabs[index];
            const fileName = `avatar_${account.email.split('@')[0]}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            console.log(`   [${i + index + 1}/${accounts.length}] Downloading: ${account.email}`);
            
            const downloadResult = await this.downloadAvatarInTab(
              tab,
              account.avatar_url,
              outputFolder,
              fileName
            );
            
            if (downloadResult.success) {
              console.log(`   ✅ [${i + index + 1}] ${account.email} → ${downloadResult.imageName}`);
            } else {
              console.error(`   ❌ [${i + index + 1}] ${account.email}: ${downloadResult.error}`);
            }
            
            return {
              email: account.email,
              id: account.id,
              ...downloadResult
            };
          })
        );
        
        // Close tabs
        await Promise.all(tabs.map(tab => tab.close()));
        
        results.push(...batchResults);
        
        // Wait before next batch
        if (i + PARALLEL_TABS < accounts.length) {
          console.log('\n⏳ Waiting 2s before next batch...');
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      await browser.close();
      
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ Download complete: ${successCount}/${accounts.length} successful\n`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error in downloadMultipleAvatars:', error.message);
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }

  /**
   * Legacy single download method
   */
  async downloadAvatar(facebookUrl, outputFolder, fileName) {
    let browser = null;
    
    try {
      console.log(`\n📥 Downloading avatar from Facebook: ${facebookUrl}`);
      
      browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const result = await this.downloadAvatarInTab(page, facebookUrl, outputFolder, fileName);
      
      await browser.close();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      console.log(`✅ Downloaded to: ${result.path}`);
      return result.path;
      
    } catch (error) {
      console.error('❌ Error downloading avatar:', error.message);
      if (browser) {
        await browser.close().catch(() => {});
      }
      throw error;
    }
  }
}

module.exports = new FacebDownloaderService();
