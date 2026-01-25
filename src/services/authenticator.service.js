const speakeasy = require('speakeasy');
const fs = require('fs');
const path = require('path');

class AuthenticatorService {
  
  async clickAuthenticatorLink(page) {
    console.log('🔍 Đang tìm link "Authenticator"...');
    await new Promise(r => setTimeout(r, 2000));

    const clicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const authLink = links.find(link => 
        link.textContent?.includes('Authenticator') || 
        link.href?.includes('authenticator')
      );
      if (authLink) {
        authLink.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Đã click vào Authenticator');
      await new Promise(r => setTimeout(r, 3000));
    }

    return clicked;
  }

  async clickSetupButton(page) {
    console.log('🔍 Đang tìm nút "Set up authenticator"...');
    
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span'));
      const setupBtn = buttons.find(btn => 
        btn.textContent?.includes('Set up') || 
        btn.textContent?.includes('authenticator')
      );
      if (setupBtn) {
        setupBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Đã click "Set up authenticator"');
      await new Promise(r => setTimeout(r, 4000));
    }

    return clicked;
  }

  async clickCantScanButton(page) {
    console.log('\n🔍 Đang tìm nút "Can\'t scan it?"...');
    await new Promise(r => setTimeout(r, 4000)); // Đợi lâu hơn để popup hiển thị đầy đủ

    let clickedCantScan = false;

    // Method 1: Try direct button selector inside center tag
    try {
      console.log('📍 Thử method 1: Tìm button trong center tag...');
      const cantScanButton = await page.$('center button[jsname="Pr7Yme"]');
      if (cantScanButton) {
        const text = await page.evaluate(el => el?.textContent || '', cantScanButton);
        if (text.includes("Can't scan")) {
          console.log('✅ Tìm thấy button "Can\'t scan it?" trong center tag');
          console.log('🖱️  Đang click...');
          await cantScanButton.click();
          await new Promise(r => setTimeout(r, 3000));
          console.log('✅ Đã click "Can\'t scan it?"');
          console.log('🎉 Bây giờ bạn sẽ thấy secret key để copy!');
          clickedCantScan = true;
          return true;
        }
      }
    } catch (e) {
      console.log('⚠️  Method 1 failed');
    }

    // Method 2: Find all buttons with jsname Pr7Yme
    if (!clickedCantScan) {
      try {
        console.log('� Thử method 2: Tìm tất cả buttons với jsname="Pr7Yme"...');
        const allButtons = await page.$$('button[jsname="Pr7Yme"]');
        console.log(`   Tìm thấy ${allButtons.length} buttons`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const button = allButtons[i];
          const text = await page.evaluate(el => el?.textContent || '', button);
          const trimmed = text.trim();
          const lower = trimmed.toLowerCase();
          
          // Show hex codes for debugging
          const hexCodes = [...trimmed].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
          
          console.log(`\n   Button ${i + 1}:`);
          console.log(`      Raw text: "${text}"`);
          console.log(`      Trimmed: "${trimmed}"`);
          console.log(`      Hex codes: ${hexCodes}`);
          console.log(`      Length: ${trimmed.length}`);
          console.log(`      Lowercase: "${lower}"`);
          
          // Normalize special characters (curly quotes, etc.)
          const normalized = lower
            .replace(/[\u2018\u2019]/g, "'")  // Replace curly single quotes
            .replace(/[\u201C\u201D]/g, '"')  // Replace curly double quotes
            .replace(/\s+/g, ' ');             // Normalize whitespace
          
          console.log(`      Normalized: "${normalized}"`);
          
          // Debug: kiểm tra từng điều kiện
          const hasApostrophe = normalized.includes("can't scan");
          const noApostrophe = normalized.includes("cant scan");
          const hasSpace = normalized.includes("can t scan");
          
          console.log(`      Has "can't scan": ${hasApostrophe}`);
          console.log(`      Has "cant scan": ${noApostrophe}`);
          console.log(`      Has "can t scan": ${hasSpace}`);
          
          if (hasApostrophe || noApostrophe || hasSpace) {
            console.log(`\n✅ ✅ ✅ MATCH FOUND ở button thứ ${i + 1}!`);
            console.log('🖱️  Đang click...');
            
            try {
              await button.click();
              console.log('✅ Click command executed');
              await new Promise(r => setTimeout(r, 3000));
              console.log('✅ Đã click "Can\'t scan it?"');
              console.log('🎉 Bây giờ bạn sẽ thấy secret key để copy!');
              clickedCantScan = true;
              return true;
            } catch (clickErr) {
              console.log('❌ Lỗi khi click:', clickErr);
            }
          } else {
            console.log(`      ❌ No match`);
          }
          console.log(''); // Empty line for readability
        }
        
        if (!clickedCantScan) {
          console.log('⚠️  Method 2: Không tìm thấy text "Can\'t scan" trong các button');
        }
      } catch (e) {
        console.log('⚠️  Method 2 failed:', e);
      }
    }

    // Method 3: Use evaluate to find and click
    if (!clickedCantScan) {
      try {
        console.log('📍 Thử method 3: Dùng evaluate để tìm và click...');
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const cantScanBtn = buttons.find((btn) => 
            btn.textContent?.includes("Can't scan it?") || 
            btn.textContent?.includes("Can't scan")
          );
          if (cantScanBtn) {
            cantScanBtn.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          await new Promise(r => setTimeout(r, 3000));
          console.log('✅ Đã click "Can\'t scan it?" bằng evaluate');
          console.log('🎉 Bây giờ bạn sẽ thấy secret key để copy!');
          clickedCantScan = true;
          return true;
        }
      } catch (e) {
        console.log('⚠️  Method 3 failed:', e);
      }
    }

    if (!clickedCantScan) {
      console.log('\n⚠️  Không tìm thấy nút "Can\'t scan it?" sau 3 methods');
      console.log('👉 Popup có thể chưa load xong');
      console.log('👉 Bạn có thể click thủ công trong browser');
      console.log('📋 Vị trí: Trong popup QR code → button "Can\'t scan it?"');
    }

    return clickedCantScan;
  }

  async extractSecretKey(page) {
    try {
      console.log('🔍 Đang tìm secret key...');

      // Method 1: Find in li.mzEcT with strong tag
      const secretKeyFromGoogle = await page.evaluate(() => {
        const listItems = Array.from(document.querySelectorAll('li.mzEcT'));
        
        for (const li of listItems) {
          const text = li.textContent || '';
          
          if (text.includes('key') && (text.includes("spaces don't matter") || text.includes('Enter your email'))) {
            const strong = li.querySelector('strong');
            if (strong) {
              const keyText = strong.textContent?.trim() || '';
              const cleaned = keyText.replace(/\s/g, '').toUpperCase();
              
              if (cleaned.length >= 16 && cleaned.length <= 32 && /^[A-Z2-7]+$/.test(cleaned)) {
                return cleaned;
              }
            }
          }
        }
        
        return null;
      });

      if (secretKeyFromGoogle) {
        return secretKeyFromGoogle;
      }

      // Method 2: Find in all elements
      const secretKey = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('div, span, strong, code'));
        
        const blacklist = [
          'SKIP', 'MAIN', 'CONTENT', 'AUTHENTICATOR', 'SETUP',
          'NAVIGATION', 'MENU', 'BUTTON', 'NEXT', 'BACK',
          'GOOGLE', 'ACCOUNT', 'SECURITY', 'SETTINGS'
        ];

        for (const el of elements) {
          const isInButton = el.closest('button') !== null;
          const isInNav = el.closest('nav') !== null;
          const isInHeader = el.closest('header') !== null;

          if (isInButton || isInNav || isInHeader) continue;

          const text = el.textContent?.trim() || '';
          const cleaned = text.replace(/\s/g, '').toUpperCase();

          const hasBlacklistedWord = blacklist.some(word => cleaned.includes(word));
          
          if (!hasBlacklistedWord &&
              cleaned.length >= 16 && 
              cleaned.length <= 32 && 
              /^[A-Z2-7]+$/.test(cleaned)) {
            return cleaned;
          }
        }
        
        return null;
      });

      return secretKey;
    } catch (error) {
      console.error('❌ Lỗi extract secret key:', error);
      return null;
    }
  }

  generateOTP(secretKey) {
    return speakeasy.totp({
      secret: secretKey,
      encoding: 'base32'
    });
  }

  async clickNextButton(page) {
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, span[role="button"]'));
      const nextBtn = buttons.find(btn => {
        const text = btn.textContent?.trim() || '';
        return text === 'Next' || text === 'Tiếp theo';
      });
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Đã click "Next"');
      await new Promise(r => setTimeout(r, 2000));
    }

    return clicked;
  }

  async enterOTP(page, otpCode) {
    const otpInputSelectors = [
      'input[jsname="YPqjbf"]',
      'input[placeholder*="Enter Code"]',
      'input[type="text"][autocomplete="off"]'
    ];

    for (const selector of otpInputSelectors) {
      try {
        const otpInput = await page.$(selector);
        if (otpInput) {
          console.log('✅ Tìm thấy input OTP');
          // Clear input using evaluate instead of keyboard
          await page.evaluate(el => {
            el.value = '';
            el.focus();
          }, otpInput);
          await otpInput.type(otpCode, { delay: 100 });
          console.log('✅ Đã nhập OTP code');
          return true;
        }
      } catch (e) {
        // Continue
      }
    }

    return false;
  }

  async clickVerifyButton(page) {
    await new Promise(r => setTimeout(r, 1500));

    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, span[role="button"], span[jsname="V67aGc"]'));
      const verifyBtn = buttons.find(btn => {
        const text = btn.textContent?.trim() || '';
        return text === 'Verify' || text === 'Xác minh';
      });
      if (verifyBtn) {
        verifyBtn.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Đã click "Verify"');
      await new Promise(r => setTimeout(r, 4000));
    }

    return clicked;
  }

  async clickTurnOnLink(page) {
    console.log('🔍 Đang tìm link "Turn on"...');
    await new Promise(r => setTimeout(r, 2000));

    const clicked = await page.evaluate(() => {
      // Try to find by aria-label or class
      const turnOnLink = document.querySelector('a.UywwFc-mRLv6.UywwFc-RLmnJb[aria-label="Turn on"]');
      if (turnOnLink) {
        turnOnLink.click();
        return true;
      }

      // Fallback: find any link with "Turn on" text
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(l => {
        const text = l.textContent?.trim() || '';
        const ariaLabel = l.getAttribute('aria-label') || '';
        return text === 'Turn on' || ariaLabel === 'Turn on';
      });
      
      if (link) {
        link.click();
        return true;
      }
      
      return false;
    });

    if (clicked) {
      console.log('✅ Đã click "Turn on"');
      await new Promise(r => setTimeout(r, 3000));
    }

    return clicked;
  }

  async clickTurnOn2StepButton(page) {
    console.log('🔍 Đang tìm nút "Turn on 2-Step Verification"...');
    
    // Wait a bit for page to settle after OTP verification
    await new Promise(r => setTimeout(r, 3000));

    let clicked = false;

    // Method 0: Wait for button to appear first
    try {
      console.log('📍 Đang đợi button xuất hiện...');
      await page.waitForSelector('button[jsname="Pr7Yme"]', {
        timeout: 10000,
        visible: true
      });
      console.log('✅ Có button với jsname="Pr7Yme" xuất hiện');
    } catch (e) {
      console.log('⚠️  Không thấy button xuất hiện sau 10s');
      await this.debugPageContent(page, `turn-on-2step-timeout-${Date.now()}`);
    }

    // Method 1: Find by aria-label with exact match
    try {
      console.log('📍 Thử method 1: Tìm button với aria-label chính xác...');
      const button = await page.$('button[aria-label="Turn on 2-Step Verification"]');
      if (button) {
        console.log('✅ Tìm thấy button với aria-label');
        
        // Scroll to element first
        await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), button);
        await new Promise(r => setTimeout(r, 500));
        
        await button.click();
        await new Promise(r => setTimeout(r, 4000));
        console.log('✅ Đã click "Turn on 2-Step Verification"');
        clicked = true;
        return true;
      }
    } catch (e) {
      console.log('⚠️  Method 1 failed:', e.message);
    }

    // Method 2: Find by jsname and verify aria-label
    if (!clicked) {
      try {
        console.log('📍 Thử method 2: Tìm tất cả buttons với jsname="Pr7Yme"...');
        const buttons = await page.$$('button[jsname="Pr7Yme"]');
        console.log(`   Tìm thấy ${buttons.length} buttons với jsname="Pr7Yme"`);
        
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          const ariaLabel = await page.evaluate(el => el.getAttribute('aria-label'), button);
          const text = await page.evaluate(el => {
            const span = el.querySelector('span[jsname="V67aGc"]');
            return span ? span.textContent?.trim() : el.textContent?.trim();
          }, button);
          
          console.log(`   Button ${i + 1}:`);
          console.log(`      aria-label: "${ariaLabel}"`);
          console.log(`      text: "${text}"`);
          
          if (ariaLabel && ariaLabel.includes('Turn on 2-Step Verification')) {
            console.log(`✅ Tìm thấy button chính xác tại index ${i + 1}`);
            
            // Scroll to element
            await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), button);
            await new Promise(r => setTimeout(r, 500));
            
            await button.click();
            await new Promise(r => setTimeout(r, 4000));
            console.log('✅ Đã click "Turn on 2-Step Verification"');
            clicked = true;
            return true;
          }
          
          if (text && text.includes('Turn on 2-Step Verification')) {
            console.log(`✅ Tìm thấy button qua text tại index ${i + 1}`);
            
            // Scroll to element
            await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), button);
            await new Promise(r => setTimeout(r, 500));
            
            await button.click();
            await new Promise(r => setTimeout(r, 4000));
            console.log('✅ Đã click "Turn on 2-Step Verification"');
            clicked = true;
            return true;
          }
        }
      } catch (e) {
        console.log('⚠️  Method 2 failed:', e.message);
      }
    }

    // Method 3: Use evaluate to find and click by aria-label (partial match)
    if (!clicked) {
      try {
        console.log('📍 Thử method 3: Dùng evaluate với aria-label partial match...');
        clicked = await page.evaluate(() => {
          // Find by aria-label (partial match)
          const button = document.querySelector('button[aria-label*="Turn on 2-Step"]');
          if (button) {
            console.log('Found button by aria-label partial match');
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            button.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          await new Promise(r => setTimeout(r, 4000));
          console.log('✅ Đã click "Turn on 2-Step Verification" bằng evaluate (method 3)');
          return true;
        }
      } catch (e) {
        console.log('⚠️  Method 3 failed:', e.message);
      }
    }

    // Method 4: Use evaluate to find by span text
    if (!clicked) {
      try {
        console.log('📍 Thử method 4: Dùng evaluate tìm span với jsname="V67aGc"...');
        clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const turnOnBtn = buttons.find(btn => {
            const span = btn.querySelector('span[jsname="V67aGc"]');
            if (span) {
              const text = span.textContent?.trim() || '';
              return text.includes('Turn on 2-Step Verification') || 
                     text.includes('Turn on 2-Step');
            }
            return false;
          });
          
          if (turnOnBtn) {
            console.log('Found button by span text');
            turnOnBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            turnOnBtn.click();
            return true;
          }
          
          return false;
        });

        if (clicked) {
          await new Promise(r => setTimeout(r, 4000));
          console.log('✅ Đã click "Turn on 2-Step Verification" bằng evaluate (method 4)');
          return true;
        }
      } catch (e) {
        console.log('⚠️  Method 4 failed:', e.message);
      }
    }

    // Method 5: Find by class and jscontroller
    if (!clicked) {
      try {
        console.log('📍 Thử method 5: Tìm button bằng class UywwFc-LgbsSe...');
        clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button.UywwFc-LgbsSe[jscontroller="O626Fe"]'));
          
          for (const btn of buttons) {
            const ariaLabel = btn.getAttribute('aria-label') || '';
            const span = btn.querySelector('span[jsname="V67aGc"]');
            const text = span ? span.textContent?.trim() : '';
            
            if (ariaLabel.includes('Turn on 2-Step') || text.includes('Turn on 2-Step')) {
              console.log('Found button by class and jscontroller');
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              btn.click();
              return true;
            }
          }
          
          return false;
        });

        if (clicked) {
          await new Promise(r => setTimeout(r, 4000));
          console.log('✅ Đã click "Turn on 2-Step Verification" bằng evaluate (method 5)');
          return true;
        }
      } catch (e) {
        console.log('⚠️  Method 5 failed:', e.message);
      }
    }

    if (!clicked) {
      console.log('❌ Không tìm thấy nút "Turn on 2-Step Verification"');
      console.log('💡 Có thể button chưa xuất hiện hoặc đã có 2FA rồi');
      
      // Save debug info
      await this.debugPageContent(page, `turn-on-2step-not-found-${Date.now()}`);
    }

    return clicked;
  }

  async clickDoneButton(page) {
    console.log('🔍 Đang tìm nút "Done"...');
    await new Promise(r => setTimeout(r, 2000));

    let clicked = false;

    // Method 1: Find by text content
    try {
      console.log('📍 Thử method 1: Tìm button với text "Done"...');
      clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const doneBtn = buttons.find(btn => {
          const text = btn.textContent?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          return text === 'Done' || ariaLabel === 'Done' || 
                 text === 'Xong' || ariaLabel === 'Xong';
        });
        
        if (doneBtn) {
          doneBtn.click();
          return true;
        }
        
        return false;
      });

      if (clicked) {
        await new Promise(r => setTimeout(r, 3000));
        console.log('✅ Đã click "Done"');
        return true;
      }
    } catch (e) {
      console.log('⚠️  Method 1 failed:', e.message);
    }

    // Method 2: Find by jsname
    if (!clicked) {
      try {
        console.log('📍 Thử method 2: Tìm button với jsname...');
        const buttons = await page.$$('button[jsname="Pr7Yme"]');
        
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent?.trim() || '', button);
          
          if (text === 'Done' || text === 'Xong') {
            console.log('✅ Tìm thấy button "Done"');
            await button.click();
            await new Promise(r => setTimeout(r, 3000));
            console.log('✅ Đã click "Done"');
            clicked = true;
            return true;
          }
        }
      } catch (e) {
        console.log('⚠️  Method 2 failed:', e.message);
      }
    }

    if (!clicked) {
      console.log('⚠️  Không tìm thấy nút "Done", có thể đã hoàn tất');
    }

    return clicked;
  }

  // Helper function to debug page content
  async debugPageContent(page, filename) {
    try {
      const debugDir = path.join(__dirname, '../../debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      
      // Save HTML
      const html = await page.content();
      const htmlPath = path.join(debugDir, `${filename}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`🔍 Saved HTML to: ${htmlPath}`);
      
      // Save screenshot
      const screenshotPath = path.join(debugDir, `${filename}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Saved screenshot to: ${screenshotPath}`);
    } catch (error) {
      console.log('⚠️  Debug failed:', error.message);
    }
  }
}

module.exports = new AuthenticatorService();
