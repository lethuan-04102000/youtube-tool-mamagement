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

/**
 * @route   GET /api/v1/accounts/export
 * @desc    Export all accounts as CSV
 * @access  Public
 */
router.get('/export', accountsController.exportAccounts);

/**
 * @route   GET /api/v1/accounts/open-browsers
 * @desc    Get list of open browsers
 * @access  Public
 */
router.get('/open-browsers', accountsController.getOpenBrowsers);

/**
 * @route   POST /api/v1/accounts/:id/open-browser
 * @desc    Open fresh browser for account (no profile, login from scratch)
 * @access  Public
 */
router.post('/:id/open-browser', accountsController.openBrowserWithProfile);

/**
 * @route   POST /api/v1/accounts/:id/close-browser
 * @desc    Close browser for account
 * @access  Public
 */
router.post('/:id/close-browser', accountsController.closeBrowser);

module.exports = router;

