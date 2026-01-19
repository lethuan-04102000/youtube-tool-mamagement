const express = require('express');
const router = express.Router();
const watchController = require('../../controllers/watch.controller');

/**
 * POST /api/v1/watch/video
 * POST /api/v1/watch
 * Watch a YouTube video with multiple tabs
 * 
 * Body:
 * - videoUrl: YouTube video URL (required)
 * - tabs: Number of tabs to open (default: 1)
 * - duration: Duration to watch in seconds (default: 30)
 * - useAccounts: Use logged in accounts with channels from DB (default: false)
 * - humanBehavior: Enable human-like behavior (default: true)
 * - randomDuration: Use random duration (default: false)
 * - autoSubscribe: Auto subscribe to channel (default: false)
 */
router.post('/video', (req, res) => watchController.watchVideo(req, res));
router.post('/', (req, res) => watchController.watchVideo(req, res));

module.exports = router;
