/**
 * Dynamic Source Reliability Service
 * Computes credibility scores from actual article data over time
 */
const Article = require('../models/Article');
const Source = require('../models/Source');

/**
 * Calculate dynamic reliability metrics for a source
 * Based on: sentiment consistency, reader agreement, entity coverage, publication frequency
 */
async function computeSourceReliability(sourceName, days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all articles from this source in timeframe
  const articles = await Article.find({
    source: sourceName,
    publishedAt: { $gte: startDate },
  }).select('sentiment publishedAt entities confidence feedback').lean();

  if (articles.length < 3) {
    return { source: sourceName, score: null, trend: [], reason: 'Insufficient data (need 3+ articles)' };
  }

  // 1. Sentiment consistency — does the source maintain balanced coverage?
  const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
  articles.forEach(a => { sentimentCounts[a.sentiment] = (sentimentCounts[a.sentiment] || 0) + 1; });
  const total = articles.length;
  const maxPct = Math.max(...Object.values(sentimentCounts)) / total;
  const consistencyScore = Math.round((1 - Math.abs(maxPct - 0.33) / 0.67) * 100);

  // 2. Reader agreement — do readers agree with AI sentiment?
  let agreementCount = 0;
  let votedCount = 0;
  articles.forEach(a => {
    const fb = a.feedback;
    if (fb && (fb.Positive + fb.Negative + fb.Neutral) > 0) {
      votedCount++;
      const readerVotes = fb.Positive + fb.Negative + fb.Neutral;
      let readerSentiment = 'Neutral';
      if (fb.Positive > fb.Negative && fb.Positive > fb.Neutral) readerSentiment = 'Positive';
      else if (fb.Negative > fb.Positive && fb.Negative > fb.Neutral) readerSentiment = 'Negative';
      if (readerSentiment === a.sentiment) agreementCount++;
    }
  });
  const agreementScore = votedCount > 0 ? Math.round((agreementCount / votedCount) * 100) : 50;

  // 3. Entity depth — average entities per article (more = deeper coverage)
  const avgEntities = articles.reduce((sum, a) => sum + (a.entities?.length || 0), 0) / total;
  const depthScore = Math.min(Math.round(avgEntities * 15), 100);

  // 4. Confidence consistency — average NLP confidence
  const avgConfidence = articles.reduce((sum, a) => sum + (a.confidence || 0.5), 0) / total;
  const confidenceScore = Math.round(avgConfidence * 100);

  // 5. Publication frequency — articles per week
  const weeks = days / 7;
  const freqPerWeek = total / weeks;
  const frequencyScore = Math.min(Math.round(freqPerWeek * 10), 100);

  // Weighted composite score
  const compositeScore = Math.round(
    consistencyScore * 0.25 +
    agreementScore * 0.30 +
    depthScore * 0.15 +
    confidenceScore * 0.15 +
    frequencyScore * 0.15
  );

  // Trend: weekly scores over time
  const weeklyBuckets = {};
  articles.forEach(a => {
    const week = getWeekKey(a.publishedAt);
    if (!weeklyBuckets[week]) weeklyBuckets[week] = [];
    weeklyBuckets[week].push(a);
  });

  const trend = Object.entries(weeklyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, weekArticles]) => {
      const wc = { Positive: 0, Negative: 0, Neutral: 0 };
      weekArticles.forEach(a => { wc[a.sentiment] = (wc[a.sentiment] || 0) + 1; });
      const wt = weekArticles.length;
      const wMax = Math.max(...Object.values(wc)) / wt;
      const wConsistency = Math.round((1 - Math.abs(wMax - 0.33) / 0.67) * 100);
      const wConf = weekArticles.reduce((s, a) => s + (a.confidence || 0.5), 0) / wt;
      const wScore = Math.round(wConsistency * 0.5 + wConf * 50);
      return { week, score: wScore, articles: wt };
    });

  return {
    source: sourceName,
    score: compositeScore,
    breakdown: {
      consistency: consistencyScore,
      agreement: agreementScore,
      depth: depthScore,
      confidence: confidenceScore,
      frequency: frequencyScore,
    },
    trend,
    totalArticles: total,
    days,
  };
}

/**
 * Compute reliability for all active sources
 */
async function computeAllSourceReliability(days = 90) {
  const sources = await Article.aggregate([
    { $match: { publishedAt: { $gte: new Date(Date.now() - days * 86400000) } } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $match: { count: { $gte: 3 } } },
    { $sort: { count: -1 } },
  ]);

  const results = [];
  for (const { _id: name } of sources) {
    const reliability = await computeSourceReliability(name, days);
    results.push(reliability);
  }

  return results;
}

function getWeekKey(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const weekNum = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

module.exports = { computeSourceReliability, computeAllSourceReliability };
