const express = require('express');
const router = express.Router();
const { getForecast, getBacktest } = require('../controllers/forecastController');

// GET /api/forecast/backtest/:topic?history=90 (MUST be before /:topic)
router.get('/backtest/:topic', getBacktest);

// GET /api/forecast/:topic?days=14&history=60
router.get('/:topic', getForecast);

module.exports = router;
