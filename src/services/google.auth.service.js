const authenticatorService = require('./authenticator.service');
const { AccountYoutube } = require('../models');

class GoogleAuthService {
  
  async login(page, email, password) {
    try {
      console.log(`🔐 Đang đăng nhập: ${email}`);

      await page.goto('https://accounts.google.com/signin', { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });
      
      // Email
      console.log('📧 Nhập email...');
      await page.waitForSelector('input[type="email"]', { timeout: 20000 });
      await new Promise(r => setTimeout(r, 1000));
      
      // Clear and type email
      await page.click('input[type="email"]');
      await page.evaluate(() => {
        const input = document.querySelector('input[type="email"]');
        if (input) input.value = '';
      });
      await page.type('input[type="email"]', email, { delay: 100 });
      
      // Click Next button
      await new Promise(r => setTimeout(r, 1500));
      await page.evaluate(() => {
        const btn = document.querySelector('#identifierNext');
        if (btn) btn.click();
      });
      
      await new Promise(r => setTimeout(r, 4000));

      // Check email error
      const errorEmail = await page.$('.o6cuMc');
      if (errorEmail) {
        const errorText = await page.evaluate(el => el?.textContent, errorEmail);
        throw new Error(`Email error: ${errorText}`);
      }

      // Password
      console.log('🔑 Nhập password...');
      await page.waitForSelector('input[type="password"]', { timeout: 20000, visible: true });
      await new Promise(r => setTimeout(r, 1500));
      
      // Clear and type password with multiple attempts
      let passwordEntered = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`   Attempt ${attempt}/3 to enter password...`);
          
          // Method 1: Click and type
          await page.click('input[type="password"]');
          await new Promise(r => setTimeout(r, 500));
          
          // Clear existing value
          await page.evaluate(() => {
            const input = document.querySelector('input[type="password"]');
            if (input) {
              input.value = '';
              input.focus();
            }
          });
          
          // Type password slowly
          await page.type('input[type="password"]', password, { delay: 120 });
          await new Promise(r => setTimeout(r, 500));
          
          // Verify password was entered
          const enteredValue = await page.evaluate(() => {
            const input = document.querySelector('input[type="password"]');
            return input ? input.value : '';
          });
          
          if (enteredValue === password) {
            console.log('   ✅ Password entered successfully');
            passwordEntered = true;
            break;
          } else {
            console.log(`   ⚠️  Password mismatch. Expected length: ${password.length}, Got: ${enteredValue.length}`);
          }
        } catch (e) {
          console.log(`   ❌ Attempt ${attempt} failed:`, e.message);
        }
      }
      
      if (!passwordEntered) {
        throw new Error('Failed to enter password after 3 attempts');
      }
      
      // Click Next button
      await new Promise(r => setTimeout(r, 1500));
      await page.evaluate(() => {
        const btn = document.querySelector('#passwordNext');
        if (btn) btn.click();
      });
      
      await new Promise(r => setTimeout(r, 5000));

      // Check password error
      const errorPassword = await page.$('.o6cuMc');
      if (errorPassword) {
        const errorText = await page.evaluate(el => el?.textContent, errorPassword);
        throw new Error(`Password error: ${errorText}`);
      }

      // Check for OTP input (2FA already enabled)
      console.log('🔍 Kiểm tra yêu cầu OTP...');
      const otpInput = await page.$('#totpPin');
      
      if (otpInput) {
        console.log('🔐 Phát hiện yêu cầu nhập OTP, đang generate mã...');
        
        // Get secret key from database
        const account = await AccountYoutube.findOne({
          where: { email: email }
        });
        
        if (!account || !account.code_authenticators) {
          throw new Error('Account không có secret key trong database');
        }
        
        const secretKey = account.code_authenticators;
        console.log(`🔑 Secret key: ${secretKey.substring(0, 4)}...${secretKey.substring(secretKey.length - 4)}`);
        
        // Generate OTP
        const otp = authenticatorService.generateOTP(secretKey);
        console.log(`🔐 OTP Code: ${otp}`);
        
        // Enter OTP
        await new Promise(r => setTimeout(r, 1000));
        await page.click('#totpPin');
        await new Promise(r => setTimeout(r, 500));
        
        // Clear existing value
        await page.evaluate(() => {
          const input = document.querySelector('#totpPin');
          if (input) {
            input.value = '';
            input.focus();
          }
        });
        
        // Type OTP
        await page.type('#totpPin', otp, { delay: 100 });
        await new Promise(r => setTimeout(r, 1000));
        
        // Click Next/Verify button
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const nextBtn = buttons.find(btn => 
            btn.textContent.includes('Next') || 
            btn.textContent.includes('Tiếp theo') ||
            btn.textContent.includes('Verify') ||
            btn.textContent.includes('Xác minh')
          );
          if (nextBtn) nextBtn.click();
        });
        
        console.log('✅ Đã nhập OTP');
        await new Promise(r => setTimeout(r, 3000));
      }

      // Check for "Tôi hiểu" or "I understand" button
      console.log('🔍 Kiểm tra popup xác nhận...');
      await new Promise(r => setTimeout(r, 2000));
      
      const confirmSelectors = [
        'input[name="confirm"]',
        'input[value="Tôi hiểu"]',
        'input[value="I understand"]',
        'input.MK9CEd.MVpUfe',
        'button[jsname="M2UYVd"]',
        '#confirm'
      ];

      let confirmClicked = false;
      for (const selector of confirmSelectors) {
        try {
          const confirmButton = await page.$(selector);
          if (confirmButton) {
            console.log('✅ Tìm thấy nút "Tôi hiểu", đang click...');
            await confirmButton.click();
            await new Promise(r => setTimeout(r, 2000));
            console.log('✅ Đã click "Tôi hiểu"');
            confirmClicked = true;
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!confirmClicked) {
        console.log('ℹ️  Không có popup xác nhận');
      }

      console.log('✅ Đăng nhập thành công!');
      return true;

    } catch (error) {
      console.error(`❌ Lỗi đăng nhập: ${error.message}`);
      throw error;
    }
  }

  async navigateTo2FASettings(page) {
    console.log('🔐 Đang chuyển đến trang 2FA settings...');
    
    await page.goto('https://myaccount.google.com/signinoptions/two-step-verification', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(r => setTimeout(r, 3000));

    // Click "Tôi hiểu" if exists
    await this.clickConfirmButton(page);
  }

  async clickConfirmButton(page) {
    const confirmSelectors = [
      'input[name="confirm"]',
      'input[value="Tôi hiểu"]',
      'input[value="I understand"]',
      'button[jsname="M2UYVd"]'
    ];

    for (const selector of confirmSelectors) {
      try {
        const confirmButton = await page.$(selector);
        if (confirmButton) {
          console.log('✅ Đang click "Tôi hiểu"...');
          await confirmButton.click();
          await new Promise(r => setTimeout(r, 2000));
          break;
        }
      } catch (e) {
        // Continue
      }
    }
  }

  /**
   * Kiểm tra xem đã đăng nhập Google chưa
   * @param {Page} page - Puppeteer page
   * @returns {Promise<boolean>} - true nếu đã đăng nhập
   */
  async isLoggedIn(page) {
    try {
      // Truy cập trang Google để check session
      await page.goto('https://accounts.google.com/ServiceLogin', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      await new Promise(r => setTimeout(r, 2000));

      const currentUrl = page.url();

      // Nếu URL chứa "myaccount" hoặc redirect về Google account page
      // thì đã đăng nhập rồi
      if (currentUrl.includes('myaccount.google.com') || 
          currentUrl.includes('accounts.google.com/AccountChooser') ||
          currentUrl.includes('accounts.google.com/b/')) {
        console.log('✅ Đã đăng nhập Google (session còn hiệu lực)');
        return true;
      }

      // Kiểm tra xem có profile avatar không (dấu hiệu đã login)
      const hasProfileAvatar = await page.evaluate(() => {
        return !!document.querySelector('img[alt*="Google"]') || 
               !!document.querySelector('[data-ogsr-up]') ||
               !!document.querySelector('a[aria-label*="Google Account"]');
      });

      if (hasProfileAvatar) {
        console.log('✅ Đã đăng nhập Google (tìm thấy profile)');
        return true;
      }

      // Kiểm tra xem có input email không (dấu hiệu chưa login)
      const hasEmailInput = await page.$('input[type="email"]');
      if (hasEmailInput) {
        console.log('ℹ️  Chưa đăng nhập Google');
        return false;
      }

      console.log('✅ Đã đăng nhập Google');
      return true;

    } catch (error) {
      console.log(`⚠️  Không xác định được trạng thái login: ${error.message}`);
      return false;
    }
  }

  async logout(page) {
    try {
      console.log('🚪 Đang logout...');
      await page.goto('https://accounts.google.com/Logout', {
        waitUntil: 'networkidle2',
        timeout: 15000
      });
      await new Promise(r => setTimeout(r, 3000));
      console.log('✅ Đã logout');
    } catch (error) {
      console.error('❌ Lỗi logout:', error);
    }
  }
}

module.exports = new GoogleAuthService();
