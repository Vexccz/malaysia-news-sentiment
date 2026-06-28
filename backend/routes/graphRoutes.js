const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGraphOverview, getEntityEgo, getEntityTimeline } = require('../controllers/graphController');

router.get('/overview', protect, getGraphOverview);
router.get('/entity/:name', protect, getEntityEgo);
router.get('/entity/:name/timeline', protect, getEntityTimeline);

module.exports = router;
