const { AccountYoutube } = require('../models');
const { Op } = require('sequelize');
const { successListResponse, errorResponse } = require('../helpers/response.helper');

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
