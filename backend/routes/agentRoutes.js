const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getInsights, getSpikes, getTrending, getAnomalies } = require('../controllers/agentController');

router.get('/insights', protect, getInsights);
router.get('/spikes', protect, getSpikes);
router.get('/trending', protect, getTrending);
router.get('/anomalies', protect, getAnomalies);

module.exports = router;
