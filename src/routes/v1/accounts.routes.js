const express = require('express');
const router = express.Router();
const accountsController = require('../../controllers/accounts.controller');

/**
 * @route   GET /api/v1/accounts
 * @desc    Get accounts list with pagination and search
 * @query   page, limit, search, searchBy
 * @access  Public
 */
router.get('/', accountsController.getAccounts);

module.exports = router;
