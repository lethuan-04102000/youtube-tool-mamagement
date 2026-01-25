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

      // Khởi tạo browser với retry
      browser = await browserService.launchBrowser(false);
      await new Promise(r => setTimeout(r, 1000));
      page = await browserService.createPage(browser);

      // Đăng nhập Google
      await googleAuthService.login(page, email, account.password);

      // Truy cập YouTube Studio
      console.log('🎬 Đang truy cập YouTube Studio...');
      await page.goto('https://studio.youtube.com', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      await new Promise(r => setTimeout(r, 3000));

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
      await this.setVisibility(page, visibility, scheduleDate);

      // Publish hoặc Schedule video
      let videoUrl;
      if (scheduleDate) {
        console.log(`📅 Đang schedule video cho: ${scheduleDate}...`);
        videoUrl = await this.scheduleVideo(page);
        console.log(`\n${'='.repeat(50)}`);
        console.log(`✅ SCHEDULE VIDEO THÀNH CÔNG!`);
        console.log(`📅 Scheduled: ${scheduleDate}`);
        console.log(`🔗 URL: ${videoUrl}`);
        console.log(`${'='.repeat(50)}\n`);
      } else {
        console.log('🚀 Đang publish video...');
        videoUrl = await this.publishVideo(page);
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
   */
  async setVisibility(page, visibility, scheduleDate = null) {
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
    }

    await new Promise(r => setTimeout(r, 1000));

    // Nếu có scheduleDate, click vào Schedule section và điền thông tin
    if (scheduleDate) {
      console.log(`📅 Đang thiết lập schedule: ${scheduleDate}...`);
      await this.setScheduleDateTime(page, scheduleDate);
    }
  }

  /**
   * Thiết lập ngày giờ schedule cho video
   * @param {Page} page - Puppeteer page
   * @param {string} scheduleDate - ISO date string (VD: '2024-01-15T10:00:00')
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

      // Thử click bằng Puppeteer với XPath
      try {
        const scheduleSection = await page.$x("//div[contains(text(), 'Schedule')]");
        if (scheduleSection.length > 0) {
          await scheduleSection[0].click();
          console.log('   ✅ Clicked Schedule via XPath');
        }
      } catch (e) {
        console.log('   ⚠️ XPath click failed:', e.message);
      }
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
      console.log('   ⚠️ Không mở được Date Picker');
      return;
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
      console.log(`      ⚠️ Không chọn được ngày: ${day}`);
    }

    await new Promise(r => setTimeout(r, 2000));

    // 5. Thiết lập giờ
    console.log(`   ⏰ Đang thiết lập giờ: ${timeStr}...`);

    // Click mở time dropdown
    const timeDropdownOpened = await page.evaluate(() => {
      // Tìm time dropdown - thường là dropdown thứ 2 trong schedule section
      const timeSelectors = [
        '#time-of-day-trigger',
        '#time-of-day',
        'ytcp-form-dropdown#time-of-day',
        '[aria-label*="time" i]',
        '[aria-label*="Time"]',
        '[class*="time-picker"]',
        '[class*="timepicker"]'
      ];

      for (const sel of timeSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          return { success: true, selector: sel };
        }
      }

      // Tìm dropdown thứ 2 trong schedule section
      const scheduleSection = document.querySelector('ytcp-video-metadata-schedule, [class*="schedule"]');
      if (scheduleSection) {
        const dropdowns = scheduleSection.querySelectorAll('ytcp-text-dropdown-trigger, ytcp-form-dropdown, [role="listbox"]');
        if (dropdowns.length >= 2) {
          dropdowns[1].click();
          return { success: true, selector: 'schedule-dropdown-2' };
        }
      }

      // Tìm theo text format giờ (VD: "12:00 PM")
      const allElements = document.querySelectorAll('ytcp-text-dropdown-trigger, [role="button"]');
      for (const el of allElements) {
        const text = el.textContent.trim();
        if (text.match(/^\d{1,2}:\d{2}\s*(AM|PM)?$/i)) {
          el.click();
          return { success: true, selector: 'time-text-match', text };
        }
      }

      return { success: false };
    });

    console.log(`   Time dropdown result:`, timeDropdownOpened);

    if (!timeDropdownOpened.success) {
      console.log('   ⚠️ Không mở được Time dropdown');
    } else {
      await new Promise(r => setTimeout(r, 1500));

      // Chọn giờ từ dropdown list
      const timeSelected = await page.evaluate((targetTime) => {
        // Parse target time
        const parts = targetTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!parts) return { success: false, error: 'Invalid time format' };

        const targetHour = parseInt(parts[1]);
        const targetMinute = parseInt(parts[2]);
        const targetAmPm = parts[3].toUpperCase();

        // Tìm trong dropdown menu
        const itemSelectors = [
          'tp-yt-paper-item',
          'ytcp-ve[role="option"]',
          '[role="option"]',
          '[role="menuitem"]',
          '[class*="dropdown-item"]',
          'paper-item'
        ];

        for (const sel of itemSelectors) {
          const items = document.querySelectorAll(sel);
          for (const item of items) {
            const text = item.textContent.trim();

            // Parse giờ từ item
            const match = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              const hour = parseInt(match[1]);
              const minute = parseInt(match[2]);
              const ampm = (match[3] || '').toUpperCase();

              // So sánh
              if (hour === targetHour && minute === targetMinute &&
                (ampm === targetAmPm || !ampm)) {
                item.click();
                return { success: true, selector: sel, timeText: text };
              }
            }
          }
        }

        // Fallback: tìm text gần đúng (chỉ so sánh giờ, bỏ qua phút nếu là :00)
        if (targetMinute === 0) {
          for (const sel of itemSelectors) {
            const items = document.querySelectorAll(sel);
            for (const item of items) {
              const text = item.textContent.trim();
              const match = text.match(/(\d{1,2}):00\s*(AM|PM)?/i);
              if (match && parseInt(match[1]) === targetHour) {
                const ampm = (match[2] || '').toUpperCase();
                if (ampm === targetAmPm || !ampm) {
                  item.click();
                  return { success: true, selector: sel + '-hour-only', timeText: text };
                }
              }
            }
          }
        }

        return { success: false };
      }, timeStr);

      console.log(`   Time select result:`, timeSelected);

      if (timeSelected.success) {
        console.log(`      ✅ Đã chọn giờ: ${timeSelected.timeText}`);
      } else {
        console.log(`      ⚠️ Không chọn được giờ: ${timeStr}`);

        // Đóng dropdown
        await page.keyboard.press('Escape');
      }
    }

    await new Promise(r => setTimeout(r, 1500));
    console.log('   ✅ Hoàn tất thiết lập Schedule datetime');
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
