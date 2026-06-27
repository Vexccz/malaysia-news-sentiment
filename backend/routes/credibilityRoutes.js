const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getSources, getSourceByName, analyzeSource, seedSources, getSourceBias, recalculateAllBias } = require('../controllers/credibilityController');

router.get('/',              protect, getSources);
router.post('/bias/recalculate', protect, authorize('admin'), recalculateAllBias);
router.get('/bias/:sourceName', protect, getSourceBias);
router.get('/:sourceName',   protect, getSourceByName);
router.post('/analyze',      protect, authorize('admin'), analyzeSource);
router.post('/seed',         protect, authorize('admin'), seedSources);

module.exports = router;
