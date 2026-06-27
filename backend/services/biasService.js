const Article = require('../models/Article');
const Source = require('../models/Source');

/**
 * Quantify source bias from historical sentiment patterns
 * Bias score: -1 (strongly negative) to +1 (strongly positive)
 * Based on sentiment distribution across all articles from that source
 */
async function calculateSourceBias(sourceName, days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    {
      $match: {
        source: sourceName,
        publishedAt: { $gte: startDate },
        sentiment: { $in: ['Positive', 'Negative', 'Neutral'] },
      },
    },
    {
      $group: {
        _id: '$sentiment',
        count: { $sum: 1 },
      },
    },
  ];

  const results = await Article.aggregate(pipeline);
  
  const counts = { Positive: 0, Negative: 0, Neutral: 0 };
  results.forEach(r => { counts[r._id] = r.count; });

  const total = counts.Positive + counts.Negative + counts.Neutral;
  if (total < 5) {
    return { biasScore: 0, sentimentSkew: 'unknown', total, counts };
  }

  const posRate = counts.Positive / total;
  const negRate = counts.Negative / total;
  const neuRate = counts.Neutral / total;

  // Bias score: weighted average (Positive=+1, Neutral=0, Negative=-1)
  const biasScore = (posRate * 1) + (neuRate * 0) + (negRate * -1);

  // Sentiment skew classification
  let sentimentSkew;
  if (Math.abs(biasScore) < 0.1) sentimentSkew = 'balanced';
  else if (biasScore > 0.1) sentimentSkew = 'positive';
  else sentimentSkew = 'negative';

  return {
    biasScore: parseFloat(biasScore.toFixed(3)),
    sentimentSkew,
    total,
    counts,
    rates: {
      positive: parseFloat(posRate.toFixed(3)),
      negative: parseFloat(negRate.toFixed(3)),
      neutral: parseFloat(neuRate.toFixed(3)),
    },
  };
}

/**
 * Update all sources with bias scores
 */
async function updateAllBiasScores(days = 90) {
  const sources = await Source.find({}).lean();
  const results = [];

  for (const source of sources) {
    const bias = await calculateSourceBias(source.name, days);
    
    await Source.findByIdAndUpdate(source._id, {
      biasScore: bias.biasScore,
      sentimentSkew: bias.sentimentSkew,
      lastBiasUpdate: new Date(),
    });

    results.push({
      source: source.name,
      biasScore: bias.biasScore,
      sentimentSkew: bias.sentimentSkew,
      total: bias.total,
      rates: bias.rates,
    });
  }

  return results;
}

module.exports = { calculateSourceBias, updateAllBiasScores };
