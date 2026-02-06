const path = require('path');

/**
 * Service xử lý visibility settings và schedule cho video YouTube
 */
class YoutubeUploadVisibilityService {
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
      await this.navigateToVisibilityStep(page);
      await new Promise(r => setTimeout(r, 2000));

      // Chọn visibility
      console.log(`🔒 Đang chọn visibility: ${visibility}...`);
      const visClicked = await this.selectVisibilityOption(page, visibility);

      if (visClicked) {
        console.log(`✅ Đã chọn visibility: ${visibility}`);
      } else {
        console.log(`⚠️ Không tìm thấy option visibility: ${visibility}`);
        // Take screenshot for debugging
        const screenshotPath = path.join(__dirname, '../../../uploads', `visibility-error-${Date.now()}.png`);
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
          const screenshotPath = path.join(__dirname, '../../../uploads', `schedule-error-${Date.now()}.png`);
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
   * Navigate qua 3 steps để đến Visibility page
   */
  async navigateToVisibilityStep(page) {
    // Click NEXT 3 lần: Details -> Video elements -> Checks -> Visibility
    const stepNames = ['Details -> Video elements', 'Video elements -> Checks', 'Checks -> Visibility'];

    for (let i = 0; i < 3; i++) {
      console.log(`\n   📍 Step ${i + 1}/3: ${stepNames[i]}`);
      await new Promise(r => setTimeout(r, 2000));

      // Nếu đang ở step Checks (i === 1), đợi checks hoàn tất
      if (i === 1) {
        await this.waitForChecksComplete(page);
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
  }

  /**
   * Đợi checks hoàn tất ở step Checks
   */
  async waitForChecksComplete(page) {
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

        // ========== KIỂM TRA CÁC LỖI CỤ THỂ ==========
        const errorMessages = [];

        // Chỉ kiểm tra lỗi thực sự
        if (pageText.includes('Processing abandoned')) {
          errorMessages.push('Processing abandoned');
        }
        if (pageText.includes('Video is too long')) {
          errorMessages.push('Video is too long');
        }
        if (pageText.includes('Includes copyrighted content') ||
          pageText.includes('Copyright claim on your video') ||
          pageText.includes('Copyright-protected content found')) {
          errorMessages.push('Copyright claim detected');
        }
        if (pageText.includes('Upload failed') || pageText.includes('Tải lên thất bại')) {
          errorMessages.push('Upload failed');
        }
        if (pageText.includes('Video has been rejected') || pageText.includes('violates our Community Guidelines')) {
          errorMessages.push('Video rejected - violates Community Guidelines');
        }
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

  /**
   * Chọn visibility option (public/unlisted/private)
   */
  async selectVisibilityOption(page, visibility) {
    const visibilityMap = {
      'public': 'PUBLIC',
      'unlisted': 'UNLISTED',
      'private': 'PRIVATE'
    };

    return await page.evaluate((vis) => {
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

    // 1. Expand Schedule section
    const scheduleExpanded = await this.expandScheduleSection(page);
    if (!scheduleExpanded) {
      console.log('   ❌ Không expand được Schedule section');
      return false;
    }

    await new Promise(r => setTimeout(r, 3000));

    // 2. Open Date Picker
    const datePickerOpened = await this.openDatePicker(page);
    if (!datePickerOpened) {
      console.log('   ❌ Không mở được Date Picker');
      return false;
    }

    await new Promise(r => setTimeout(r, 2000));

    // 3. Navigate to correct month/year
    await this.navigateToMonth(page, monthName, year);
    await new Promise(r => setTimeout(r, 1000));

    // 4. Select day
    const dayClicked = await this.selectDay(page, day);
    if (!dayClicked) {
      console.log(`      ❌ Không chọn được ngày: ${day}`);
      return false;
    }

    await new Promise(r => setTimeout(r, 2000));

    // 5. Set time
    const timeSet = await this.setTime(page, timeStr);
    if (!timeSet) {
      console.log('   ❌ Thất bại thiết lập Schedule datetime');
      return false;
    }

    console.log('   ✅ Hoàn tất thiết lập Schedule datetime');
    return true;
  }

  /**
   * Expand Schedule section
   */
  async expandScheduleSection(page) {
    console.log('   🔍 Đang tìm và click Schedule section để expand...');

    const scheduleExpanded = await page.evaluate(() => {
      // Tìm Schedule section - đây là một expandable section
      const expandableSections = document.querySelectorAll('[class*="expand"], [class*="collapsible"], ytcp-video-metadata-schedule');
      for (const section of expandableSections) {
        const text = section.textContent.toLowerCase();
        if (text.includes('schedule') && text.includes('select a date')) {
          const header = section.querySelector('[class*="header"], [class*="trigger"], [role="button"]');
          if (header) {
            header.click();
            return { success: true, method: 'expandable-header' };
          }
          section.click();
          return { success: true, method: 'section-click' };
        }
      }

      // Fallback methods...
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent;
        if (text && text.includes('Schedule') && text.includes('Select a date')) {
          el.click();
          return { success: true, method: 'fallback' };
        }
      }

      return { success: false };
    });

    console.log(`   Schedule expand result:`, scheduleExpanded);
    return scheduleExpanded.success;
  }

  /**
   * Open date picker dropdown
   */
  async openDatePicker(page) {
    console.log('   📅 Đang tìm Date Picker...');

    const datePickerOpened = await page.evaluate(() => {
      // Tìm date picker/dropdown
      const dateSelectors = [
        '#datepicker-trigger',
        'ytcp-text-dropdown-trigger#datepicker-trigger',
        '[aria-label*="date" i]',
        'ytcp-date-picker',
        '[class*="datepicker"]'
      ];

      for (const sel of dateSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          el.click();
          return { success: true, selector: sel };
        }
      }

      // Fallback: tìm element hiển thị ngày
      const allElements = document.querySelectorAll('ytcp-text-dropdown-trigger, [role="button"], button');
      for (const el of allElements) {
        const text = el.textContent;
        if (text && (text.match(/[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}/) || text.match(/\d{1,2}\/\d{1,2}\/\d{4}/))) {
          el.click();
          return { success: true, selector: 'date-text-match', text: text.trim() };
        }
      }

      return { success: false };
    });

    console.log(`   Date picker result:`, datePickerOpened);
    return datePickerOpened.success;
  }

  /**
   * Navigate calendar to correct month/year
   */
  async navigateToMonth(page, targetMonth, targetYear) {
    console.log(`   🔄 Đang navigate tới tháng ${targetMonth} ${targetYear}...`);

    const maxMonthNavigate = 12;
    for (let i = 0; i < maxMonthNavigate; i++) {
      const calendarInfo = await page.evaluate(() => {
        const popup = document.querySelector('tp-yt-iron-dropdown[aria-hidden="false"], ytcp-date-picker');
        let headerText = '';
        if (popup) {
          const header = popup.querySelector('[class*="header"], [class*="month"], iron-label, #label');
          if (header) {
            headerText = header.textContent.trim();
          }
        }
        return { headerText };
      });

      console.log(`      Calendar header: "${calendarInfo.headerText}"`);

      const isCorrectMonth = calendarInfo.headerText.includes(targetMonth) &&
        calendarInfo.headerText.includes(String(targetYear));

      if (isCorrectMonth) {
        console.log(`      ✅ Đã đến đúng tháng: ${targetMonth} ${targetYear}`);
        break;
      }

      // Click Next Month button
      const nextMonthClicked = await page.evaluate(() => {
        const nextSelectors = [
          '#next-month',
          'ytcp-date-picker #next-month',
          '[aria-label*="Next" i]',
          'tp-yt-paper-icon-button:last-of-type'
        ];

        for (const sel of nextSelectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.click();
            return { success: true, selector: sel };
          }
        }

        return { success: false };
      });

      if (!nextMonthClicked.success) {
        console.log('      ⚠️ Không tìm thấy nút Next Month');
        break;
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }

  /**
   * Select day in calendar
   */
  async selectDay(page, targetDay) {
    console.log(`   📅 Đang chọn ngày ${targetDay}...`);

    const dayClicked = await page.evaluate((day) => {
      const daySelectors = [
        '.day:not(.disabled):not(.not-in-month)',
        'tp-yt-paper-button.day',
        '[role="gridcell"]',
        'button[class*="day"]'
      ];

      const popup = document.querySelector('tp-yt-iron-dropdown[aria-hidden="false"], ytcp-date-picker');
      
      if (popup) {
        for (const sel of daySelectors) {
          const days = popup.querySelectorAll(sel);
          for (const d of days) {
            const text = d.textContent.trim();
            if (text === String(day) && !d.classList.contains('not-in-month') && !d.classList.contains('disabled')) {
              d.click();
              return { success: true, selector: sel, dayText: text };
            }
          }
        }
      }

      return { success: false };
    }, targetDay);

    console.log(`   Day click result:`, dayClicked);

    if (dayClicked.success) {
      console.log(`      ✅ Đã chọn ngày: ${targetDay}`);
    }

    return dayClicked.success;
  }

  /**
   * Set time input
   */
  async setTime(page, timeStr) {
    console.log(`   ⏰ Đang thiết lập giờ: ${timeStr}...`);

    // Wait for time input to appear
    let timeInputFound = false;
    const maxWaitTimeInput = 10000;
    const startWaitTime = Date.now();
    
    while (Date.now() - startWaitTime < maxWaitTimeInput && !timeInputFound) {
      timeInputFound = await page.evaluate(() => {
        const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
        return paperInputs.length >= 2;
      });
      
      if (!timeInputFound) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    if (!timeInputFound) {
      console.log(`      ❌ Timeout: Không tìm thấy time input sau 10 giây`);
      return false;
    }

    console.log(`      ✅ Time input đã xuất hiện`);
    await new Promise(r => setTimeout(r, 1000));

    // Click time input to focus
    console.log(`      🖱️  Click vào time input...`);
    const timeInputClicked = await page.evaluate(() => {
      const paperInputs = document.querySelectorAll('input.tp-yt-paper-input[autocomplete="off"]');
      if (paperInputs.length >= 2) {
        const timeInput = paperInputs[1];
        timeInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
        timeInput.focus();
        timeInput.click();
        return { success: true, value: timeInput.value };
      }
      return { success: false };
    });

    if (!timeInputClicked.success) {
      console.log(`      ⚠️ Không click được time input`);
      return false;
    }

    console.log(`      ℹ️  Current value: "${timeInputClicked.value}"`);
    await new Promise(r => setTimeout(r, 500));

    // Clear current value
    console.log(`      ⌨️  Đang xóa value mặc định...`);
    const isMac = process.platform === 'darwin';
    await page.keyboard.down(isMac ? 'Meta' : 'Control');
    await page.keyboard.press('a');
    await page.keyboard.up(isMac ? 'Meta' : 'Control');
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));

    // Type new time
    console.log(`      ⌨️  Đang gõ giờ: ${timeStr}...`);
    await page.keyboard.type(timeStr, { delay: 100 });
    console.log(`      ✅ Đã gõ giờ: ${timeStr}`);

    await new Promise(r => setTimeout(r, 500));

    // Press Enter and Tab to confirm
    console.log(`      ⏎ Nhấn Enter...`);
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 500));

    console.log(`      ⇥ Nhấn Tab...`);
    await page.keyboard.press('Tab');

    console.log(`      ✅ Hoàn tất nhập giờ`);
    await new Promise(r => setTimeout(r, 2000));

    return true;
  }
}

module.exports = new YoutubeUploadVisibilityService();
