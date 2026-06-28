const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSourceCredibility } = require('../controllers/sourceController');
const { getSourceReliability, getAllReliability } = require('../controllers/reliabilityController');

// GET /api/sources/credibility
router.get('/credibility', protect, getSourceCredibility);

// GET /api/sources/:name/reliability — dynamic trend for one source
router.get('/:name/reliability', protect, getSourceReliability);

// GET /api/sources/reliability/all — all sources reliability
router.get('/reliability/all', protect, getAllReliability);

module.exports = router;
