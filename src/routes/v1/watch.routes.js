const express = require('express');
const router = express.Router();
const watchController = require('../../controllers/watch.controller');

/**
 * POST /api/v1/watch/video
 * Watch a YouTube video with multiple tabs
 * 
 * Body:
 * - videoUrl: YouTube video URL (required)
 * - tabs: Number of tabs to open (default: 10)
 * - duration: Duration to watch in seconds (default: 30)
 * - useAccounts: Use logged in accounts (default: false)
 */
router.post('/video', (req, res) => watchController.watchVideo(req, res));

module.exports = router;
