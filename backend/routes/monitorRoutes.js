const express = require('express');
const router = express.Router();
const { getMonitorStats, streamMonitor } = require('../controllers/monitorController');

// Real-time monitor stats
router.get('/stats', getMonitorStats);

// SSE stream for live article updates
router.get('/stream', streamMonitor);

module.exports = router;
