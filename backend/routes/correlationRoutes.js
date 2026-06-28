const express = require('express');
const router = express.Router();
const { getMatrix } = require('../controllers/correlationController');
const { protect } = require('../middleware/auth');

router.get('/matrix', protect, getMatrix);

module.exports = router;
