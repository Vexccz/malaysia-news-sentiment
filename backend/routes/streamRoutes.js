const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRecentStream, getStreamLength } = require('../services/streamService');

/**
 * GET /api/v1/stream/recent?limit=20
 * Returns last N article events from the Redis stream.
 * Used by frontend on initial Dashboard load so users see recent
 * activity even if they connect after the broadcast happened.
 */
router.get('/recent', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const entries = await getRecentStream(limit);
    res.json({ count: entries.length, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/stream/health
 * Lightweight check — returns current stream length.
 */
router.get('/health', async (req, res) => {
  try {
    const length = await getStreamLength();
    res.json({
      ok: true,
      streamLength: length,
      upstashConfigured: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
