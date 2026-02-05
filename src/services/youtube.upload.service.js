const browserService = require('./browser.service');
const googleAuthService = require('./google.auth.service');
const { AccountYoutube, UploadedVideo } = require('../models');
const path = require('path');
const fs = require('fs');

class YoutubeUploadService {

  /**
   * Upload video lên YouTube
   * @param {string} email - Email account YouTube
   * @param {string} videoPath - Đường dẫn file video
   * @param {object} videoDetails - Thông tin video
   * @param {string} videoDetails.title - Tiêu đề video
   * @param {string} videoDetails.description - Mô tả video
   * @param {string} videoDetails.visibility - Chế độ: 'public', 'unlisted', 'private' (default: 'public')
   * @param {Array<string>} videoDetails.tags - Tags cho video
   * @param {string} videoDetails.scheduleDate - Ngày giờ đăng video (ISO format, VD: '2024-01-15T10:00:00')
   * @returns {Promise<object>} - Kết quả upload
   */
  async uploadVideo(email, videoPath, videoDetails = {}) {
    const {
      title = 'Untitled Video',
      description = '',
      visibility = 'public',
      tags = [],
      scheduleDate = null
    } = videoDetails;

    let browser = null;
    let page = null;

    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`📤 BẮT ĐẦU UPLOAD VIDEO LÊN YOUTUBE`);
      console.log(`📧 Account: ${email}`);
      console.log(`📁 File: ${videoPath}`);
      console.log(`${'='.repeat(50)}\n`);

      // Kiểm tra file tồn tại
      if (!fs.existsSync(videoPath)) {
        throw new Error(`File không tồn tại: ${videoPath}`);
      }

      // Lấy thông tin account từ DB
      const account = await AccountYoutube.findOne({ where: { email } });
      if (!account) {
        throw new Error(`Không tìm thấy account: ${email}`);
      }

      // Đợi 3 giây trước khi khởi tạo browser (để đảm bảo browser trước đã đóng hoàn toàn)
      console.log('⏳ Đang chuẩn bị browser...');
      await new Promise(r => setTimeout(r, 3000));

      // Khởi tạo browser với profile để tái sử dụng session
      browser = await browserService.launchBrowser(false, email);
      await new Promise(r => setTimeout(r, 1000));
      page = await browserService.createPage(browser);

      // Truy cập YouTube Studio trực tiếp để check session
      console.log('🎬 Đang truy cập YouTube Studio...');
      await page.goto('https://studio.youtube.com', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      await new Promise(r => setTimeout(r, 3000));

      // Check xem có bị redirect về login page không
      const currentUrl = page.url();
      const needsLogin = currentUrl.includes('accounts.google.com') || 
                        currentUrl.includes('signin') ||
                        currentUrl.includes('ServiceLogin');

      if (needsLogin) {
        console.log('🔐 Session expired hoặc chưa login, đang đăng nhập...');
        // Đăng nhập Google
        await googleAuthService.login(page, email, account.password);
        
        // Sau khi login xong, quay lại YouTube Studio
        console.log('🎬 Quay lại YouTube Studio...');
        await page.goto('https://studio.youtube.com', {
          waitUntil: 'networkidle2',
          timeout: 60000
        });
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('✅ Đã đăng nhập (session còn hiệu lực), bỏ qua login');
      }

      // Check and dismiss any permission popups
      console.log('🔍 Kiểm tra và đóng popup Permissions (nếu có)...');
      await this.dismissPermissionsPopup(page);

      // Click nút Create (Upload)
      console.log('📤 Đang mở dialog upload...');
      await this.clickCreateButton(page);

      // Upload file
      console.log('📁 Đang upload file video...');
      await this.selectVideoFile(page, videoPath);

      // Đợi video được xử lý
      console.log('⏳ Đang đợi video được xử lý...');
      await this.waitForVideoProcessing(page);

      // Nhập thông tin video
      console.log('📝 Đang nhập thông tin video...');
      await this.fillVideoDetails(page, { title, description, tags });

      // Chọn visibility và schedule (nếu có)
      console.log(`🔒 Đang thiết lập visibility: ${visibility}...`);
      const visibilityResult = await this.setVisibility(page, visibility, scheduleDate);
      
      if (!visibilityResult.success) {
        // Take screenshot on error
        const screenshotPath = path.join(__dirname, '../../uploads', `error-visibility-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot saved: ${screenshotPath}`);
        throw new Error(`Failed to set visibility: ${visibilityResult.error}`);
      }

      // Publish hoặc Schedule video
      let videoUrl;
      if (scheduleDate) {
        console.log(`📅 Đang schedule video cho: ${scheduleDate}...`);
        videoUrl = await this.scheduleVideo(page);
        if (!videoUrl) {
          // Take screenshot on error
          const screenshotPath = path.join(__dirname, '../../uploads', `error-schedule-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.error(`📸 Screenshot saved: ${screenshotPath}`);
          throw new Error('Failed to schedule video: no video URL returned');
        }
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ SCHEDULE VIDEO THÀNH CÔNG!`);
        console.log(`📅 Scheduled: ${scheduleDate}`);
        console.log(`🔗 URL: ${videoUrl}`);
        console.log(`${'='.repeat(50)}\n`);
      } else {
        console.log('🚀 Đang publish video...');
        videoUrl = await this.publishVideo(page);
        if (!videoUrl) {
          // Take screenshot on error
          const screenshotPath = path.join(__dirname, '../../uploads', `error-publish-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.error(`📸 Screenshot saved: ${screenshotPath}`);
          throw new Error('Failed to publish video: no video URL returned');
        }
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ UPLOAD VIDEO THÀNH CÔNG!`);
        console.log(`🔗 URL: ${videoUrl}`);
        console.log(`${'='.repeat(50)}\n`);
      }

      await browser.close();

      return {
        success: true,
        message: 'Upload video thành công',
        data: {
          email,
          videoUrl,
          title,
          visibility
        }
      };

    } catch (error) {
      console.error(`\n❌ LỖI UPLOAD: ${error.message}`);

      if (browser) {
        await browser.close();
      }

      return {
        success: false,
        message: error.message,
        error: error.message
      };
    }
  }

  /**
   * Dismiss permissions popup if it appears
   */
  async dismissPermissionsPopup(page) {
    try {
      await new Promise(r => setTimeout(r, 2000));

      // Try to find and close the permissions dialog
      const closed = await page.evaluate(() => {
        // Look for the Settings dialog with Permissions tab
        const settingsDialog = document.querySelector('ytcp-dialog') || 
                              document.querySelector('tp-yt-paper-dialog[aria-labelledby="dialog-title"]');
        
        if (settingsDialog) {
          // Check if it's the Permissions dialog
          const dialogTitle = settingsDialog.querySelector('#dialog-title');
          const permissionsText = settingsDialog.textContent || '';
          
          if (permissionsText.includes('Permissions') || 
              permissionsText.includes('Settings') ||
              permissionsText.includes('Invite')) {
            
            console.log('Found Permissions/Settings dialog, closing...');
            
            // Try to find close button
            const closeButtons = settingsDialog.querySelectorAll('button, ytcp-button');
            for (const btn of closeButtons) {
              const ariaLabel = btn.getAttribute('aria-label') || '';
              const text = btn.textContent || '';
              
              // Look for close/cancel/dismiss buttons
              if (ariaLabel.toLowerCase().includes('close') ||
                  ariaLabel.toLowerCase().includes('cancel') ||
                  ariaLabel.toLowerCase().includes('dismiss') ||
                  text.toLowerCase().includes('close') ||
                  text.toLowerCase().includes('cancel')) {
                btn.click();
                console.log('Clicked close button on Permissions dialog');
                return true;
              }
            }
            
            // If no close button found, try pressing ESC
            const escEvent = new KeyboardEvent('keydown', {
              key: 'Escape',
              code: 'Escape',
              keyCode: 27,
              which: 27,
              bubbles: true
            });
            document.dispatchEvent(escEvent);
            console.log('Pressed ESC to close dialog');
            return true;
          }
        }
        
        return false;
      });

      if (closed) {
        console.log('✅ Đã đóng popup Permissions');
        await new Promise(r => setTimeout(r, 1000));
      } else {
        console.log('ℹ️  Không có popup Permissions');
      }
    } catch (error) {
      console.log('⚠️  Lỗi khi đóng popup Permissions:', error.message);
      // Continue anyway, không throw error
    }
  }

  /**
   * Click nút Create để mở dialog upload
   */
  async clickCreateButton(page) {
    console.log('🔍 Đang tìm nút Create/Upload...');

    // Đợi trang load hoàn toàn
    await new Promise(r => setTimeout(r, 3000));

    // Phương pháp 1: Tìm nút Create bằng nhiều selector
    const createButtonSelectors = [
      '#create-icon',
      'ytcp-button#create-icon',
      '#upload-icon',
      'ytcp-icon-button#create-icon',
      '[aria-label="Create"]',
      '[aria-label="Tạo"]',
      '[aria-label="Upload videos"]',
      '[aria-label="Tải video lên"]',
      'button[aria-label="Create a new video or post"]'
    ];

    let clicked = false;

    // Thử click bằng selector
    for (const selector of createButtonSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`   Tìm thấy nút với selector: ${selector}`);
          await element.click();
          clicked = true;
          console.log('✅ Đã click nút Create');
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Phương pháp 2: Tìm bằng evaluate
    if (!clicked) {
      console.log('   Thử tìm bằng evaluate...');
      clicked = await page.evaluate(() => {
        // Tìm nút có icon upload hoặc create
        const buttons = document.querySelectorAll('button, ytcp-button, ytcp-icon-button');
        for (const btn of buttons) {
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const id = btn.id || '';
          if (ariaLabel.toLowerCase().includes('create') ||
            ariaLabel.toLowerCase().includes('upload') ||
            ariaLabel.toLowerCase().includes('tạo') ||
            ariaLabel.toLowerCase().includes('tải') ||
            id.includes('create') ||
            id.includes('upload')) {
            console.log('Found button:', ariaLabel, id);
            btn.click();
            return true;
          }
        }
        return false;
      });
    }

    if (!clicked) {
      throw new Error('Không tìm thấy nút Create');
    }

    // Đợi để xem YouTube mở gì (dialog hoặc menu)
    await new Promise(r => setTimeout(r, 2000));

    // YouTube Studio có 2 UI khác nhau:
    // 1. UI mới: Click Create -> Mở trực tiếp dialog "Upload videos"
    // 2. UI cũ: Click Create -> Hiện menu dropdown -> Phải click "Upload videos"

    console.log('🔍 Kiểm tra xem dialog upload đã mở chưa...');

    // Kiểm tra xem dialog upload đã mở chưa
    const uploadDialogOpened = await page.evaluate(() => {
      // Tìm dialog upload
      const uploadDialog = document.querySelector('ytcp-uploads-dialog') ||
        document.querySelector('[aria-label="Upload videos"]') ||
        document.querySelector('tp-yt-paper-dialog[aria-label*="Upload"]');

      // Tìm nút "Select files" hoặc input file
      const selectFilesBtn = document.querySelector('ytcp-button#select-files-button') ||
        document.querySelector('input[type="file"]');

      return !!(uploadDialog || selectFilesBtn);
    });

    if (uploadDialogOpened) {
      console.log('✅ Dialog upload đã mở (UI mới - không cần click menu)');
      await new Promise(r => setTimeout(r, 1000));
      return; // Xong, không cần làm gì thêm
    }

    // Nếu dialog chưa mở, có thể là UI cũ có menu dropdown
    console.log('🔍 Dialog chưa mở, đang tìm menu dropdown...');

    let uploadClicked = false;

    // Đợi menu xuất hiện
    await new Promise(r => setTimeout(r, 1000));

    // Thử nhiều cách để click Upload video trong menu
    const uploadSelectors = [
      '#text-item-0',
      'tp-yt-paper-item:first-child',
      'ytcp-text-menu tp-yt-paper-item',
      '[test-id="upload-icon"]',
      'tp-yt-paper-item-body'
    ];

    for (const selector of uploadSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent, element);
          console.log(`   Tìm thấy menu item: "${text.trim()}"`);
          await element.click();
          uploadClicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Thử bằng evaluate nếu chưa click được
    if (!uploadClicked) {
      uploadClicked = await page.evaluate(() => {
        // Tìm trong paper-item
        const items = Array.from(document.querySelectorAll('tp-yt-paper-item, ytcp-ve, [role="menuitem"]'));
        for (const item of items) {
          const text = item.textContent.toLowerCase();
          if (text.includes('upload video') ||
            text.includes('tải video lên') ||
            text.includes('upload') && text.includes('video')) {
            console.log('Found upload item:', text);
            item.click();
            return true;
          }
        }

        // Fallback: click item đầu tiên trong menu
        const firstItem = document.querySelector('tp-yt-paper-item') ||
          document.querySelector('#text-item-0');
        if (firstItem) {
          firstItem.click();
          return true;
        }

        return false;
      });
    }

    if (!uploadClicked) {
      throw new Error('Không tìm thấy menu Upload video và dialog upload cũng chưa mở');
    }

    console.log('✅ Đã click menu Upload video');
    await new Promise(r => setTimeout(r, 3000));
  }

  /**
   * Chọn file video để upload
   */
  async selectVideoFile(page, videoPath) {
    // Tìm input file
    const fileInputSelector = 'input[type="file"]';

    await page.waitForSelector(fileInputSelector, { timeout: 10000 });

    const inputElement = await page.$(fileInputSelector);
    if (!inputElement) {
      throw new Error('Không tìm thấy input file');
    }

    // Upload file
    await inputElement.uploadFile(videoPath);
    console.log('✅ Đã chọn file video');

    await new Promise(r => setTimeout(r, 3000));
  }

  /**
   * Đợi video được xử lý (upload hoàn tất)
   * Cần đợi cả upload VÀ processing hoàn tất
   */
  async waitForVideoProcessing(page) {
    const maxWait = 600000; // 10 phút (tăng lên vì cần đợi processing)
    const startTime = Date.now();

    console.log('⏳ Đang đợi upload và xử lý video...');

    // Giai đoạn 1: Đợi upload hoàn tất (hiển thị form nhập details)
    let uploadComplete = false;
    while (Date.now() - startTime < maxWait && !uploadComplete) {
      const status = await page.evaluate(() => {
        // Kiểm tra đã có form nhập title chưa
        const titleInput = document.querySelector('#title-textarea #textbox') ||
          document.querySelector('#title-textarea') ||
          document.querySelector('[aria-label="Add a title that describes your video"]');
        if (titleInput) {
          return { stage: 'form_ready' };
        }

        // Tìm progress upload
        const progressEl = document.querySelector('.progress-label') ||
          document.querySelector('[class*="progress"]') ||
          document.querySelector('ytcp-video-upload-progress');
        if (progressEl) {
          return { stage: 'uploading', text: progressEl.textContent.trim() };
        }

        return { stage: 'waiting' };
      });

      console.log(`   Upload status: ${status.stage} ${status.text || ''}`);

      if (status.stage === 'form_ready') {
        uploadComplete = true;
        console.log('✅ Upload file hoàn tất, form đã sẵn sàng');
        break;
      }

      await new Promise(r => setTimeout(r, 2000));
    }

    if (!uploadComplete) {
      throw new Error('Timeout: Upload video quá lâu');
    }

    // Giai đoạn 2: Đợi thêm một chút để form ổn định
    // YouTube cho phép nhập thông tin ngay khi upload xong, không cần đợi processing hoàn tất
    console.log('⏳ Đợi form ổn định...');
    await new Promise(r => setTimeout(r, 3000));

    console.log('✅ Sẵn sàng nhập thông tin video');
  }

  /**
   * Nhập thông tin video (title, description, tags)
   */
  async fillVideoDetails(page, { title, description, tags }) {
    console.log('📝 Bắt đầu nhập thông tin video...');
    await new Promise(r => setTimeout(r, 3000));

    // ========== BƯỚC 1: NHẬP TITLE ==========
    // YouTube giới hạn title tối đa 100 ký tự
    let finalTitle = title || 'Untitled';
    if (finalTitle.length > 100) {
      finalTitle = finalTitle.substring(0, 97) + '...';
      console.log(`⚠️ Title quá dài (${title.length} ký tự), đã cắt còn 100 ký tự`);
    }
    console.log('📝 Đang nhập title...');

    // Tìm title textbox bằng Puppeteer
    let titleTextbox = await page.$('#title-textarea #textbox');
    if (!titleTextbox) {
      titleTextbox = await page.$('ytcp-social-suggestions-textbox #textbox');
    }
    if (!titleTextbox) {
      const textboxes = await page.$$('div#textbox[contenteditable="true"]');
      if (textboxes.length > 0) {
        titleTextbox = textboxes[0];
      }
    }

    if (titleTextbox) {
      // PHƯƠNG PHÁP: Triple-click để select all -> Delete -> Type new text
      // Triple-click là cách tự nhiên nhất để select all text trong contenteditable

      // Bước 1: Click vào textbox để focus
      await titleTextbox.click();
      await new Promise(r => setTimeout(r, 300));

      // Bước 2: Triple-click để select all text
      await titleTextbox.click({ clickCount: 3 });
      await new Promise(r => setTimeout(r, 300));

      // Bước 3: Nhấn Delete/Backspace để xóa text đã select
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 300));

      // Bước 4: Kiểm tra đã xóa chưa, nếu chưa thì thử Ctrl+A
      const afterDelete = await page.evaluate(el => el.textContent, titleTextbox);
      if (afterDelete && afterDelete.length > 0) {
        await titleTextbox.click();
        await new Promise(r => setTimeout(r, 200));

        // Select all bằng keyboard shortcut
        const isMac = process.platform === 'darwin';
        await page.keyboard.down(isMac ? 'Meta' : 'Control');
        await page.keyboard.press('a');
        await page.keyboard.up(isMac ? 'Meta' : 'Control');
        await new Promise(r => setTimeout(r, 200));

        await page.keyboard.press('Backspace');
        await new Promise(r => setTimeout(r, 300));
      }

      // Bước 5: Type title mới
      await page.keyboard.type(finalTitle, { delay: 30 });

      console.log(`✅ Đã nhập title: "${finalTitle}"`);
    } else {
      console.log('⚠️ Không tìm thấy title textbox');
    }

    await new Promise(r => setTimeout(r, 1000));

    // ========== BƯỚC 2: NHẬP DESCRIPTION ==========
    if (description) {
      console.log('📝 Đang nhập description...');

      // Click vào description để focus
      const descTextbox = await page.$('#description-textarea #textbox');
      if (descTextbox) {
        // Click 2 lần để chắc chắn focus
        await descTextbox.click();
        await new Promise(r => setTimeout(r, 300));
        await descTextbox.click();
        await new Promise(r => setTimeout(r, 500));

        // Gõ description
        await page.keyboard.type(description, { delay: 30 });
        console.log(`✅ Đã nhập description`);
      } else {
        console.log('⚠️ Không tìm thấy description textbox, thử selector khác...');

        // Thử click bằng evaluate
        const clicked = await page.evaluate(() => {
          const descArea = document.querySelector('#description-textarea');
          const textbox = descArea?.querySelector('#textbox');
          if (textbox) {
            textbox.click();
            textbox.focus();
            return true;
          }
          return false;
        });

        if (clicked) {
          await new Promise(r => setTimeout(r, 500));
          await page.keyboard.type(description, { delay: 30 });
          console.log(`✅ Đã nhập description (fallback)`);
        }
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    // ========== BƯỚC 3: SCROLL XUỐNG VÀ CHỌN "NOT MADE FOR KIDS" ==========
    console.log('🔍 Đang tìm phần Audience...');

    // Tìm container scrollable trong dialog và scroll xuống
    await page.evaluate(() => {
      // Tìm các container có thể scroll trong upload dialog
      const scrollContainers = [
        document.querySelector('ytcp-uploads-dialog #scrollable-content'),
        document.querySelector('ytcp-uploads-dialog .scrollable-content'),
        document.querySelector('#details ytcp-mention-textbox'),
        document.querySelector('ytcp-video-metadata-editor-basics'),
        document.querySelector('#scrollable-content')
      ];

      for (const container of scrollContainers) {
        if (container && container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight;
          console.log('Scrolled container:', container.tagName, container.id || container.className);
          return;
        }
      }

      // Fallback: scroll bằng cách tìm Audience section và scrollIntoView
      const audienceEl = document.querySelector('ytcp-video-metadata-audience');
      if (audienceEl) {
        audienceEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Đợi và tìm Audience section
    let audienceFound = false;
    try {
      await page.waitForSelector('ytcp-video-metadata-audience', { timeout: 10000 });
      audienceFound = true;
      console.log('   ✅ Tìm thấy Audience section');
    } catch (e) {
      console.log('   ⚠️ Không tìm thấy Audience section selector');
    }

    // Scroll thêm để hiện radio buttons
    await page.evaluate(() => {
      const audienceSection = document.querySelector('ytcp-video-metadata-audience');
      if (audienceSection) {
        // Scroll Audience section vào view
        audienceSection.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Tìm và click "No, it's not made for kids"
    let notForKidsClicked = false;

    // Phương pháp 1: Tìm radio button bằng attribute name
    console.log('   Phương pháp 1: Tìm bằng name attribute...');
    const audienceRadio = await page.$('tp-yt-paper-radio-button[name="NOT_MADE_FOR_KIDS"]');
    if (audienceRadio) {
      await audienceRadio.scrollIntoViewIfNeeded();
      await new Promise(r => setTimeout(r, 500));
      await audienceRadio.click();
      notForKidsClicked = true;
      console.log('   ✅ Clicked NOT_MADE_FOR_KIDS radio (method 1)');
    }

    // Phương pháp 2: Click radio thứ 2 trong Audience section
    if (!notForKidsClicked) {
      console.log('   Phương pháp 2: Click radio thứ 2...');
      notForKidsClicked = await page.evaluate(() => {
        const audienceSection = document.querySelector('ytcp-video-metadata-audience');
        if (audienceSection) {
          const radios = audienceSection.querySelectorAll('tp-yt-paper-radio-button');
          console.log('Found', radios.length, 'radios');
          if (radios.length >= 2) {
            radios[1].scrollIntoView({ block: 'center' });
            radios[1].click();
            return true;
          }
        }
        return false;
      });
      if (notForKidsClicked) {
        console.log('   ✅ Clicked radio thứ 2 (method 2)');
      }
    }

    // Phương pháp 3: Tìm bằng text content
    if (!notForKidsClicked) {
      console.log('   Phương pháp 3: Tìm bằng text...');
      notForKidsClicked = await page.evaluate(() => {
        const allRadios = document.querySelectorAll('tp-yt-paper-radio-button');
        for (const radio of allRadios) {
          const text = radio.textContent.toLowerCase();
          if (text.includes('no, it') || text.includes('not made for kids') || text.includes('không phải')) {
            radio.scrollIntoView({ block: 'center' });
            radio.click();
            return true;
          }
        }
        return false;
      });
      if (notForKidsClicked) {
        console.log('   ✅ Clicked bằng text match (method 3)');
      }
    }

    // Phương pháp 4: Click bằng tọa độ
    if (!notForKidsClicked) {
      console.log('   Phương pháp 4: Click bằng mouse coordinate...');
      const radioGroup = await page.$('ytcp-video-metadata-audience tp-yt-paper-radio-group');
      if (radioGroup) {
        const box = await radioGroup.boundingBox();
        if (box) {
          // Radio thứ 2 thường nằm ở dưới, cách radio 1 khoảng 40-50px
          await page.mouse.click(box.x + 20, box.y + 50);
          await new Promise(r => setTimeout(r, 500));
          notForKidsClicked = true;
          console.log('   ✅ Clicked bằng mouse (method 4)');
        }
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    if (notForKidsClicked) {
      console.log('✅ Đã chọn "Not made for kids"');
    } else {
      console.log('⚠️ Không tìm thấy option "Not made for kids"');
    }

    await new Promise(r => setTimeout(r, 2000));
    console.log('✅ Hoàn tất nhập thông tin video');
  }

  /**
   * Thiết lập visibility (public, unlisted, private) và schedule (nếu có)
   * @param {Page} page - Puppeteer page
   * @param {string} visibility - public, unlisted, private
   * @param {string|null} scheduleDate - ISO date string (VD: '2024-01-15T10:00:00')
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setVisibility(page, visibility, scheduleDate = null) {
    try {
      console.log('🔄 Đang chuyển đến trang Visibility...');

      // Click NEXT để qua các bước: Details -> Video elements -> Checks -> Visibility
      // Cần click 3 lần Next
      const stepNames = ['Details -> Video elements', 'Video elements -> Checks', 'Checks -> Visibility'];

      for (let i = 0; i < 3; i++) {
        console.log(`\n   📍 Step ${i + 1}/3: ${stepNames[i]}`);
        await new Promise(r => setTimeout(r, 2000));

      // Nếu đang ở step Checks (i === 1), đợi checks hoàn tất
      if (i === 1) {
        console.log('   ⏳ Đang ở step Checks, đợi kiểm tra hoàn tất...');

        // Đợi tối đa 5 phút cho checks hoàn tất (video dài cần nhiều thời gian)
        const maxWaitChecks = 300000; // 5 phút
        const startChecks = Date.now();

        while (Date.now() - startChecks < maxWaitChecks) {
          const checksStatus = await page.evaluate(() => {
            // Kiểm tra trạng thái checks
            const checksSection = document.querySelector('ytcp-video-metadata-checks');
            const progressBar = document.querySelector('ytcp-video-metadata-checks tp-yt-paper-progress');
            const checksComplete = document.querySelector('.checks-complete');
            const checksRunning = document.querySelector('.checks-running');

            // Kiểm tra text hiển thị từ toàn bộ trang
            const pageText = document.body.innerText;
            const checksText = checksSection ? checksSection.textContent : '';

            // ========== KIỂM TRA CÁC LỖI CỤ THỂ ==========
            const errorMessages = [];

            // Chỉ kiểm tra lỗi thực sự - những text này chỉ xuất hiện khi có lỗi
            if (pageText.includes('Processing abandoned')) {
              errorMessages.push('Processing abandoned');
            }
            if (pageText.includes('Video is too long')) {
              errorMessages.push('Video is too long');
            }
            // Copyright claim - chỉ khi có thông báo claim cụ thể
            if (pageText.includes('Includes copyrighted content') ||
              pageText.includes('Copyright claim on your video') ||
              pageText.includes('Copyright-protected content found')) {
              errorMessages.push('Copyright claim detected');
            }
            if (pageText.includes('Upload failed') || pageText.includes('Tải lên thất bại')) {
              errorMessages.push('Upload failed');
            }
            // Video rejected - chỉ khi có thông báo reject cụ thể (không phải text hướng dẫn)
            if (pageText.includes('Video has been rejected') || pageText.includes('violates our Community Guidelines')) {
              errorMessages.push('Video rejected - violates Community Guidelines');
            }
            // Invalid file - chỉ khi có thông báo lỗi file cụ thể
            if (pageText.includes('Invalid file format') || pageText.includes('File type not supported')) {
              errorMessages.push('Invalid file format');
            }
            if (pageText.includes('daily upload limit') || pageText.includes('reached your daily limit')) {
              errorMessages.push('Daily upload limit reached');
            }

            // Kiểm tra nút Next có disabled không
            const nextBtn = document.querySelector('#next-button');
            const nextDisabled = nextBtn ? nextBtn.hasAttribute('disabled') : true;

            return {
              hasChecksSection: !!checksSection,
              hasProgressBar: !!progressBar,
              checksComplete: !!checksComplete,
              checksRunning: !!checksRunning,
              checksText: checksText.substring(0, 300),
              nextDisabled: nextDisabled,
              hasError: errorMessages.length > 0,
              errorMessages
            };
          });

          console.log(`      Checks status: complete=${checksStatus.checksComplete}, running=${checksStatus.checksRunning}, nextDisabled=${checksStatus.nextDisabled}, hasError=${checksStatus.hasError}`);

          // Nếu có lỗi, throw error ngay lập tức
          if (checksStatus.hasError) {
            const errorMsg = checksStatus.errorMessages.join(', ');
            console.error(`❌ YouTube Error: ${errorMsg}`);
            throw new Error(`YouTube upload error: ${errorMsg}`);
          }

          // Nếu checks hoàn tất VÀ nút Next không bị disabled, tiếp tục
          if (checksStatus.checksComplete && !checksStatus.nextDisabled) {
            console.log('   ✅ Checks đã hoàn tất, có thể tiếp tục');
            break;
          }

          // Nếu không có progress bar VÀ nút Next không bị disabled, có thể tiếp tục
          if (!checksStatus.hasProgressBar && !checksStatus.nextDisabled) {
            console.log('   ✅ Không có progress bar, có thể tiếp tục');
            break;
          }

          await new Promise(r => setTimeout(r, 3000)); // Đợi 3 giây mỗi lần check
        }
      }

      // Tìm và click nút Next
      const nextClicked = await page.evaluate(() => {
        const nextSelectors = [
          '#next-button',
          'ytcp-button#next-button',
          '[aria-label="Next"]',
          '[aria-label="Tiếp theo"]',
          'ytcp-button[id="next-button"]'
        ];

        for (const selector of nextSelectors) {
          const btn = document.querySelector(selector);
          if (btn) {
            // Log trạng thái button
            const isDisabled = btn.hasAttribute('disabled') || btn.disabled;
            if (!isDisabled) {
              btn.click();
              return { clicked: true, selector, wasDisabled: false };
            } else {
              return { clicked: false, selector, wasDisabled: true, reason: 'Button is disabled' };
            }
          }
        }

        // Fallback: tìm button có text "Next"
        const buttons = document.querySelectorAll('ytcp-button, button');
        for (const btn of buttons) {
          if (btn.textContent.toLowerCase().includes('next') ||
            btn.textContent.toLowerCase().includes('tiếp')) {
            btn.click();
            return { clicked: true, selector: 'text-match' };
          }
        }

        return { clicked: false, reason: 'Button not found' };
      });

      if (nextClicked.clicked) {
        console.log(`   ✅ Click Next ${i + 1}/3 (${nextClicked.selector})`);
      } else {
        console.log(`   ⚠️ Không thể click Next ${i + 1}/3 - ${nextClicked.reason || 'Unknown'}`);
        if (nextClicked.wasDisabled) {
          console.log('      Button bị disabled, có thể do lỗi hoặc checks chưa xong');
        }
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    await new Promise(r => setTimeout(r, 2000));

    // Chọn visibility
    console.log(`🔒 Đang chọn visibility: ${visibility}...`);

    const visibilityMap = {
      'public': 'PUBLIC',
      'unlisted': 'UNLISTED',
      'private': 'PRIVATE'
    };

    const visClicked = await page.evaluate((vis) => {
      // Tìm radio button theo name
      const selectors = [
        `[name="${vis}"]`,
        `tp-yt-paper-radio-button[name="${vis}"]`,
        `#${vis.toLowerCase()}-radio-button`
      ];

      for (const selector of selectors) {
        const radio = document.querySelector(selector);
        if (radio) {
          radio.click();
          return true;
        }
      }

      // Tìm theo text
      const radios = document.querySelectorAll('tp-yt-paper-radio-button');
      for (const radio of radios) {
        const text = radio.textContent.toLowerCase();
        if ((vis === 'PUBLIC' && text.includes('public')) ||
          (vis === 'UNLISTED' && text.includes('unlisted')) ||
          (vis === 'PRIVATE' && text.includes('private'))) {
          radio.click();
          return true;
        }
      }

      return false;
    }, visibilityMap[visibility] || 'PUBLIC');

      if (visClicked) {
        console.log(`✅ Đã chọn visibility: ${visibility}`);
      } else {
        console.log(`⚠️ Không tìm thấy option visibility: ${visibility}`);
        // Take screenshot for debugging
        const screenshotPath = path.join(__dirname, '../../uploads', `visibility-error-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Đã chụp screenshot: ${screenshotPath}`);
        return { success: false, error: `Không tìm thấy option visibility: ${visibility}` };
      }

      await new Promise(r => setTimeout(r, 1000));

      // Nếu có scheduleDate, click vào Schedule section và điền thông tin
      if (scheduleDate) {
        console.log(`📅 Đang thiết lập schedule: ${scheduleDate}...`);
        const scheduleSuccess = await this.setScheduleDateTime(page, scheduleDate);
        
        if (!scheduleSuccess) {
          // Take screenshot for debugging
          const screenshotPath = path.join(__dirname, '../../uploads', `schedule-error-${Date.now()}.png`);
          await page.screenshot({ path: screenshotPath });
          console.log(`📸 Đã chụp screenshot: ${screenshotPath}`);
          return { success: false, error: 'Không thể thiết lập schedule date/time' };
        }
      }
      
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Lỗi setVisibility: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Thiết lập ngày giờ schedule cho video
   * @param {Page} page - Puppeteer page
   * @param {string} scheduleDate - ISO date string (VD: '2024-01-15T10:00:00')
   * @returns {Promise<boolean>} - true if schedule was set successfully, false otherwise
   */
  async setScheduleDateTime(page, scheduleDate) {
    // Parse date từ ISO string
    const date = new Date(scheduleDate);

    const day = date.getDate();
    const month = date.getMonth(); // 0-indexed
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Format các thành phần để log
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month];
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

    console.log(`   📅 Target Date: ${monthName} ${day}, ${year}`);
    console.log(`   ⏰ Target Time: ${timeStr}`);

    // 1. Click vào Schedule section để expand (đây là collapsible section, không phải radio)
    console.log('   🔍 Đang tìm và click Schedule section để expand...');

    const scheduleExpanded = await page.evaluate(() => {
      // Tìm Schedule section - đây là một expandable section với icon mũi tên
      // Có text "Schedule" và "Select a date to make your video public"

      // Cách 1: Tìm theo class/structure của expandable section
      const expandableSections = document.querySelectorAll('[class*="expand"], [class*="collapsible"], ytcp-video-metadata-schedule');
      for (const section of expandableSections) {
        const text = section.textContent.toLowerCase();
        if (text.includes('schedule') && text.includes('select a date')) {
          // Click vào header của section để expand
          const header = section.querySelector('[class*="header"], [class*="trigger"], [role="button"]');
          if (header) {
            header.click();
            return { success: true, method: 'expandable-header' };
          }
          // Hoặc click vào chính section
          section.click();
          return { success: true, method: 'section-click' };
        }
      }

      // Cách 2: Tìm div chứa text "Schedule" và có icon expand (mũi tên xuống)
      const allDivs = document.querySelectorAll('div');
      for (const div of allDivs) {
        // Chỉ check direct text, không check children
        const directText = Array.from(div.childNodes)
          .filter(node => node.nodeType === Node.TEXT_NODE)
          .map(node => node.textContent)
          .join('').toLowerCase();

        if (directText.includes('schedule') || div.textContent.trim().toLowerCase().startsWith('schedule')) {
          // Kiểm tra có phải là clickable element không
          const isClickable = div.closest('[role="button"]') ||
            div.closest('ytcp-button') ||
            div.closest('[class*="clickable"]') ||
            div.closest('[class*="expand"]');

          if (isClickable) {
            isClickable.click();
            return { success: true, method: 'text-search-clickable' };
          }

          // Tìm parent có thể click
          let parent = div.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            if (parent.onclick || parent.getAttribute('role') === 'button' ||
              parent.classList.contains('clickable') || parent.tagName === 'BUTTON') {
              parent.click();
              return { success: true, method: 'parent-click' };
            }
            parent = parent.parentElement;
          }
        }
      }

      // Cách 3: Tìm ytcp-button hoặc element có aria-expanded
      const expandButtons = document.querySelectorAll('[aria-expanded], ytcp-icon-button, tp-yt-iron-icon');
      for (const btn of expandButtons) {
        const parent = btn.closest('div');
        if (parent && parent.textContent.toLowerCase().includes('schedule')) {
          btn.click();
          return { success: true, method: 'expand-button' };
        }
      }

      // Cách 4: Click trực tiếp vào text "Schedule" section
      const scheduleTexts = document.querySelectorAll('span, div, p');
      for (const el of scheduleTexts) {
        if (el.textContent.trim() === 'Schedule' ||
          el.textContent.trim().toLowerCase() === 'schedule') {
          // Tìm container gần nhất có thể click
          const clickable = el.closest('[role="button"], button, [class*="header"], [class*="trigger"]') || el.parentElement;
          if (clickable) {
            clickable.click();
            return { success: true, method: 'schedule-text-click', element: el.tagName };
          }
        }
      }

      // Cách 5: Fallback - tìm và click vào icon chevron/arrow gần "Schedule"
      const icons = document.querySelectorAll('iron-icon, tp-yt-iron-icon, svg, [class*="icon"]');
      for (const icon of icons) {
        const parent = icon.closest('div');
        if (parent && parent.textContent.toLowerCase().includes('schedule') &&
          parent.textContent.toLowerCase().includes('select a date')) {
          icon.click();
          return { success: true, method: 'icon-click' };
        }
      }

      return { success: false };
    });

    console.log(`   Schedule expand result:`, scheduleExpanded);

    if (!scheduleExpanded.success) {
      console.log('   ⚠️ Không tìm thấy Schedule section để expand');
      
      // Không dùng XPath nữa, thử click bằng evaluate một lần nữa với selector rộng hơn
      const retryExpand = await page.evaluate(() => {
        // Tìm tất cả elements chứa text "Schedule"
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const text = el.textContent;
          if (text && text.includes('Schedule') && text.includes('Select a date')) {
            // Click vào element này hoặc parent của nó
            el.click();
            return true;
          }
        }
        return false;
      });
      
      if (!retryExpand) {
        console.log('   ❌ Vẫn không expand được Schedule section');
        return false;
      }
      
      console.log('   ✅ Đã expand Schedule (retry)');
    }

    await new Promise(r => setTimeout(r, 3000));

    // 2. Bây giờ tìm và click vào Date Picker (sau khi Schedule đã expand)
    console.log('   📅 Đang tìm Date Picker...');

    const datePickerOpened = await page.evaluate(() => {
      // Sau khi expand, sẽ có date picker và time picker hiện ra
      // Tìm dropdown/input cho date

      // Cách 1: Tìm theo ID phổ biến
      const dateSelectors = [
        '#datepicker-trigger',
        'ytcp-text-dropdown-trigger#datepicker-trigger',
        '[aria-label*="date" i]',
        '[aria-label*="Date"]',
        'ytcp-date-picker',
        '[class*="datepicker"]',
        '[class*="date-picker"]'
      ];

      for (const sel of dateSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          return { success: true, selector: sel };
        }
      }

      // Cách 2: Tìm trong schedule section đã expand
      const scheduleContent = document.querySelector('ytcp-video-metadata-schedule, [class*="schedule"]');
      if (scheduleContent) {
        // Tìm dropdown đầu tiên (thường là date)
        const dropdown = scheduleContent.querySelector('ytcp-text-dropdown-trigger, ytcp-dropdown-trigger, [role="listbox"]');
        if (dropdown) {
          dropdown.click();
          return { success: true, selector: 'schedule-dropdown' };
        }

        // Tìm input hoặc button có liên quan đến date
        const dateEl = scheduleContent.querySelector('[class*="date"], input[type="date"], button');
        if (dateEl) {
          dateEl.click();
          return { success: true, selector: 'schedule-date-element' };
        }
      }

      // Cách 3: Tìm theo text hiển thị ngày (VD: "Jan 25, 2025")
      const allElements = document.querySelectorAll('ytcp-text-dropdown-trigger, [role="button"], button');
      for (const el of allElements) {
        const text = el.textContent;
        // Kiểm tra có phải format ngày không (VD: "Jan 25, 2025" hoặc "25/01/2025")
        if (text && (text.match(/[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}/) || text.match(/\d{1,2}\/\d{1,2}\/\d{4}/))) {
          el.click();
          return { success: true, selector: 'date-text-match', text: text.trim() };
        }
      }

      return { success: false };
    });

    console.log(`   Date picker result:`, datePickerOpened);

    if (!datePickerOpened.success) {
      console.log('   ❌ Không mở được Date Picker');
      return false;
    }

    await new Promise(r => setTimeout(r, 2000));

    // 3. Navigate tới đúng tháng/năm
    console.log(`   🔄 Đang navigate tới tháng ${monthName} ${year}...`);

    const maxMonthNavigate = 12;
    for (let i = 0; i < maxMonthNavigate; i++) {
      const calendarInfo = await page.evaluate(() => {
        // Tìm header hiển thị tháng/năm hiện tại trong calendar popup
        const popup = document.querySelector('tp-yt-iron-dropdown[aria-hidden="false"], [class*="dropdown"][style*="display"], ytcp-date-picker');

        let headerText = '';
        if (popup) {
          const header = popup.querySelector('[class*="header"], [class*="month"], iron-label, #label');
          if (header) {
            headerText = header.textContent.trim();
          }
        }

        // Fallback: tìm trong toàn bộ page
        if (!headerText) {
          const headers = document.querySelectorAll('ytcp-date-picker *, [class*="calendar"] *');
          for (const h of headers) {
            const text = h.textContent.trim();
            if (text.match(/[A-Za-z]{3,}\s+\d{4}/)) {
              headerText = text;
              break;
            }
          }
        }

        return { headerText };
      });

      console.log(`      Calendar header: "${calendarInfo.headerText}"`);

      // Kiểm tra xem đã đúng tháng chưa
      const isCorrectMonth = calendarInfo.headerText.includes(monthName) &&
        calendarInfo.headerText.includes(String(year));

      if (isCorrectMonth) {
        console.log(`      ✅ Đã đến đúng tháng: ${monthName} ${year}`);
        break;
      }

      // Click nút Next Month
      const nextMonthClicked = await page.evaluate(() => {
        const nextSelectors = [
          '#next-month',
          'ytcp-date-picker #next-month',
          '[aria-label*="Next" i]',
          '[aria-label*="next" i]',
          'tp-yt-paper-icon-button:last-of-type',
          '[class*="next"]',
          'iron-icon[icon*="chevron-right"]',
          'iron-icon[icon*="arrow-forward"]'
        ];

        for (const sel of nextSelectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.click();
            return { success: true, selector: sel };
          }
        }

        // Fallback: tìm icon button bên phải trong calendar
        const iconBtns = document.querySelectorAll('ytcp-date-picker tp-yt-paper-icon-button, [class*="calendar"] button');
        if (iconBtns.length >= 2) {
          iconBtns[iconBtns.length - 1].click();
          return { success: true, selector: 'last-icon-button' };
        }

        return { success: false };
      });

      if (!nextMonthClicked.success) {
        console.log('      ⚠️ Không tìm thấy nút Next Month');
        break;
      }

      await new Promise(r => setTimeout(r, 500));
    }

    await new Promise(r => setTimeout(r, 1000));

    // 4. Chọn ngày
    console.log(`   📅 Đang chọn ngày ${day}...`);

    const dayClicked = await page.evaluate((targetDay) => {
      // Tìm trong calendar popup
      const popup = document.querySelector('tp-yt-iron-dropdown[aria-hidden="false"], ytcp-date-picker, [class*="calendar"]');

      const daySelectors = [
        '.day:not(.disabled):not(.not-in-month)',
        'tp-yt-paper-button.day',
        '[role="gridcell"]',
        '[class*="calendar-day"]',
        'button[class*="day"]'
      ];

      // Tìm trong popup
      if (popup) {
        for (const sel of daySelectors) {
          const days = popup.querySelectorAll(sel);
          for (const d of days) {
            const text = d.textContent.trim();
            if (text === String(targetDay) && !d.classList.contains('not-in-month') && !d.classList.contains('disabled')) {
              d.click();
              return { success: true, selector: sel + '-popup', dayText: text };
            }
          }
        }
      }

      // Fallback: tìm trong toàn bộ page
      for (const sel of daySelectors) {
        const days = document.querySelectorAll(sel);
        for (const d of days) {
          const text = d.textContent.trim();
          if (text === String(targetDay) && !d.classList.contains('not-in-month') && !d.classList.contains('disabled')) {
            d.click();
            return { success: true, selector: sel, dayText: text };
          }
        }
      }

      // Fallback cuối: tìm element chứa số ngày
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.children.length === 0 && el.textContent.trim() === String(targetDay)) {
          const parent = el.closest('[role="button"], button, .day, [class*="day"]');
          if (parent && !parent.classList.contains('disabled') && !parent.classList.contains('not-in-month')) {
            parent.click();
            return { success: true, selector: 'leaf-element', dayText: el.textContent };
          }
        }
      }

      return { success: false };
    }, day);

    console.log(`   Day click result:`, dayClicked);

    if (dayClicked.success) {
      console.log(`      ✅ Đã chọn ngày: ${day}`);
    } else {
      console.log(`      ❌ Không chọn được ngày: ${day}`);
      return false;
    }

    await new Promise(r => setTimeout(r, 2000));

    // 5. Thiết lập giờ - NHẬP BẰNG KEYBOARD
    console.log(`   ⏰ Đang thiết lập giờ: ${timeStr}...`);

    // BƯỚC 1: Đợi time input xuất hiện sau khi chọn date (DOM có thể bị re-render)
    console.log(`      ⏳ Đang đợi time input xuất hiện...`);
    
    let timeInputFound = false;
    const maxWaitTimeInput = 10000; // 10 giây
    const startWaitTime = Date.now();
    
    while (Date.now() - startWaitTime < maxWaitTimeInput && !timeInputFound) {
      timeInputFound = await page.evaluate(() => {
        // Không tìm trong scheduleSection nữa vì có thể đã đóng
        // Tìm trực tiếp trong toàn bộ page
        
        // Tìm input có class tp-yt-paper-input
        const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
        if (paperInputs.length >= 2) return true;
        
        // Hoặc tìm trong visibility page (đang ở step cuối)
        const visibilitySection = document.querySelector('ytcp-video-metadata-visibility, ytcp-video-metadata-planner');
        if (visibilitySection) {
          const inputs = visibilitySection.querySelectorAll('input[autocomplete="off"]');
          if (inputs.length >= 2) return true;
        }
        
        // Tìm tp-yt-iron-input
        const ironInputs = document.querySelectorAll('tp-yt-iron-input input[autocomplete="off"]');
        if (ironInputs.length >= 2) return true;
        
        return false;
      });
      
      if (!timeInputFound) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    if (!timeInputFound) {
      console.log(`      ❌ Timeout: Không tìm thấy time input sau 10 giây`);
      return false;
    } else {
      console.log(`      ✅ Time input đã xuất hiện`);
    }
    
    await new Promise(r => setTimeout(r, 1000));

    // BƯỚC 2: Click vào time input để focus
    console.log(`      🖱️  Click vào time input...`);
    const timeInputClicked = await page.evaluate(() => {
      // KHÔNG TÌM TRONG SCHEDULE SECTION NỮA - Tìm trong toàn bộ page
      // Vì sau khi chọn date, schedule section có thể đã collapse/đóng lại
      
      let timeInput = null;
      
      // Cách 1: Tìm tp-yt-iron-input#input-1 (theo HTML: <tp-yt-iron-input id="input-1">)
      // Có thể có 2 cái: 1 cho date, 1 cho time
      const ironInputsWithId = document.querySelectorAll('tp-yt-iron-input#input-1');
      if (ironInputsWithId.length >= 2) {
        // Iron input thứ 2 là time input
        timeInput = ironInputsWithId[1].querySelector('input.tp-yt-paper-input[autocomplete="off"]');
        console.log('Found via method 1: tp-yt-iron-input#input-1 (index 1)');
      } else if (ironInputsWithId.length === 1) {
        // Nếu chỉ có 1, kiểm tra xem có phải time input không (value có dạng giờ)
        const inp = ironInputsWithId[0].querySelector('input[autocomplete="off"]');
        const value = inp?.value || '';
        if (value.match(/\d{1,2}:\d{2}\s*(AM|PM)?/i)) {
          timeInput = inp;
          console.log('Found via method 1b: tp-yt-iron-input#input-1 (time pattern match)');
        }
      }
      
      // Cách 2: Tìm input có class 'tp-yt-paper-input' trong tp-yt-iron-input
      if (!timeInput) {
        const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
        if (paperInputs.length >= 2) {
          // Input thứ 2 là time input (thứ 1 là date)
          timeInput = paperInputs[1];
          console.log('Found via method 2: input.tp-yt-paper-input (index 1)');
        }
      }
      
      // Cách 3: Tìm trong visibility section (đang ở step Visibility)
      if (!timeInput) {
        const visibilitySection = document.querySelector('ytcp-video-metadata-visibility, ytcp-video-metadata-planner');
        if (visibilitySection) {
          const ironInputs = visibilitySection.querySelectorAll('tp-yt-iron-input#input-1');
          if (ironInputs.length >= 2) {
            timeInput = ironInputs[1].querySelector('input[autocomplete="off"]');
            console.log('Found via method 3: visibility section tp-yt-iron-input#input-1 (index 1)');
          }
        }
      }
      
      // Cách 4: Tìm trong tp-yt-paper-input container
      if (!timeInput) {
        const paperInputContainers = document.querySelectorAll('tp-yt-paper-input');
        if (paperInputContainers.length >= 2) {
          timeInput = paperInputContainers[1].querySelector('input[autocomplete="off"]');
          console.log('Found via method 4: tp-yt-paper-input container (index 1)');
        }
      }
      
      // Cách 5: Tìm tất cả tp-yt-iron-input (không giới hạn id)
      if (!timeInput) {
        const ironInputs = document.querySelectorAll('tp-yt-iron-input');
        if (ironInputs.length >= 2) {
          timeInput = ironInputs[1].querySelector('input[autocomplete="off"]');
          console.log('Found via method 5: tp-yt-iron-input (index 1)');
        }
      }
      
      // Cách 6: Tìm tất cả inputs trong visible area
      if (!timeInput) {
        const allInputs = document.querySelectorAll('input[autocomplete="off"]:not([style*="display: none"])');
        if (allInputs.length >= 2) {
          // Lọc bỏ input ẩn
          const visibleInputs = Array.from(allInputs).filter(inp => {
            const rect = inp.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          if (visibleInputs.length >= 2) {
            timeInput = visibleInputs[1];
            console.log('Found via method 6: visible inputs (index 1)');
          }
        }
      }
      
      // Cách 7: Tìm input có placeholder về time hoặc value là giờ
      if (!timeInput) {
        const allInputs = document.querySelectorAll('input[autocomplete="off"]');
        for (const input of allInputs) {
          const placeholder = input.placeholder || '';
          const value = input.value || '';
          const ariaLabel = input.getAttribute('aria-label') || '';
          
          // Check xem có phải time input không (có format giờ: "5:54 PM", "17:54", etc.)
          if (placeholder.toLowerCase().includes('time') ||
              ariaLabel.toLowerCase().includes('time') ||
              value.match(/\d{1,2}:\d{2}\s*(AM|PM)?/i)) {
            timeInput = input;
            console.log('Found via method 7: time pattern match');
            break;
          }
        }
      }
      
      if (timeInput) {
        // Log thông tin để debug
        console.log('Found time input:', {
          className: timeInput.className,
          id: timeInput.id,
          tagName: timeInput.tagName,
          parentTagName: timeInput.parentElement?.tagName,
          value: timeInput.value,
          placeholder: timeInput.placeholder
        });
        
        // Scroll vào view trước
        timeInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
        
        // Focus và click vào input
        timeInput.focus();
        timeInput.click();
        
        return { 
          success: true, 
          value: timeInput.value,
          placeholder: timeInput.placeholder,
          id: timeInput.id,
          className: timeInput.className
        };
      }

      // Debug info
      const paperInputCount = document.querySelectorAll('input.tp-yt-paper-input').length;
      const allInputCount = document.querySelectorAll('input[autocomplete="off"]').length;
      const visibleInputCount = Array.from(document.querySelectorAll('input[autocomplete="off"]')).filter(inp => {
        const rect = inp.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length;
      
      return { 
        success: false, 
        error: 'Time input not found', 
        paperInputCount,
        allInputCount,
        visibleInputCount
      };
    });

    console.log(`      Click result:`, timeInputClicked);

    if (timeInputClicked.success) {
      console.log(`      ℹ️  Input ID: "${timeInputClicked.id || 'unknown'}"`);
      console.log(`      ℹ️  Current value: "${timeInputClicked.value}"`);
      console.log(`      ℹ️  Placeholder: "${timeInputClicked.placeholder || 'none'}"`);
      console.log(`      ℹ️  Class: "${timeInputClicked.className}"`);
      await new Promise(r => setTimeout(r, 500));
      
      // BƯỚC 3: Xóa value mặc định (triple-click → select all → delete)
      console.log(`      ⌨️  Đang xóa value mặc định...`);
      
      // Thử 1: Triple-click để select all (cách tự nhiên nhất cho text input)
      await page.keyboard.press('Home'); // Di chuyển về đầu
      await new Promise(r => setTimeout(r, 200));
      
      const isMac = process.platform === 'darwin';
      
      // Select all bằng Ctrl/Cmd + A
      await page.keyboard.down(isMac ? 'Meta' : 'Control');
      await page.keyboard.press('a');
      await page.keyboard.up(isMac ? 'Meta' : 'Control');
      await new Promise(r => setTimeout(r, 300));
      
      // Xóa text đã select
      await page.keyboard.press('Backspace');
      await new Promise(r => setTimeout(r, 300));
      
      // Kiểm tra xem đã xóa hết chưa
      const afterDelete = await page.evaluate(() => {
        // Tìm lại time input để check value
        const ironInputsWithId = document.querySelectorAll('tp-yt-iron-input#input-1');
        if (ironInputsWithId.length >= 2) {
          const inp = ironInputsWithId[1].querySelector('input[autocomplete="off"]');
          return inp ? inp.value : null;
        }
        
        const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
        if (paperInputs.length >= 2) {
          return paperInputs[1].value;
        }
        
        return null;
      });
      
      console.log(`      ℹ️  Value after delete: "${afterDelete}"`);
      
      // Nếu vẫn còn text, thử xóa bằng cách khác
      if (afterDelete && afterDelete.length > 0) {
        console.log(`      ⚠️  Vẫn còn text, thử xóa bằng evaluate...`);
        await page.evaluate(() => {
          const ironInputsWithId = document.querySelectorAll('tp-yt-iron-input#input-1');
          if (ironInputsWithId.length >= 2) {
            const inp = ironInputsWithId[1].querySelector('input[autocomplete="off"]');
            if (inp) {
              inp.value = '';
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
            if (paperInputs.length >= 2) {
              paperInputs[1].value = '';
              paperInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
              paperInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        });
        await new Promise(r => setTimeout(r, 300));
      }
      
      console.log(`      ✅ Đã xóa value mặc định`);
      
      // BƯỚC 4: Gõ giờ mới
      console.log(`      ⌨️  Đang gõ giờ: ${timeStr}...`);
      await page.keyboard.type(timeStr, { delay: 100 });
      console.log(`      ✅ Đã gõ giờ: ${timeStr}`);
      
      await new Promise(r => setTimeout(r, 500));
      
      // BƯỚC 5: Nhấn Enter để confirm
      console.log(`      ⏎ Nhấn Enter...`);
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 500));
      
      // BƯỚC 6: Nhấn Tab để trigger validation và move focus
      console.log(`      ⇥ Nhấn Tab...`);
      await page.keyboard.press('Tab');
      
      console.log(`      ✅ Hoàn tất nhập giờ (Xóa → Type → Enter → Tab)`);
      console.log(`      ⏱️  Đợi 2 giây để YouTube validate...`);
      await new Promise(r => setTimeout(r, 2000));
      
      console.log('   ✅ Hoàn tất thiết lập Schedule datetime');
      return true;
      
    } else {
      console.log(`      ⚠️ Không click được time input: ${timeInputClicked.error}`);
      if (timeInputClicked.inputCount !== undefined) {
        console.log(`      ℹ️  Found ${timeInputClicked.inputCount} inputs in schedule section`);
      }
      console.log('   ❌ Thất bại thiết lập Schedule datetime');
      return false;
    }
  }

  /**
   * Schedule video và lấy URL (thay vì publish ngay)
   */
  async scheduleVideo(page) {
    // Đợi video processing
    console.log('⏳ Đang đợi video processing...');

    const maxWaitProcessing = 600000; // 10 phút
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitProcessing) {
      const status = await page.evaluate(() => {
        const processingText = document.body.innerText;

        // Kiểm tra lỗi
        const errorMessages = [];
        if (processingText.includes('Processing abandoned')) errorMessages.push('Processing abandoned');
        if (processingText.includes('Video is too long')) errorMessages.push('Video is too long');
        if (processingText.includes('Copyright claim')) errorMessages.push('Copyright claim detected');
        if (processingText.includes('Upload failed')) errorMessages.push('Upload failed');

        const doneBtn = document.querySelector('#done-button');
        const isDoneEnabled = doneBtn && !doneBtn.hasAttribute('disabled');

        return {
          hasError: errorMessages.length > 0,
          errorMessages,
          isDoneEnabled
        };
      });

      if (status.hasError) {
        const errorMsg = status.errorMessages.join(', ');
        console.error(`❌ YouTube Error: ${errorMsg}`);
        throw new Error(`YouTube upload error: ${errorMsg}`);
      }

      if (status.isDoneEnabled) {
        console.log('✅ Video sẵn sàng để schedule!');
        break;
      }

      await new Promise(r => setTimeout(r, 5000));
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click nút Schedule (thay vì Publish)
    const scheduleClicked = await page.evaluate(() => {
      const doneBtn = document.querySelector('#done-button');
      if (doneBtn && !doneBtn.hasAttribute('disabled')) {
        doneBtn.click();
        return true;
      }
      return false;
    });

    if (!scheduleClicked) {
      console.log('⚠️ Nút Schedule bị disabled, thử đợi thêm...');
      await new Promise(r => setTimeout(r, 10000));

      await page.evaluate(() => {
        const doneBtn = document.querySelector('#done-button');
        if (doneBtn) doneBtn.click();
      });
    }

    console.log('✅ Đã click Schedule');

    // Đợi dialog xác nhận schedule
    console.log('⏳ Đang đợi xác nhận schedule...');

    const maxWaitSchedule = 60000;
    const scheduleStartTime = Date.now();
    let isScheduled = false;

    while (Date.now() - scheduleStartTime < maxWaitSchedule && !isScheduled) {
      isScheduled = await page.evaluate(() => {
        const pageText = document.body.innerText;
        return pageText.includes('Video scheduled') ||
          pageText.includes('Scheduled') ||
          pageText.includes('will be published') ||
          document.querySelector('ytcp-video-share-dialog') !== null;
      });

      if (!isScheduled) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (isScheduled) {
      console.log('✅ Video đã được schedule!');
    } else {
      console.log('⚠️ Không xác nhận được trạng thái schedule');
    }

    await new Promise(r => setTimeout(r, 3000));

    // Lấy video URL
    console.log('⏳ Đang lấy video URL...');

    const maxWaitUrl = 30000;
    const urlStartTime = Date.now();
    let videoUrl = null;

    while (Date.now() - urlStartTime < maxWaitUrl && !videoUrl) {
      videoUrl = await page.evaluate(() => {
        const linkEl = document.querySelector('a.style-scope.ytcp-video-info[href*="youtu"]') ||
          document.querySelector('a[href*="youtube.com/watch"]') ||
          document.querySelector('a[href*="youtu.be"]') ||
          document.querySelector('a[href*="studio.youtube.com/video"]');

        if (linkEl) return linkEl.href;

        const textEls = document.querySelectorAll('span, div, a');
        for (const el of textEls) {
          const text = el.textContent || el.href || '';
          const match = text.match(/youtube\.com\/watch\?v=([\w-]+)|youtu\.be\/([\w-]+)|studio\.youtube\.com\/video\/([\w-]+)/);
          if (match) {
            const videoId = match[1] || match[2] || match[3];
            return `https://youtube.com/watch?v=${videoId}`;
          }
        }

        return null;
      });

      if (!videoUrl) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (videoUrl) {
      console.log(`✅ Lấy được video URL: ${videoUrl}`);
    } else {
      console.log('⚠️ Không lấy được video URL');
    }

    return videoUrl || 'Video scheduled (URL not available)';
  }

  /**
   * Publish video và lấy URL
   */
  async publishVideo(page) {
    // Đợi video processing hoàn tất trước khi publish
    console.log('⏳ Đang đợi video processing hoàn tất...');

    const maxWaitProcessing = 600000; // 10 phút
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitProcessing) {
      const status = await page.evaluate(() => {
        // Tìm các indicator của processing
        const processingText = document.body.innerText;

        // ========== KIỂM TRA LỖI TRƯỚC ==========
        const errorMessages = [];

        // Lỗi "Processing abandoned"
        if (processingText.includes('Processing abandoned')) {
          errorMessages.push('Processing abandoned');
        }

        // Lỗi "Video is too long"
        if (processingText.includes('Video is too long')) {
          errorMessages.push('Video is too long');
        }

        // Lỗi copyright - chỉ khi có thông báo claim cụ thể
        if (processingText.includes('Includes copyrighted content') || processingText.includes('Copyright claim on your video')) {
          errorMessages.push('Copyright claim detected');
        }

        // Lỗi upload failed
        if (processingText.includes('Upload failed') || processingText.includes('Tải lên thất bại')) {
          errorMessages.push('Upload failed');
        }

        // Lỗi video bị từ chối - chỉ khi có thông báo reject cụ thể
        if (processingText.includes('Video has been rejected') || processingText.includes('violates our Community Guidelines')) {
          errorMessages.push('Video rejected - violates Community Guidelines');
        }

        // Lỗi file không hợp lệ - chỉ khi có thông báo lỗi cụ thể
        if (processingText.includes('Invalid file format') || processingText.includes('File type not supported')) {
          errorMessages.push('Invalid file format');
        }

        // Lỗi daily upload limit
        if (processingText.includes('daily upload limit') || processingText.includes('reached your daily limit')) {
          errorMessages.push('Daily upload limit reached');
        }

        // ========== KIỂM TRA TRẠNG THÁI BÌNH THƯỜNG ==========
        // Kiểm tra nếu đang processing
        const isProcessing = processingText.includes('Processing') ||
          processingText.includes('Đang xử lý') ||
          processingText.includes('Uploading') ||
          processingText.includes('Đang tải lên');

        // Kiểm tra progress percentage
        const progressMatch = processingText.match(/(\d+)%\s*(processing|uploaded|xử lý|tải)/i);
        const progress = progressMatch ? parseInt(progressMatch[1]) : null;

        // Kiểm tra nếu đã hoàn tất (có thể publish)
        const doneBtn = document.querySelector('#done-button');
        const isDoneEnabled = doneBtn && !doneBtn.hasAttribute('disabled');

        // Kiểm tra text "Checks complete" hoặc video đã sẵn sàng
        const checksComplete = processingText.includes('Checks complete') ||
          processingText.includes('Kiểm tra hoàn tất');

        // Kiểm tra SD/HD processing đã xong chưa
        const sdReady = processingText.includes('SD processing complete') ||
          processingText.includes('SD') && processingText.includes('complete');

        return {
          hasError: errorMessages.length > 0,
          errorMessages,
          isProcessing,
          progress,
          isDoneEnabled,
          checksComplete,
          sdReady
        };
      });

      // ========== XỬ LÝ LỖI - DỪNG NGAY ==========
      if (status.hasError) {
        const errorMsg = status.errorMessages.join(', ');
        console.error(`❌ YouTube Error: ${errorMsg}`);
        throw new Error(`YouTube upload error: ${errorMsg}`);
      }

      // Log progress
      if (status.progress !== null) {
        console.log(`   Processing: ${status.progress}%`);
      }

      // Nếu đã processing xong (SD ready hoặc không còn processing indicator)
      if (status.sdReady || (!status.isProcessing && status.isDoneEnabled)) {
        console.log('✅ Video processing hoàn tất!');
        break;
      }

      // Nếu progress đạt 100%
      if (status.progress === 100) {
        console.log('✅ Processing đạt 100%');
        await new Promise(r => setTimeout(r, 3000)); // Đợi thêm 3s
        break;
      }

      await new Promise(r => setTimeout(r, 5000)); // Check mỗi 5 giây
    }

    await new Promise(r => setTimeout(r, 2000));

    // Click nút Publish/Save
    const publishClicked = await page.evaluate(() => {
      const publishBtn = document.querySelector('#done-button') ||
        document.querySelector('ytcp-button#done-button') ||
        document.querySelector('[aria-label="Publish"]') ||
        document.querySelector('[aria-label="Save"]');
      if (publishBtn && !publishBtn.hasAttribute('disabled')) {
        publishBtn.click();
        return true;
      }
      return false;
    });

    if (!publishClicked) {
      console.log('⚠️ Nút Publish bị disabled, thử đợi thêm...');
      await new Promise(r => setTimeout(r, 10000));

      // Thử click lại
      await page.evaluate(() => {
        const publishBtn = document.querySelector('#done-button');
        if (publishBtn) publishBtn.click();
      });
    }

    console.log('✅ Đã click Publish');

    // Đợi dialog "Video published" xuất hiện
    console.log('⏳ Đang đợi video được publish...');

    const maxWaitPublish = 120000; // 2 phút đợi publish hoàn tất
    const publishStartTime = Date.now();
    let isPublished = false;

    while (Date.now() - publishStartTime < maxWaitPublish && !isPublished) {
      isPublished = await page.evaluate(() => {
        const pageText = document.body.innerText;
        // Kiểm tra các dấu hiệu video đã publish xong
        return pageText.includes('Video published') ||
          pageText.includes('Video đã xuất bản') ||
          pageText.includes('has been published') ||
          pageText.includes('Your video is now public') ||
          pageText.includes('Video is live') ||
          document.querySelector('ytcp-video-share-dialog') !== null;
      });

      if (!isPublished) {
        console.log('   Đang publish...');
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (isPublished) {
      console.log('✅ Video đã được publish!');
    } else {
      console.log('⚠️ Không xác nhận được trạng thái publish');
    }

    // Đợi thêm 3 giây để dialog hiển thị đầy đủ
    await new Promise(r => setTimeout(r, 3000));

    // Lấy video URL
    console.log('⏳ Đang lấy video URL...');

    const maxWaitUrl = 30000; // 30 giây
    const urlStartTime = Date.now();
    let videoUrl = null;

    while (Date.now() - urlStartTime < maxWaitUrl && !videoUrl) {
      videoUrl = await page.evaluate(() => {
        // Tìm link video trong dialog hoàn tất
        const linkEl = document.querySelector('a.style-scope.ytcp-video-info[href*="youtu"]') ||
          document.querySelector('a[href*="youtube.com/watch"]') ||
          document.querySelector('a[href*="youtu.be"]') ||
          document.querySelector('a[href*="studio.youtube.com/video"]');

        if (linkEl) {
          return linkEl.href;
        }

        // Tìm trong text
        const textEls = document.querySelectorAll('span, div, a');
        for (const el of textEls) {
          const text = el.textContent || el.href || '';
          const match = text.match(/youtube\.com\/watch\?v=([\w-]+)|youtu\.be\/([\w-]+)|studio\.youtube\.com\/video\/([\w-]+)/);
          if (match) {
            const videoId = match[1] || match[2] || match[3];
            return `https://youtube.com/watch?v=${videoId}`;
          }
        }

        return null;
      });

      if (!videoUrl) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (videoUrl) {
      console.log(`✅ Lấy được video URL: ${videoUrl}`);
    } else {
      console.log('⚠️ Không lấy được video URL');
    }

    return videoUrl || 'Video uploaded (URL not available)';
  }

  /**
   * Download video và upload lên YouTube trong 1 flow
   * @param {string} email - Email account
   * @param {string} sourceUrl - URL video nguồn (TikTok, Facebook, etc.)
   * @param {object} videoDetails - Thông tin video upload
   */
  async downloadAndUpload(email, sourceUrl, videoDetails = {}) {
    const VideoDownloadService = require('./video.download.service');

    try {
      console.log(`\n${'#'.repeat(60)}`);
      console.log(`🎬 DOWNLOAD & UPLOAD FLOW`);
      console.log(`📧 Account: ${email}`);
      console.log(`🔗 Source: ${sourceUrl}`);
      console.log(`${'#'.repeat(60)}\n`);

      // Bước 1: Download video với email-specific folder
      console.log('\n📥 BƯỚC 1: TẢI VIDEO...\n');

      // Tạo instance mới với email để lưu vào folder riêng
      const videoDownloadService = new VideoDownloadService(email);
      const downloadResult = await videoDownloadService.downloadVideo(sourceUrl);

      if (!downloadResult.success) {
        throw new Error(`Download failed: ${downloadResult.message}`);
      }

      const videoPath = downloadResult.data.filePath;

      // Sử dụng title/description từ download result làm default
      const defaultTitle = videoDetails.title || downloadResult.data.title || 'Untitled';
      const defaultDescription = videoDetails.description || downloadResult.data.description || '';

      console.log(`\n📝 Thông tin video:`);
      console.log(`   Title: ${defaultTitle}`);
      console.log(`   Description: ${defaultDescription.substring(0, 50)}${defaultDescription.length > 50 ? '...' : ''}`);

      // Đợi 5 giây để browser từ download service đóng hoàn toàn
      console.log('\n⏳ Đợi 5 giây trước khi upload...\n');
      await new Promise(r => setTimeout(r, 5000));

      // Bước 2: Upload lên YouTube
      console.log('\n📤 BƯỚC 2: UPLOAD LÊN YOUTUBE...\n');
      const uploadResult = await this.uploadVideo(email, videoPath, {
        title: defaultTitle,
        description: defaultDescription,
        visibility: videoDetails.visibility,
        tags: videoDetails.tags,
        scheduleDate: videoDetails.scheduleDate
      });

      if (uploadResult.success && uploadResult.data?.videoUrl) {
        // Lưu vào database
        const account = await AccountYoutube.findOne({ where: { email } });
        if (account) {
          await UploadedVideo.create({
            account_youtube_id: account.id,
            email: email,
            video_url: uploadResult.data.videoUrl,
            title: defaultTitle,
            source_url: sourceUrl
          });
          console.log('✅ Đã lưu video URL vào database');
        }

        // Xóa file video đã tải về sau khi upload thành công
        console.log('\n🗑️  BƯỚC 3: XÓA FILE ĐÃ TẢI...\n');
        const deleted = videoDownloadService.deleteDownloadedFile(videoPath);
        if (deleted) {
          console.log('✅ Đã xóa file video khỏi ổ cứng');
        }
      }

      return {
        success: uploadResult.success,
        message: uploadResult.success ? 'Download và upload thành công' : uploadResult.message,
        data: {
          download: downloadResult.data,
          upload: uploadResult.data
        }
      };

    } catch (error) {
      console.error(`\n❌ LỖI: ${error.message}`);
      return {
        success: false,
        message: error.message,
        error: error.message
      };
    }
  }
}

module.exports = new YoutubeUploadService();
