const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getEntityGraph, searchEntities, getEntityDetail, getTrendingEntities } = require('../controllers/entityController');

router.get('/graph', protect, getEntityGraph);
router.get('/trending', protect, getTrendingEntities);
router.get('/search', protect, searchEntities);
router.get('/:name', protect, getEntityDetail);

module.exports = router;
