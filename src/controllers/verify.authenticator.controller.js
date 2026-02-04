const { AccountYoutube } = require('../models');
const browserService = require('../services/browser.service');
const googleAuthService = require('../services/google.auth.service');
const authenticatorService = require('../services/authenticator.service');
const youtubeService = require('../services/youtube.service');
const csvService = require('../services/csv.service');
const facebDownloader = require('../services/faceb.downloader.service');
const fs = require('fs');
const path = require('path');
const sessionService = require('../services/session.service');

class VerifyAuthenticatorController {
  
  async autoSetup2FA(req, res) {
    let browser = null;
    let csvPath = null;
    let accounts = [];
    
    try {
      // Check if CSV file is provided
      if (req.files && req.files.file) {
        // MODE 1: Upload CSV file - Import new accounts
        console.log('📁 Mode: Import from CSV file\n');

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
        
        for (let i = 0; i < accounts.length; i++) {
          const account = accounts[i];
          
          try {
            // Normalize is_create_channel flag from CSV (accept '1','true','yes', boolean)
            let isCreateChannelFlag = false;
            if (account.hasOwnProperty('is_create_channel')) {
              const v = account.is_create_channel;
              if (typeof v === 'string') {
                const s = v.trim().toLowerCase();
                isCreateChannelFlag = s === '1' || s === 'true' || s === 'yes';
              } else {
                isCreateChannelFlag = !!v;
              }
            }

            const [accountRecord, created] = await AccountYoutube.findOrCreate({
              where: { email: account.email },
              defaults: {
                email: account.email,
                password: account.password,
                channel_name: account.channel_name,
                avatar_url: account.avatar_url || null,
                recovery_email: account.recovery_email || null,
                code_authenticators: null,
                is_authenticator: false,
                // If CSV indicates channel already created, set it so we won't create later
                is_create_channel: isCreateChannelFlag
              }
            });
            
            if (created) {
              console.log(`  ✅ ${account.email} - NEW`);
            } else {
              console.log(`  ℹ️  ${account.email} - EXISTS`);
              
              // Update avatar_url if provided in CSV and not already set
              if (account.avatar_url && !accountRecord.avatar_url) {
                await AccountYoutube.update(
                  { avatar_url: account.avatar_url },
                  { where: { email: account.email } }
                );
                console.log(`     📥 Updated avatar_url for ${account.email}`);
              }

              // If CSV explicitly marks is_create_channel=true, update DB so we skip channel creation later
              if (account.hasOwnProperty('is_create_channel') && isCreateChannelFlag && !accountRecord.is_create_channel) {
                try {
                  await AccountYoutube.update(
                    { is_create_channel: true },
                    { where: { email: account.email } }
                  );
                  console.log(`     ✅ Marked is_create_channel=true for ${account.email} (from CSV)`);
                } catch (err) {
                  console.error(`     ❌ Failed to update is_create_channel for ${account.email}:`, err.message);
                }
              }
            }
          } catch (error) {
            console.error(`❌ Lỗi lưu ${account.email}:`, error.message);
          }
        }
        console.log('✅ Đã lưu tất cả accounts vào database\n');
        
        // Download avatars from Facebook if avatar_url exists and image_name is null
        const accountsWithAvatarUrl = accounts.filter(acc => acc.avatar_url);
        if (accountsWithAvatarUrl.length > 0) {
          console.log(`\n📥 Checking avatars to download...\n`);
          
          // Query DB to get full account info with id
          const { Op } = require('sequelize');
          const dbAccounts = await AccountYoutube.findAll({
            where: {
              email: { [Op.in]: accountsWithAvatarUrl.map(acc => acc.email) }
            },
            attributes: ['id', 'email', 'avatar_url', 'image_name']
          });
          
          // Filter accounts that need download (no image_name yet)
          const accountsToDownload = dbAccounts.filter(acc => !acc.image_name);
          const accountsAlreadyDownloaded = dbAccounts.filter(acc => acc.image_name);
          
          if (accountsAlreadyDownloaded.length > 0) {
            console.log(`✅ ${accountsAlreadyDownloaded.length} accounts already have avatars downloaded\n`);
            accountsAlreadyDownloaded.forEach(acc => {
              console.log(`   ✅ ${acc.email}: ${acc.image_name}`);
            });
          }
          
          if (accountsToDownload.length === 0) {
            console.log(`\n✅ All avatars already downloaded, skipping download step\n`);
          } else {
            console.log(`\n📥 Downloading ${accountsToDownload.length} avatars from Facebook using parallel tabs...\n`);
            
            const avatarsDir = path.join(__dirname, '../../avatars');
            const downloadResults = await facebDownloader.downloadMultipleAvatars(
              accountsToDownload, 
              avatarsDir
            );
            
            // Update DB with image_name for successful downloads
            console.log('\n💾 Updating database with downloaded image names...');
            for (const result of downloadResults) {
              if (result.success && result.imageName) {
                try {
                  await AccountYoutube.update(
                    { image_name: result.imageName },
                    { where: { email: result.email } }
                  );
                  console.log(`   ✅ Updated image_name for ${result.email}: ${result.imageName}`);
                } catch (error) {
                  console.error(`   ❌ Failed to update image_name for ${result.email}:`, error.message);
                }
              }
            }
            
            const successCount = downloadResults.filter(r => r.success).length;
            console.log(`\n✅ Downloaded ${successCount}/${accountsToDownload.length} avatars successfully\n`);
          }
        }

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
                is_create_channel: false
              },
              // Accounts with channel but no avatar
              {
                is_authenticator: true,
                is_create_channel: true,
                is_upload_avatar: false
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
          channel_name: acc.channel_name,
          avatar_url: acc.avatar_url  // Include avatar_url from DB
        }));
        
        // Debug: Log accounts with their avatar_url status
        console.log(`📋 Accounts from DB:`);
        accounts.forEach((acc, idx) => {
          console.log(`  [${idx + 1}] ${acc.email}`);
          console.log(`      avatar_url: ${acc.avatar_url || 'NULL'}`);
        });
        console.log('');
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
        
        // Skip if account has authenticator, channel AND avatar uploaded
        if (existingAccount && 
            existingAccount.is_authenticator === true && 
            existingAccount.is_create_channel === true &&
            existingAccount.is_upload_avatar === true) {
          console.log(`⏭️  Skip: ${account.email} (đã có Authenticator, Channel và Avatar)\n`);
          continue;
        }
        
        // Use existing avatar_url from DB if available
        if (existingAccount) {
          account.avatar_url = existingAccount.avatar_url;
        }
        
        accountsToProcess.push(account);
        processedEmails.add(account.email); // Mark as processed
      }

      if (accountsToProcess.length === 0) {
        return res.json({
          success: true,
          message: 'All accounts already have authenticator, channel and avatar',
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
            return setupSingleAccountWithBrowser(account);
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

  // Retry verify authenticator and create channel for specific account by ID
  async retryVerifyById(req, res) {
      try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Account ID is required'
        });
      }

      // Find account in database
      const account = await AccountYoutube.findByPk(id);
      
      if (!account) {
        return res.status(404).json({
          success: false,
          message: `Account with ID ${id} not found`
        });
      }

      console.log(`\n🔄 Retrying verify for account: ${account.email}`);
      console.log(`📋 Account info from DB:`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Channel Name: "${account.channel_name}"`);
      console.log(`   is_authenticator: ${account.is_authenticator}`);
      console.log(`   is_create_channel: ${account.is_create_channel}`);
      console.log(`   code_authenticators: ${account.code_authenticators ? 'EXISTS' : 'NULL'}`);
      
      // Prepare account object for processing
      const accountData = {
        email: account.email,
        password: account.password,
        recoveryEmail: account.recovery_email,
        channel_name: account.channel_name  // ✅ Use correct field from DB
      };

      console.log(`📤 Account data to process:`);
      console.log(`   channel_name: "${accountData.channel_name}"`);

      // Process with existing function
      const result = await setupSingleAccountWithBrowser(accountData);

      // Refetch account from database to get latest status
      const updatedAccount = await AccountYoutube.findByPk(id);
      
      // Return result with updated status
      if (result.success) {
        console.log(`✅ Successfully verified account: ${account.email}`);
        
        return res.json({
          success: true,
          message: 'Account verified and channel created successfully',
          data: {
            id: updatedAccount.id,
            email: updatedAccount.email,
            channelName: updatedAccount.channel_name,
            channelLink: updatedAccount.channel_link,
            is_authenticator: updatedAccount.is_authenticator,
            is_create_channel: updatedAccount.is_create_channel
          }
        });
      } else {
        console.log(`❌ Failed to verify account: ${account.email}`);
        
        return res.status(400).json({
          success: false,
          message: 'Failed to verify account',
          error: result.error,
          data: {
            id: updatedAccount.id,
            email: updatedAccount.email,
            is_authenticator: updatedAccount.is_authenticator,
            is_create_channel: updatedAccount.is_create_channel
          }
        });
      }

    } catch (error) {
      console.error('Error retrying verify:', error);
      return res.status(500).json({
        success: false,
        message: 'Error retrying verify',
        error: error.message
      });
    }
  }
}

// Setup single account with its own browser instance
async function setupSingleAccountWithBrowser(account) {
  let browser = null;
  
  try {
    console.log(`\n🌐 [${account.email}] Launching browser...`);
    
    // Use HEADLESS_AUTHENTICATOR for authenticator setup
    const headless = process.env.HEADLESS_AUTHENTICATOR === 'true';
    
    // ❌ DO NOT use profile for import/verify - always start fresh
    // Launch browser WITHOUT profile to ensure clean state
    browser = await browserService.launchBrowser(headless, null); // Pass null to skip profile
    
    const result = await setupSingleAccount(browser, account, { 
      profileEmail: null  // Explicitly no profile
    });
    
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

async function setupSingleAccount(browser, account, options = {}) {
  const page = await browserService.createPage(browser);
  
  try {
    // Always clear session for import/verify - start fresh
    const usingProfile = false; // Never use profile for import/verify
    console.log(`🆕 Starting fresh - clearing any existing session`);
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
      console.log('\n✅ Account đã có Authenticator, skip setup 2FA');
      console.log(`🔑 Secret key: ${secretKey.substring(0, 4)}...${secretKey.substring(secretKey.length - 4)}`);
      skipAuth = true;
      
      // Login fresh (no profile)
      console.log('🔐 Đang login fresh (no cached session)...');
      await googleAuthService.login(page, account.email, account.password);
      console.log('✅ Login thành công, sẵn sàng kiểm tra channel');
      
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
          last_login_at: new Date()
        });
      }

      console.log('💾 Đã lưu Authenticator vào database');
    }

    // Check if need to create YouTube channel
    console.log('\n🔍 Checking channel status...');
    const accountAfterAuth = await AccountYoutube.findOne({
      where: { email: account.email }
    });

    console.log(`   is_authenticator: ${accountAfterAuth.is_authenticator} (type: ${typeof accountAfterAuth.is_authenticator})`);
    console.log(`   is_create_channel: ${accountAfterAuth.is_create_channel} (type: ${typeof accountAfterAuth.is_create_channel})`);
    console.log(`   channel_link: ${accountAfterAuth.channel_link || 'null'}`);

    let channelInfo = { name: '', link: '' };
    let avatarUploaded = false;
    let avatarName = '';

    // Skip channel creation AND avatar upload if is_create_channel is already true
    // Check both true and 1 (in case of DB type inconsistency)
    if (accountAfterAuth.is_create_channel === true || accountAfterAuth.is_create_channel === 1) {
      console.log('✅ Account đã có channel (is_create_channel=true), skip tạo channel và upload avatar');
      channelInfo.link = accountAfterAuth.channel_link;
      channelInfo.name = accountAfterAuth.channel_name;
      
      // DON'T logout - preserve session/cookies
      // await googleAuthService.logout(page);
      console.log('✅ Giữ session (không logout để preserve cookies)');
      
      await page.close();

      return {
        email: account.email,
        password: account.password,
        channel_name: account.channel_name,
        success: true,
        secretKey: secretKey,
        otpCode: totp,
        skippedAuth: skipAuth,
        channelCreated: false, // Already existed
        channelLink: channelInfo.link,
        avatarUploaded: false, // Skipped
        avatar: '',
        skippedChannel: true // Flag to indicate we skipped channel creation
      };
    }

    // Create channel if not exists
    if (!accountAfterAuth.is_create_channel || !accountAfterAuth.channel_link) {
      try {
        console.log('\n📺 Đang tạo YouTube channel...');
        
        const channelName = account.channel_name || `Channel ${account.email.split('@')[0]}`;
        console.log(`📝 Channel name từ DB: "${accountAfterAuth.channel_name}"`);
        console.log(`📝 Channel name sẽ dùng: "${channelName}"`);
        
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

    // Upload avatar if channel exists and not yet uploaded
    if (channelInfo.link && !accountAfterAuth.is_upload_avatar) {
      try {
        console.log('\n🖼️  Đang upload avatar...');
        
        const avatarsDir = path.join(__dirname, '../../avatars');
        const fs = require('fs');
        let avatarPath = null;
        
        // Check if avatar already downloaded
        if (accountAfterAuth.image_name && fs.existsSync(path.join(avatarsDir, accountAfterAuth.image_name))) {
          avatarPath = path.join(avatarsDir, accountAfterAuth.image_name);
          console.log(`📸 Using downloaded avatar: ${accountAfterAuth.image_name}`);
        } else if (accountAfterAuth.avatar_url) {
          // Download now
          console.log(`📥 Downloading avatar from Facebook...`);
          const fileName = `avatar_${account.email.split('@')[0]}_${Date.now()}`;
          avatarPath = await facebDownloader.downloadAvatar(
            accountAfterAuth.avatar_url,
            avatarsDir,
            fileName
          );
          const imageName = path.basename(avatarPath);
          avatarName = imageName;
          
          // Save image_name to DB
          await AccountYoutube.update(
            { image_name: imageName },
            { where: { email: account.email } }
          );
          console.log(`💾 Saved image_name: ${imageName}`);
        }
        
        if (avatarPath) {
          // Extract channel ID
          const { fileHelper } = require('../helpers');
          const channelId = fileHelper.extractChannelId(channelInfo.link);
          
          if (channelId) {
            const youtubeService = require('../services/youtube.service');
            await youtubeService.uploadAvatar(page, channelId, avatarPath);
            avatarUploaded = true;
            avatarName = path.basename(avatarPath);
            
            // Mark avatar as uploaded
            await AccountYoutube.update(
              { is_upload_avatar: true },
              { where: { email: account.email } }
            );
            
            console.log('✅ Đã upload avatar');
          } else {
            console.log('⚠️  Không thể extract channel ID');
          }
        } else {
          console.log('ℹ️  Không có avatar để upload');
        }
      } catch (avatarError) {
        console.error('⚠️  Lỗi upload avatar:', avatarError.message);
        // Continue even if avatar upload fails
      }
    } else if (accountAfterAuth.is_upload_avatar) {
      console.log('✅ Avatar đã được upload trước đó');
    }

    console.log('🎉 Setup hoàn tất!');

    // DON'T logout - preserve session/cookies
    // await googleAuthService.logout(page);
    console.log('✅ Giữ session (không logout để preserve cookies)');
    
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
    
    try { await page.close(); } catch(e) {}
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
