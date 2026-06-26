const express = require('express');
const router = express.Router();
const { getShareData, getEmbedCode, getOgImage } = require('../controllers/shareController');

// Public routes - no auth needed
router.get('/share/:articleId', getShareData);
router.get('/share/:articleId/og', getOgImage);
router.get('/embed/:articleId', getEmbedCode);

module.exports = router;
