const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAdvancedAnalytics } = require('../controllers/analyticsController');

router.get('/advanced', protect, getAdvancedAnalytics);

module.exports = router;
