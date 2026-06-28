const { computeSourceReliability, computeAllSourceReliability } = require('../services/sourceReliabilityService');

/**
 * GET /api/v1/sources/:name/reliability
 * Dynamic reliability trend for a specific source
 */
const getSourceReliability = async (req, res) => {
  try {
    const { name } = req.params;
    const days = Math.min(parseInt(req.query.days) || 90, 180);
    
    const result = await computeSourceReliability(name, days);
    res.json(result);
  } catch (error) {
    console.error('Source reliability error:', error);
    res.status(500).json({ error: 'Failed to compute reliability' });
  }
};

/**
 * GET /api/v1/sources/reliability/all
 * Reliability scores for all active sources
 */
const getAllReliability = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 90, 180);
    
    const results = await computeAllSourceReliability(days);
    res.json({ sources: results, days });
  } catch (error) {
    console.error('All reliability error:', error);
    res.status(500).json({ error: 'Failed to compute reliability' });
  }
};

module.exports = { getSourceReliability, getAllReliability };
