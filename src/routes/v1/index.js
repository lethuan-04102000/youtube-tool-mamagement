const express = require('express');
const router = express.Router();

const verifyRoutes = require('./verify.routes');
const youtubeRoutes = require('./youtube.routes');
const watchRoutes = require('./watch.routes');
const loginRoutes = require('./login.routes');
const uploadRoutes = require('./upload.routes');

// Mount routes
router.use('/authenticator', verifyRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/watch', watchRoutes);
router.use('/login', loginRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;
