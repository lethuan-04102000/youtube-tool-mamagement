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
      searchBy = 'all' // 'email', 'channelName', 'all'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build search condition
    let whereCondition = {};
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

    // Query database with pagination
    const { count, rows } = await AccountYoutube.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'email', 'channel_name', 'channel_link'],
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    // Format data to match frontend expectations
    const accounts = rows.map(account => ({
      id: account.id,
      email: account.email,
      channelName: account.channel_name || '',
      channelLink: account.channel_link || ''
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
