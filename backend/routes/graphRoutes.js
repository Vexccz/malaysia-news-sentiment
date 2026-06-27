const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGraphOverview, getEntityEgo } = require('../controllers/graphController');

router.get('/overview', protect, getGraphOverview);
router.get('/entity/:name', protect, getEntityEgo);

module.exports = router;
