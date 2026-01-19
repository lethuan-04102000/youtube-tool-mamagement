const express = require('express');
const router = express.Router();
const youtubeController = require('../../controllers/youtube.controller');

// Create YouTube channels for accounts
router.post('/create-channel', youtubeController.createChannels);

// Upload avatars for channels
router.post('/upload-avatar', youtubeController.uploadAvatars);

module.exports = router;
