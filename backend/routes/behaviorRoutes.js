const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { trackAction, getStats, getInsights } = require('../controllers/behaviorController');

// Track a user action
router.post('/track', protect, trackAction);

// Get user behavior statistics
router.get('/stats', protect, getStats);

// Get AI-generated insights
router.get('/insights', protect, getInsights);

module.exports = router;
