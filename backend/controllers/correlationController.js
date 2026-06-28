const { getCorrelationMatrix } = require('../services/correlationService');

const getMatrix = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const minMentions = Math.min(parseInt(req.query.minMentions) || 5, 20);

    const result = await getCorrelationMatrix(days, minMentions);
    res.json(result);
  } catch (error) {
    console.error('Correlation matrix error:', error);
    res.status(500).json({ error: 'Failed to generate correlation matrix' });
  }
};

module.exports = { getMatrix };
