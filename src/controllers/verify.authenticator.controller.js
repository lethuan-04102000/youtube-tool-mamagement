const { AccountYoutube } = require('../models');
const browserService = require('../services/browser.service');
const googleAuthService = require('../services/google.auth.service');
const authenticatorService = require('../services/authenticator.service');
const youtubeService = require('../services/youtube.service');
const csvService = require('../services/csv.service');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

class VerifyAuthenticatorController {
  
  async autoSetup2FA(req, res) {
    let browser = null;
    let csvPath = null;
    let avatarFolderName = null;
    let accounts = [];
    
    try {
      // Check if CSV file is provided
      if (req.files && req.files.file) {
        // MODE 1: Upload CSV file - Import new accounts
        console.log('📁 Mode: Import from CSV file\n');
        
        // Check for avatar zip file
        let avatarZipPath = null;
        if (req.files.avatars) {
          avatarZipPath = req.files.avatars[0].path;
          console.log('📦 Avatar ZIP:', avatarZipPath);

          // Unzip avatars
          try {
            const zip = new AdmZip(avatarZipPath);
            const avatarsDir = path.join(__dirname, '../../avatars');
            
            // Extract folder name from zip (first entry folder name)
            const zipEntries = zip.getEntries();
            const firstFolder = zipEntries.find(entry => entry.isDirectory);
            if (firstFolder) {
              avatarFolderName = firstFolder.entryName.replace(/\/$/, '');
              console.log(`📁 Avatar folder: ${avatarFolderName}`);
            }

            // Extract to avatars directory
            zip.extractAllTo(avatarsDir, true);
            console.log('✅ Extracted avatars to:', avatarsDir);

            // Clean up zip file
            fs.unlinkSync(avatarZipPath);
          } catch (zipError) {
            console.error('❌ Error extracting avatars:', zipError.message);
          }
        }

        csvPath = req.files.file[0].path;
        console.log('📁 CSV Path:', csvPath);
        
        accounts = csvService.loadAccountsFromCSV(csvPath);
        
        if (accounts.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No accounts found in CSV'
          });
        }

        console.log('💾 Đang lưu accounts vào database...\n');
        
        // Get max index_avatar from database to continue incrementing
        const maxIndexResult = await AccountYoutube.max('index_avatar');
        let nextIndexAvatar = (maxIndexResult || 0) + 1;
        
        console.log(`📊 Starting index_avatar from: ${nextIndexAvatar}\n`);
        
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          
          try {
            const [accountRecord, created] = await AccountYoutube.findOrCreate({
              where: { email: account.email },
              defaults: {
                email: account.email,
                password: account.password,
                channel_name: account.channel_name,
                code_authenticators: null,
                is_authenticator: false,
                folder_avatar: avatarFolderName, // Save avatar folder name
                index_avatar: nextIndexAvatar // Assign incrementing index
              }
            });
            
            if (created) {
              console.log(`  [${nextIndexAvatar}] ${account.email} - NEW - index_avatar: ${nextIndexAvatar}`);
              nextIndexAvatar++; // Only increment if new record was created
            } else {
              console.log(`  [${accountRecord.index_avatar}] ${account.email} - EXISTS - index_avatar: ${accountRecord.index_avatar}`);
            }
          } catch (error) {
            console.error(`❌ Lỗi lưu ${account.email}:`, error.message);
          }
        }
        console.log('✅ Đã lưu tất cả accounts vào database\n');

      } else {
        // MODE 2: No CSV - Retry failed accounts from database
        console.log('🔄 Mode: Process accounts from database\n');
        
        const { Op } = require('sequelize');
        const dbAccounts = await AccountYoutube.findAll({
          where: {
            [Op.or]: [
              // Accounts without 2FA
              { is_authenticator: false },
              // Accounts with 2FA but no channel
              {
                is_authenticator: true,
                [Op.or]: [
                  { is_create_channel: false },
                ]
              }
            ]
          },
          order: [['id', 'ASC']]
        });

        if (dbAccounts.length === 0) {
          return res.json({
            success: true,
            message: 'No accounts need processing',
            data: [],
            summary: {
              total: 0,
              success: 0,
              failed: 0,
              skipped: 0
            }
          });
        }

        console.log(`📊 Found ${dbAccounts.length} accounts in database\n`);
        
        // Remove duplicates by email
        const uniqueAccountsMap = new Map();
        dbAccounts.forEach(acc => {
          if (!uniqueAccountsMap.has(acc.email)) {
            uniqueAccountsMap.set(acc.email, acc);
          }
        });
        
        const uniqueAccounts = Array.from(uniqueAccountsMap.values());
        console.log(`📊 After removing duplicates: ${uniqueAccounts.length} unique accounts\n`);
        
        // Convert DB records to account format
        accounts = uniqueAccounts.map(acc => ({
          email: acc.email,
          password: acc.password,
          channel_name: acc.channel_name
        }));
      }

      // Filter and prepare accounts for processing
      const accountsToProcess = [];
      const processedEmails = new Set(); // Track processed emails to avoid duplicates
      
      for (const account of accounts) {
        // Skip if already added to process list
        if (processedEmails.has(account.email)) {
          console.log(`⏭️  Skip: ${account.email} (duplicate in list)\n`);
          continue;
        }
        
        const existingAccount = await AccountYoutube.findOne({
          where: { email: account.email }
        });
        
        // Skip if account has both authenticator AND channel (only check flags, not channel_link)
        if (existingAccount && 
            existingAccount.is_authenticator === true && 
            existingAccount.is_create_channel === true) {
          console.log(`⏭️  Skip: ${account.email} (đã có Authenticator và Channel)\n`);
          continue;
        }
        
        // Use existing folder_avatar and index_avatar from DB if available
        if (existingAccount) {
          account.folder_avatar = existingAccount.folder_avatar;
          account.index_avatar = existingAccount.index_avatar;
        }
        
        accountsToProcess.push(account);
        processedEmails.add(account.email); // Mark as processed
      }

      if (accountsToProcess.length === 0) {
        return res.json({
          success: true,
          message: 'All accounts already have authenticator and channel',
          data: [],
          summary: {
            total: accounts.length,
            success: 0,
            failed: 0,
            skipped: accounts.length
          }
        });
      }

      console.log(`📊 Cần xử lý: ${accountsToProcess.length}/${accounts.length} accounts\n`);

      const results = [];
      const concurrentBrowsers = parseInt(process.env.CONCURRENT_TABS) || 5;
      
      console.log(`🚀 Chạy parallel với ${concurrentBrowsers} browsers cùng lúc\n`);

      // Process accounts in batches
      for (let i = 0; i < accountsToProcess.length; i += concurrentBrowsers) {
        const batch = accountsToProcess.slice(i, i + concurrentBrowsers);
        console.log(`\n📦 Batch ${Math.floor(i / concurrentBrowsers) + 1}: Processing ${batch.length} accounts...`);
        
        const batchResults = await Promise.all(
          batch.map(account => {
            // Use folder_avatar and index_avatar from account (either from CSV or DB)
            const folderAvatar = account.folder_avatar || avatarFolderName;
            const indexAvatar = account.index_avatar || (accounts.findIndex(a => a.email === account.email) + 1);
            return setupSingleAccountWithBrowser(account, folderAvatar, indexAvatar);
          })
        );
        
        results.push(...batchResults);
        
        const batchSuccess = batchResults.filter(r => r.success).length;
        console.log(`✅ Batch completed: ${batchSuccess}/${batch.length} success\n`);
        
        // Delay between batches to avoid rate limiting
        if (i + concurrentBrowsers < accountsToProcess.length) {
          console.log('⏳ Waiting 5s before next batch...\n');
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      csvService.saveResults(results, '2fa-setup-results.json');
      csvService.saveResultsToCSV(results, 'accounts-updated.csv');

      if (csvPath && fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      const skippedCount = accounts.length - accountsToProcess.length;

      res.json({
        success: true,
        message: `Completed: ${successCount} success, ${failCount} failed, ${skippedCount} skipped`,
        data: results,
        summary: {
          total: accounts.length,
          success: successCount,
          failed: failCount,
          skipped: skippedCount,
          processed: accountsToProcess.length
        }
      });

    } catch (error) {
      console.error('❌ Controller Error:', error);
      console.error('Stack:', error.stack);
      
      if (csvPath && fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }
      
      res.status(500).json({
        success: false,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  }
}

// Setup single account with its own browser instance
async function setupSingleAccountWithBrowser(account, avatarFolderName, indexAvatar) {
  let browser = null;
  
  try {
    console.log(`\n🌐 [${account.email}] [Index: ${indexAvatar}] Launching browser...`);
    
    // Use HEADLESS_AUTHENTICATOR for authenticator setup
    const headless = process.env.HEADLESS_AUTHENTICATOR === 'true';
    browser = await browserService.launchBrowser(headless);
    
    const result = await setupSingleAccount(browser, account, avatarFolderName, indexAvatar);
    
    await browser.close();
    console.log(`✅ [${account.email}] Browser closed`);
    
    return result;
  } catch (error) {
    console.error(`❌ [${account.email}] Error:`, error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
    
    return {
      email: account.email,
      password: account.password,
      channel_name: account.channel_name,
      success: false,
      error: error.message
    };
  }
}

async function setupSingleAccount(browser, account, avatarFolderName, indexAvatar) {
  const page = await browserService.createPage(browser);
  
  try {
    await browserService.clearSession(page);

    // Check if account already has authenticator
    const existingAccount = await AccountYoutube.findOne({
      where: { email: account.email }
    });

    let secretKey = existingAccount?.code_authenticators;
    let totp = null;
    let skipAuth = false;

    // If already has authenticator, skip 2FA setup
    if (existingAccount && existingAccount.is_authenticator === true && secretKey) {
      console.log('✅ Account đã có Authenticator, skip setup 2FA');
      console.log(`🔑 Secret key: ${secretKey.substring(0, 4)}...${secretKey.substring(secretKey.length - 4)}`);
      skipAuth = true;
      
      // Just login
      await googleAuthService.login(page, account.email, account.password);
      
    } else {
      // Setup 2FA flow
      console.log('🔐 Đang setup 2FA...');
      
      await googleAuthService.login(page, account.email, account.password);
      await googleAuthService.navigateTo2FASettings(page);

      const clickedAuth = await authenticatorService.clickAuthenticatorLink(page);
      if (!clickedAuth) {
        throw new Error('Could not click Authenticator link');
      }

      const clickedSetup = await authenticatorService.clickSetupButton(page);
      if (!clickedSetup) {
        throw new Error('Could not click Set up button');
      }

      const clickedCantScan = await authenticatorService.clickCantScanButton(page);
      if (!clickedCantScan) {
        throw new Error('Could not click Can\'t scan button');
      }

      secretKey = await authenticatorService.extractSecretKey(page);
      if (!secretKey) {
        throw new Error('Could not extract secret key');
      }

      console.log(`✅ Secret key: ${secretKey.substring(0, 4)}...${secretKey.substring(secretKey.length - 4)}`);

      totp = authenticatorService.generateOTP(secretKey);
      console.log(`🔐 OTP Code: ${totp}`);

      await authenticatorService.clickNextButton(page);

      const otpEntered = await authenticatorService.enterOTP(page, totp);
      if (!otpEntered) {
        throw new Error('Could not enter OTP');
      }

      const verified = await authenticatorService.clickVerifyButton(page);
      if (!verified) {
        throw new Error('Could not click Verify button');
      }

      console.log('🎉 Verify OTP thành công!');

      // Click "Turn on" link
      const clickedTurnOn = await authenticatorService.clickTurnOnLink(page);
      if (!clickedTurnOn) {
        console.log('⚠️  Could not find "Turn on" link, continuing...');
      }

      // Click "Turn on 2-Step Verification" button
      const clickedTurnOn2Step = await authenticatorService.clickTurnOn2StepButton(page);
      if (!clickedTurnOn2Step) {
        console.log('⚠️  Could not find "Turn on 2-Step Verification" button, continuing...');
      } else {
        // Click "Done" button after turning on 2-Step Verification
        const clickedDone = await authenticatorService.clickDoneButton(page);
        if (!clickedDone) {
          console.log('⚠️  Could not find "Done" button, continuing...');
        }
      }

      console.log('🎉 Đã bật 2-Step Verification!');

      // Save authenticator to database
      const [updatedCount] = await AccountYoutube.update(
        { 
          code_authenticators: secretKey,
          channel_name: account.channel_name,
          is_authenticator: true,
          folder_avatar: avatarFolderName,
          index_avatar: indexAvatar,
          last_login_at: new Date()
        },
        { where: { email: account.email } }
      );

      if (updatedCount === 0) {
        console.log('⚠️  Account not found in database, creating...');
        await AccountYoutube.create({
          email: account.email,
          password: account.password,
          code_authenticators: secretKey,
          channel_name: account.channel_name,
          is_authenticator: true,
          folder_avatar: avatarFolderName,
          index_avatar: indexAvatar,
          last_login_at: new Date()
        });
      }

      console.log('💾 Đã lưu Authenticator vào database');
    }

    // Check if need to create YouTube channel
    const accountAfterAuth = await AccountYoutube.findOne({
      where: { email: account.email }
    });

    let channelInfo = { name: '', link: '' };
    let avatarUploaded = false;
    let avatarName = '';

    // Create channel if not exists
    if (!accountAfterAuth.is_create_channel || !accountAfterAuth.channel_link) {
      try {
        console.log('\n📺 Đang tạo YouTube channel...');
        
        const channelName = account.channel_name || `Channel ${account.email.split('@')[0]}`;
        const createResult = await youtubeService.createChannel(page, channelName);
        
        // Get channel info
        channelInfo = await youtubeService.getChannelInfo(page);
        console.log(`✅ Channel info:`, channelInfo);

        // Use actual channel name from createResult (may be modified during retry)
        const actualChannelName = createResult.channelName || channelInfo.name || channelName;
        console.log(`📝 Actual channel name to save: "${actualChannelName}"`);

        // Update channel info to database
        const channelUpdateData = {
          channel_name: actualChannelName, // Use actual name (may have been modified)
          is_create_channel: true
        };
        
        if (channelInfo.link && channelInfo.link.startsWith('http')) {
          channelUpdateData.channel_link = channelInfo.link;
        }

        await AccountYoutube.update(channelUpdateData, { where: { email: account.email } });
        console.log('💾 Đã lưu thông tin channel vào database');

        // Upload avatar if index_avatar is available
        if (channelInfo.link && indexAvatar) {
          try {
            console.log('\n🖼️  Đang upload avatar...');
            
            // Get all avatar files from avatars folder
            const avatarsDir = path.join(__dirname, '../../avatars');
            const avatarFiles = fs.readdirSync(avatarsDir)
              .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext);
              })
              .sort((a, b) => {
                // Sort by number in filename (avatar_1.png, avatar_2.png, etc)
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
              });
            
            if (avatarFiles.length === 0) {
              console.log('⚠️  Không có avatar trong folder avatars');
            } else {
              // Use index_avatar to select image (index starts from 1)
              const avatarIndex = indexAvatar - 1; // Convert to 0-based index
              
              if (avatarIndex >= 0 && avatarIndex < avatarFiles.length) {
                const selectedAvatar = avatarFiles[avatarIndex];
                const imagePath = path.join(avatarsDir, selectedAvatar);
                
                console.log(`📸 Using avatar[${indexAvatar}]: ${selectedAvatar}`);
                
                // Extract channel ID
                const channelIdMatch = channelInfo.link.match(/channel\/([^\/\?]+)/);
                if (channelIdMatch) {
                  const channelId = channelIdMatch[1];
                  await youtubeService.uploadAvatar(page, channelId, imagePath);
                  avatarUploaded = true;
                  avatarName = selectedAvatar;
                  
                  // Mark avatar as uploaded
                  await AccountYoutube.update(
                    { is_upload_avatar: true },
                    { where: { email: account.email } }
                  );
                  
                  console.log('✅ Đã upload avatar');
                }
              } else {
                console.log(`⚠️  index_avatar ${indexAvatar} vượt quá số lượng avatar (${avatarFiles.length})`);
              }
            }
          } catch (avatarError) {
            console.error('⚠️  Lỗi upload avatar:', avatarError.message);
          }
        }

      } catch (channelError) {
        console.error('❌ Lỗi tạo channel:', channelError.message);
        // Don't update anything to DB if channel creation failed
        // Throw error to mark this account as failed
        throw new Error(`Failed to create channel: ${channelError.message}`);
      }
    } else {
      console.log('✅ Account đã có channel, skip tạo channel');
      channelInfo.link = accountAfterAuth.channel_link;
      channelInfo.name = accountAfterAuth.channel_name;
    }

    console.log(`📊 Index Avatar: ${indexAvatar}`);
    console.log('🎉 Setup hoàn tất!');

    await googleAuthService.logout(page);
    await page.close();

    return {
      email: account.email,
      password: account.password,
      channel_name: account.channel_name,
      success: true,
      secretKey: secretKey,
      otpCode: totp,
      skippedAuth: skipAuth,
      channelCreated: !!channelInfo.link,
      channelLink: channelInfo.link,
      avatarUploaded: avatarUploaded,
      avatar: avatarName
    };

  } catch (error) {
    console.error(`❌ Lỗi: ${error.message}`);
    
    try {
      await AccountYoutube.update(
        { 
          is_authenticator: false,
          notes: `Setup failed: ${error.message}`
        },
        { where: { email: account.email } }
      );
    } catch (dbError) {
      console.error('❌ Lỗi update database:', dbError.message);
    }
    
    await page.close();
    return { 
      email: account.email,
      password: account.password,
      channel_name: account.channel_name,
      success: false, 
      error: error.message 
    };
  }
}

module.exports = new VerifyAuthenticatorController();
