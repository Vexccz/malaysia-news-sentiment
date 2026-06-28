/**
 * Sentiment Momentum Indicator
 * Calculates rate of change: sentiment this week vs last week
 */

const Article = require('../models/Article');

/**
 * Calculate sentiment momentum for an article's topic/source
 * @param {string} source - News source
 * @param {string} topic - Article topic
 * @returns {object} - { direction: 'up'|'down'|'stable', change: number, thisWeek: number, lastWeek: number }
 */
async function getSentimentMomentum(source, topic) {
  const now = new Date();
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  
  // Get this week's articles
  const thisWeek = await Article.find({
    source: source,
    topic: topic,
    publishedAt: { $gte: thisWeekStart }
  }).select('sentiment').lean();
  
  // Get last week's articles
  const lastWeek = await Article.find({
    source: source,
    topic: topic,
    publishedAt: { $gte: lastWeekStart, $lt: thisWeekStart }
  }).select('sentiment').lean();
  
  // Calculate average sentiment scores
  const calcAvg = (articles) => {
    if (articles.length === 0) return 0;
    const pos = articles.filter(a => a.sentiment === 'Positive').length;
    const neg = articles.filter(a => a.sentiment === 'Negative').length;
    return (pos - neg) / articles.length;
  };
  
  const thisWeekAvg = calcAvg(thisWeek);
  const lastWeekAvg = calcAvg(lastWeek);
  const change = thisWeekAvg - lastWeekAvg;
  
  // Determine direction
  let direction = 'stable';
  if (change > 0.1) direction = 'up';
  else if (change < -0.1) direction = 'down';
  
  return {
    direction,
    change: parseFloat(change.toFixed(2)),
    thisWeek: parseFloat(thisWeekAvg.toFixed(2)),
    lastWeek: parseFloat(lastWeekAvg.toFixed(2)),
    thisWeekCount: thisWeek.length,
    lastWeekCount: lastWeek.length
  };
}

module.exports = { getSentimentMomentum };
