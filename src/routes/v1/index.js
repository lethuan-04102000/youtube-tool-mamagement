const express = require('express');
const router = express.Router();

const verifyRoutes = require('./verify.routes');
const youtubeRoutes = require('./youtube.routes');
const watchRoutes = require('./watch.routes');
const accountsRoutes = require('./accounts.routes');

// Mount routes
router.use('/authenticator', verifyRoutes);
router.use('/youtube', youtubeRoutes);
router.use('/watch', watchRoutes);
router.use('/accounts', accountsRoutes);

module.exports = router;
