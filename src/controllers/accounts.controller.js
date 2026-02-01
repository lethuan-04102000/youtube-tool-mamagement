const { AccountYoutube } = require('../models');
const { Op } = require('sequelize');
const { successListResponse, errorResponse } = require('../helpers/response.helper');
const csvService = require('../services/csv.service');

/**
 * Get accounts list with pagination and search
 */
exports.getAccounts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      searchBy = 'all', // 'email', 'channelName', 'all'
      status = 'all' // 'all', 'incomplete', 'complete'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build where condition
    let whereCondition = {};
    
    // Search filter
    if (search) {
      if (searchBy === 'email') {
        whereCondition.email = { [Op.like]: `%${search}%` };
      } else if (searchBy === 'channelName') {
        whereCondition.channel_name = { [Op.like]: `%${search}%` };
      } else {
        // Search in both email and channel name
        whereCondition[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { channel_name: { [Op.like]: `%${search}%` } }
        ];
      }
    }

    // Status filter
    if (status === 'incomplete') {
      // Accounts that don't have authenticator OR don't have channel
      whereCondition[Op.or] = [
        { is_authenticator: false },
        { is_authenticator: null },
        { is_create_channel: false },
        { is_create_channel: null }
      ];
    } else if (status === 'complete') {
      // Accounts that have both authenticator AND channel
      whereCondition.is_authenticator = true;
      whereCondition.is_create_channel = true;
    }
    // 'all' status: no additional filter

    // Query database with pagination
    const { count, rows } = await AccountYoutube.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'email', 'channel_name', 'channel_link', 'is_authenticator', 'is_create_channel'],
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Format data to match frontend expectations
    const accounts = rows.map(account => ({
      id: account.id,
      email: account.email,
      channelName: account.channel_name || '',
      channelLink: account.channel_link || '',
      isAuthenticator: account.is_authenticator || false,
      isCreateChannel: account.is_create_channel || false
    }));

    // Use helper function for response
    return res.json(successListResponse({
      items: accounts,
      total: count,
      page: pageNum,
      limit: limitNum
    }));

  } catch (error) {
    console.error('Error getting accounts:', error);
    return res.status(500).json(errorResponse('Failed to get accounts', error));
  }
};

/**
 * Update avatar URLs from CSV file
 */
exports.updateAvatarUrls = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const csvPath = req.files.file[0].path;
    console.log('📁 CSV Path:', csvPath);
    
    // Load accounts from CSV
    const accounts = csvService.loadAccountsFromCSV(csvPath);
    
    if (accounts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accounts found in CSV'
      });
    }

    console.log(`📊 Processing ${accounts.length} accounts...\n`);
    
    const results = {
      updated: 0,
      notFound: 0,
      skipped: 0,
      details: []
    };
    
    for (const account of accounts) {
      try {
        // Find account by email
        const existingAccount = await AccountYoutube.findOne({
          where: { email: account.email }
        });
        
        if (!existingAccount) {
          console.log(`⚠️  ${account.email} - NOT FOUND`);
          results.notFound++;
          results.details.push({
            email: account.email,
            status: 'not_found'
          });
          continue;
        }
        
        // Skip if no avatar_url in CSV
        if (!account.avatar_url) {
          console.log(`⏭️  ${account.email} - NO AVATAR URL`);
          results.skipped++;
          results.details.push({
            email: account.email,
            status: 'no_avatar_url'
          });
          continue;
        }
        
        // Update avatar_url
        await AccountYoutube.update(
          { avatar_url: account.avatar_url },
          { where: { email: account.email } }
        );
        
        console.log(`✅ ${account.email} - UPDATED`);
        console.log(`   avatar_url: ${account.avatar_url.substring(0, 50)}...`);
        results.updated++;
        results.details.push({
          email: account.email,
          status: 'updated',
          avatar_url: account.avatar_url
        });
        
      } catch (error) {
        console.error(`❌ ${account.email} - ERROR:`, error.message);
        results.details.push({
          email: account.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${results.updated}`);
    console.log(`   ⚠️  Not Found: ${results.notFound}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    
    // Clean up CSV file
    const fs = require('fs');
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    
    res.json({
      success: true,
      message: `Updated ${results.updated} accounts`,
      data: results
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
