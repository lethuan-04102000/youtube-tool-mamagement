const { CHANNEL_CREATION, YOUTUBE_SELECTORS, ERROR_MESSAGES, RETRY_STRATEGIES } = require('../../config/constants');
const retryService = require('./retry.service');

class ChannelService {
  /**
   * Check if "Get advanced features" dialog appears (channel already exists)
   * @param {Page} page 
   * @returns {Promise<boolean>}
   */
  async checkChannelExists(page) {
    return await page.evaluate(() => {
      const dialog = document.querySelector('yt-feature-enablement-soft-entry-renderer');
      if (dialog) {
        const title = dialog.querySelector('#title')?.textContent || '';
        return title.includes('Get advanced features') || title.includes('advanced features');
      }
      return false;
    });
  }

  /**
   * Click cancel button to close "Get advanced features" dialog
   * @param {Page} page 
   * @returns {Promise<boolean>}
   */
  async clickCancelDialog(page) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cancelBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase().trim() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        return text === 'cancel' || ariaLabel === 'cancel' || text === 'hủy';
      });

      if (cancelBtn) {
        cancelBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      await new Promise(r => setTimeout(r, 2000));
    }

    return clicked;
  }

  /**
   * Click "Create a channel" button
   * @param {Page} page 
   * @returns {Promise<boolean>}
   */
  async clickCreateChannelButton(page) {
    return await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('a, button, yt-button-shape a'));
      const createBtn = buttons.find(btn => {
        const text = btn.textContent?.toLowerCase() || '';
        return text.includes('create a channel') || text.includes('tạo kênh');
      });

      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });
  }

  /**
   * Find channel name input field using multiple methods
   * @param {Page} page 
   * @returns {Promise<ElementHandle|null>}
   */
  async findChannelNameInput(page) {
    // Try multiple selectors
    for (const selector of YOUTUBE_SELECTORS.NAME_INPUT) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        const input = await page.$(selector);
        if (input) {
          console.log(`   ✅ Found input with selector: ${selector}`);
          return input;
        }
      } catch (e) {
        continue;
      }
    }

    console.log('   ⚠️  Could not find name input with any selector');
    return null;
  }

  /**
   * Clear and type channel name into input
   * @param {Page} page 
   * @param {ElementHandle} input 
   * @param {string} channelName 
   */
  async enterChannelName(page, input, channelName) {
    // Clear input
    await input.click();
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(el => {
      el.value = '';
      el.focus();
    }, input);

    await input.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 500));

    // Type channel name
    console.log(`   Typing: ${channelName}`);
    await input.type(channelName, { delay: 150 });

    // Verify the value was entered
    const finalValue = await page.evaluate(el => el.value, input);
    console.log(`✅ Đã nhập Name: "${finalValue}"`);

    // Check if value is empty, retry once
    if (!finalValue || finalValue.trim() === '') {
      console.log('⚠️  Warning: Input appears empty, retrying...');
      await input.click();
      await new Promise(r => setTimeout(r, 300));
      await input.type(channelName, { delay: 200 });

      const retryValue = await page.evaluate(el => el.value, input);
      console.log(`   Retry result: "${retryValue}"`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  /**
   * Click "Create channel" submit button
   * @param {Page} page 
   * @returns {Promise<boolean>}
   */
  async clickSubmitButton(page) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (text.includes('create channel') || ariaLabel.includes('create channel')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (clicked) {
      await new Promise(r => setTimeout(r, CHANNEL_CREATION.WAIT_AFTER_CLICK));
    }

    return clicked;
  }

  /**
   * Handle retry logic for channel creation
   * @param {Page} page 
   * @param {string} channelName 
   * @returns {Promise<{success: boolean, finalName: string}>}
   */
  async handleRetries(page, channelName) {
    let actualChannelName = channelName;

    // Retry attempt 1: timestamp
    console.log('🔄 Retrying with modified channel name...');
    let retryResult = await retryService.retryWithStrategy(page, channelName, RETRY_STRATEGIES.TIMESTAMP);
    
    if (retryResult.success) {
      actualChannelName = retryResult.name;
      
      // Check for error
      const error1 = await retryService.checkForError(page);
      if (!error1) {
        return { success: true, finalName: actualChannelName };
      }

      // Retry attempt 2: random number
      console.log('❌ Name vẫn không hợp lệ, thử với số ngẫu nhiên...');
      retryResult = await retryService.retryWithStrategy(page, channelName, RETRY_STRATEGIES.RANDOM_NUMBER);
      
      if (retryResult.success) {
        actualChannelName = retryResult.name;
        
        // Check for error
        const error2 = await retryService.checkForError(page);
        if (!error2) {
          return { success: true, finalName: actualChannelName };
        }

        // Retry attempt 3: UUID
        console.log('❌ Number suffix vẫn lỗi, thử với UUID suffix...');
        retryResult = await retryService.retryWithStrategy(page, channelName, RETRY_STRATEGIES.UUID);
        
        if (retryResult.success) {
          actualChannelName = retryResult.name;
          
          // Check for error one last time
          const error3 = await retryService.checkForError(page);
          if (!error3) {
            return { success: true, finalName: actualChannelName };
          }

          // All retries failed
          console.log(`❌ All ${CHANNEL_CREATION.MAX_RETRY_ATTEMPTS} attempts failed. Last error: ${error3}`);
          throw new Error(`Failed to create channel after ${CHANNEL_CREATION.MAX_RETRY_ATTEMPTS} attempts: ${error3}`);
        }
      }
    }

    return { success: false, finalName: actualChannelName };
  }

  /**
   * Create YouTube channel with retry logic
   * @param {Page} page 
   * @param {string} channelName 
   * @returns {Promise<{created: boolean, channelName: string, message?: string, channelExists?: boolean}>}
   */
  async createChannel(page, channelName) {
    try {
      console.log(`📺 Đang tạo YouTube channel: ${channelName}`);
      let actualChannelName = channelName;

      // Navigate to channel switcher
      await page.goto('https://www.youtube.com/channel_switcher', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await new Promise(r => setTimeout(r, 3000));

      // Check if channel already exists
      console.log('🔍 Checking if channel already exists...');
      const channelExists = await this.checkChannelExists(page);

      if (channelExists) {
        console.log('⚠️  Dialog "Get advanced features" detected - Channel already exists');
        await this.clickCancelDialog(page);
        
        return {
          created: false,
          message: 'Channel already exists (advanced features verification required)',
          channelExists: true
        };
      }

      // Click "Create a channel" button
      console.log('🔍 Đang tìm nút "Create a channel"...');
      const createButtonClicked = await this.clickCreateChannelButton(page);

      if (!createButtonClicked) {
        console.log('ℹ️  Could not find "Create a channel" button');
        return { created: false, message: 'Create button not found' };
      }

      console.log('✅ Đã click "Create a channel"');
      await new Promise(r => setTimeout(r, 5000));

      // Find and enter channel name
      console.log('✏️  Đang nhập tên channel...');
      const nameInput = await this.findChannelNameInput(page);

      if (!nameInput) {
        throw new Error('Could not find channel name input field');
      }

      await this.enterChannelName(page, nameInput, channelName);

      // Click submit button
      console.log('🔘 Đang tìm và click nút "Create channel"...');
      await new Promise(r => setTimeout(r, 2000));
      
      const submitClicked = await this.clickSubmitButton(page);
      if (submitClicked) {
        console.log('✅ Đã click nút "Create channel"');
      } else {
        console.log('⚠️  Không tìm thấy nút "Create channel"');
      }

      // Check for error
      console.log('🔍 Checking for error messages...');
      const errorMessage = await retryService.checkForError(page);

      if (errorMessage) {
        console.log(`❌ Error detected: ${errorMessage}`);
        
        // Handle retries
        const retryResult = await this.handleRetries(page, channelName);
        if (retryResult.success) {
          actualChannelName = retryResult.finalName;
        }
      }

      await new Promise(r => setTimeout(r, 3000));

      console.log('🎉 Tạo channel thành công!');
      console.log(`📝 Tên channel thực tế: "${actualChannelName}"`);
      
      return { created: true, channelName: actualChannelName };

    } catch (error) {
      console.error('❌ Lỗi tạo channel:', error.message);
      throw error;
    }
  }

  /**
   * Get channel info from YouTube Studio
   * @param {Page} page 
   * @returns {Promise<{name: string, link: string}>}
   */
  async getChannelInfo(page) {
    try {
      console.log('📍 Đang lấy thông tin channel...');

      // Wait for redirect
      await new Promise(r => setTimeout(r, 5000));

      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      // Navigate to YouTube Studio if not there
      if (!currentUrl.includes('studio.youtube.com')) {
        await page.goto('https://studio.youtube.com', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        await new Promise(r => setTimeout(r, 3000));
      }

      // Handle "Welcome to YouTube Studio" popup
      console.log('🔍 Checking for Welcome popup...');
      const welcomeDismissed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('ytcp-button button, button'));
        const continueBtn = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase().trim() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          return text === 'continue' || ariaLabel === 'continue' || text === 'tiếp tục';
        });

        if (continueBtn) {
          continueBtn.click();
          return true;
        }
        return false;
      });

      if (welcomeDismissed) {
        console.log('✅ Đã dismiss Welcome popup');
        await new Promise(r => setTimeout(r, 2000));
      }

      // Extract channel info
      const channelInfo = await page.evaluate(() => {
        const url = window.location.href;
        const channelIdMatch = url.match(/channel\/([^\/\?]+)/);

        let channelLink = '';
        if (channelIdMatch && channelIdMatch[1]) {
          channelLink = `https://www.youtube.com/channel/${channelIdMatch[1]}`;
        }

        return {
          name: '',
          link: channelLink
        };
      });

      console.log(`✅ Channel info:`, channelInfo);
      return channelInfo;

    } catch (error) {
      console.error('❌ Lỗi lấy thông tin channel:', error.message);
      return { name: '', link: '' };
    }
  }
}

module.exports = new ChannelService();
