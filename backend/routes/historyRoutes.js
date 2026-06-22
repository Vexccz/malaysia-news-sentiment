const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { getHistory, getTrends, getStats, deleteArticle, dashboardInit, getPublicStats, cleanupUnclassified, getArticleById } = require('../controllers/historyController');

// Public route (no auth) - for landing page
router.get('/public-stats', getPublicStats);

// All routes protected (#3)
router.get('/dashboard-init', protect, dashboardInit); // Performance #15: composite endpoint
router.get('/',        protect, getHistory);
router.get('/trends',  protect, getTrends);
router.get('/stats',   protect, getStats);
router.delete('/cleanup', protect, cleanupUnclassified);
router.get('/:id',    protect, getArticleById);
router.delete('/:id',  protect, deleteArticle);

module.exports = router;
