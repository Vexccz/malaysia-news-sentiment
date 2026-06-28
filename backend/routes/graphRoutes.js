const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGraphOverview, getEntityEgo, getEntityTimeline } = require('../controllers/graphController');

router.get('/overview', protect, getGraphOverview);
router.get('/entity/:name', protect, getEntityEgo);
router.get('/entity/:name/timeline', protect, getEntityTimeline);

// Entity sentiment breakdown by source
router.get('/entity/:name/sources', protect, async (req, res) => {
  const { getEntitySourceBreakdown } = require('../services/entitySourceBreakdown');
  try {
    const breakdown = await getEntitySourceBreakdown(req.params.name);
    res.json({ entity: req.params.name, sources: breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
