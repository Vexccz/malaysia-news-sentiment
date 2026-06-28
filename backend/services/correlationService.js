/**
 * Sentiment Correlation Matrix Service
 * Analyzes how entity sentiments move together over time
 */
const Article = require('../models/Article');

async function getCorrelationMatrix(days = 30, minMentions = 5) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all entities mentioned in articles within timeframe
  const entities = await Article.aggregate([
    { $match: { publishedAt: { $gte: startDate }, entities: { $exists: true, $ne: [] } } },
    { $unwind: '$entities' },
    { $group: { _id: '$entities', count: { $sum: 1 } } },
    { $match: { count: { $gte: minMentions } } },
    { $sort: { count: -1 } },
    { $limit: 30 }, // Top 30 entities
  ]);

  const entityNames = entities.map(e => e._id);

  // Get daily sentiment scores per entity
  const dailySentiments = await Article.aggregate([
    { 
      $match: { 
        publishedAt: { $gte: startDate },
        entities: { $exists: true, $ne: [] }
      }
    },
    { $unwind: '$entities' },
    { $match: { entities: { $in: entityNames } } },
    {
      $group: {
        _id: {
          entity: '$entities',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' } }
        },
        positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
        neutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] }, 1, 0] } },
        total: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 1,
        score: {
          $cond: [
            { $eq: ['$total', 0] },
            0,
            { $divide: [{ $subtract: ['$positive', '$negative'] }, '$total'] }
          ]
        }
      }
    }
  ]);

  // Build entity -> { date -> score } map
  const entityScores = {};
  dailySentiments.forEach(d => {
    const entity = d._id.entity;
    const date = d._id.date;
    if (!entityScores[entity]) entityScores[entity] = {};
    entityScores[entity][date] = d.score;
  });

  // Get all dates
  const allDates = new Set();
  Object.values(entityScores).forEach(scores => {
    Object.keys(scores).forEach(date => allDates.add(date));
  });
  const dates = Array.from(allDates).sort();

  // Calculate Pearson correlation between each entity pair
  const correlations = [];
  for (let i = 0; i < entityNames.length; i++) {
    for (let j = i; j < entityNames.length; j++) {
      const e1 = entityNames[i];
      const e2 = entityNames[j];
      
      const scores1 = [];
      const scores2 = [];
      
      dates.forEach(date => {
        const s1 = entityScores[e1]?.[date] || 0;
        const s2 = entityScores[e2]?.[date] || 0;
        scores1.push(s1);
        scores2.push(s2);
      });

      const corr = pearsonCorrelation(scores1, scores2);
      
      correlations.push({
        entity1: e1,
        entity2: e2,
        correlation: isNaN(corr) ? 0 : parseFloat(corr.toFixed(3)),
        days: dates.length
      });
    }
  }

  return {
    entities: entityNames,
    correlations,
    days,
    minMentions
  };
}

function pearsonCorrelation(x, y) {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

module.exports = { getCorrelationMatrix };
