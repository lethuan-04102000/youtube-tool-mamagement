const express = require('express');
const router = express.Router();
const accountsController = require('../../controllers/accounts.controller');
const upload = require('../../middlewares/upload');

/**
 * @route   GET /api/v1/accounts
 * @desc    Get accounts list with pagination and search
 * @query   page, limit, search, searchBy
 * @access  Public
 */
router.get('/', accountsController.getAccounts);

/**
 * @route   POST /api/v1/accounts/update-avatar-urls
 * @desc    Update avatar URLs from CSV file
 * @access  Public
 */
router.post('/update-avatar-urls', upload.fields([{ name: 'file', maxCount: 1 }]), accountsController.updateAvatarUrls);

module.exports = router;
