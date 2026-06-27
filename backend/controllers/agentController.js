const {
  detectSentimentSpikes,
  findTrendingEntities,
  detectAnomalies,
  generateAgentInsights,
} = require('../services/agentService');

/**
 * GET /api/v1/agent/insights
 * Get all agent insights (spikes, trending, anomalies)
 */
const getInsights = async (req, res) => {
  try {
    const insights = await generateAgentInsights();
    res.json(insights);
  } catch (err) {
    console.error('[Agent] getInsights error:', err.message);
    res.status(500).json({ error: 'Failed to generate agent insights' });
  }
};

/**
 * GET /api/v1/agent/spikes
 * Get sentiment spikes only
 */
const getSpikes = async (req, res) => {
  try {
    const spikes = await detectSentimentSpikes();
    res.json({ spikes, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/v1/agent/trending?hours=6
 * Get trending entities
 */
const getTrending = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 6;
    const trending = await findTrendingEntities(hours);
    res.json({ trending, hours, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/v1/agent/anomalies
 * Get detected anomalies
 */
const getAnomalies = async (req, res) => {
  try {
    const anomalies = await detectAnomalies();
    res.json({ anomalies, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getInsights, getSpikes, getTrending, getAnomalies };
