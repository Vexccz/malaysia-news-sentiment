const Article = require('../models/Article');

/**
 * AI Agent Dashboard Service
 * Autonomous monitoring: anomaly detection, trending entities, sentiment spikes
 */

/**
 * Detect sentiment spikes — compare last hour vs previous 23h average
 */
async function detectSentimentSpikes() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Last hour sentiment distribution
  const lastHour = await Article.aggregate([
    { $match: { publishedAt: { $gte: oneHourAgo } } },
    { $group: { _id: '$sentiment', count: { $sum: 1 } } },
  ]);

  // Previous 23h average (per hour)
  const prevHours = await Article.aggregate([
    { $match: { publishedAt: { $gte: oneDayAgo, $lt: oneHourAgo } } },
    { $group: { _id: '$sentiment', count: { $sum: 1 } } },
  ]);

  const lastHourMap = {};
  lastHour.forEach(h => { lastHourMap[h._id] = h.count; });

  const prevMap = {};
  prevHours.forEach(h => { prevMap[h._id] = h.count; });

  const spikes = [];
  ['Positive', 'Negative', 'Neutral'].forEach(sentiment => {
    const current = lastHourMap[sentiment] || 0;
    const prevAvg = (prevMap[sentiment] || 0) / 23;
    
    if (prevAvg > 0) {
      const change = ((current - prevAvg) / prevAvg) * 100;
      if (Math.abs(change) > 50) { // 50% change = spike
        spikes.push({
          sentiment,
          current,
          previousAvg: parseFloat(prevAvg.toFixed(1)),
          change: parseFloat(change.toFixed(1)),
          type: change > 0 ? 'surge' : 'drop',
        });
      }
    } else if (current > 5) {
      spikes.push({
        sentiment,
        current,
        previousAvg: 0,
        change: 100,
        type: 'surge',
      });
    }
  });

  return spikes;
}

/**
 * Find trending entities — entities with recent mentions increasing
 */
async function findTrendingEntities(hours = 6) {
  const recent = new Date(Date.now() - hours * 60 * 60 * 1000);
  const older = new Date(Date.now() - (hours * 2) * 60 * 60 * 1000);

  // Recent mentions
  const recentMentions = await Article.aggregate([
    { $match: { publishedAt: { $gte: recent }, entities: { $exists: true, $ne: [] } } },
    { $unwind: '$entities' },
    { $group: { _id: '$entities', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  // Older mentions (baseline)
  const olderMentions = await Article.aggregate([
    { $match: { publishedAt: { $gte: older, $lt: recent }, entities: { $exists: true, $ne: [] } } },
    { $unwind: '$entities' },
    { $group: { _id: '$entities', count: { $sum: 1 } } },
  ]);

  const olderMap = {};
  olderMentions.forEach(m => { olderMap[m._id] = m.count; });

  const trending = recentMentions.map(entity => {
    const prevCount = olderMap[entity._id] || 0;
    const change = prevCount > 0 ? ((entity.count - prevCount) / prevCount) * 100 : 100;
    
    return {
      entity: entity._id,
      recentCount: entity.count,
      previousCount: prevCount,
      change: parseFloat(change.toFixed(1)),
      trending: change > 30,
    };
  }).filter(e => e.trending).slice(0, 10);

  return trending;
}

/**
 * Detect anomalies — outlier articles (unusual sentiment, source, or volume)
 */
async function detectAnomalies() {
  const anomalies = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Anomaly 1: Source volume spike (source with >3x normal volume)
  const sourceVolume = await Article.aggregate([
    { $match: { publishedAt: { $gte: oneDayAgo } } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const avgVolume = sourceVolume.reduce((s, v) => s + v.count, 0) / sourceVolume.length;
  sourceVolume.forEach(source => {
    if (source.count > avgVolume * 3 && source.count > 10) {
      anomalies.push({
        type: 'source_volume_spike',
        source: source._id,
        count: source.count,
        average: parseFloat(avgVolume.toFixed(1)),
        severity: 'medium',
      });
    }
  });

  // Anomaly 2: Sentiment imbalance (source with >70% one sentiment)
  const sourceSentiment = await Article.aggregate([
    { $match: { publishedAt: { $gte: oneDayAgo } } },
    { $group: { _id: { source: '$source', sentiment: '$sentiment' }, count: { $sum: 1 } } },
  ]);

  const sourceTotals = {};
  const sourceSentMap = {};
  sourceSentiment.forEach(s => {
    const src = s._id.source;
    sourceTotals[src] = (sourceTotals[src] || 0) + s.count;
    if (!sourceSentMap[src]) sourceSentMap[src] = {};
    sourceSentMap[src][s._id.sentiment] = s.count;
  });

  Object.entries(sourceSentMap).forEach(([source, sentiments]) => {
    const total = sourceTotals[source];
    if (total < 10) return;

    Object.entries(sentiments).forEach(([sentiment, count]) => {
      const pct = (count / total) * 100;
      if (pct > 70) {
        anomalies.push({
          type: 'sentiment_imbalance',
          source,
          sentiment,
          percentage: parseFloat(pct.toFixed(1)),
          total,
          severity: 'low',
        });
      }
    });
  });

  return anomalies.slice(0, 10);
}

/**
 * Generate agent insights summary
 */
async function generateAgentInsights() {
  const [spikes, trending, anomalies] = await Promise.all([
    detectSentimentSpikes(),
    findTrendingEntities(6),
    detectAnomalies(),
  ]);

  const insights = [];

  // Summarize spikes
  if (spikes.length > 0) {
    const surgeCount = spikes.filter(s => s.type === 'surge').length;
    const dropCount = spikes.filter(s => s.type === 'drop').length;
    
    if (surgeCount > 0) {
      insights.push({
        type: 'sentiment_surge',
        message: `${surgeCount} sentiment surge(s) detected in the last hour`,
        details: spikes.filter(s => s.type === 'surge'),
        priority: 'high',
      });
    }
    if (dropCount > 0) {
      insights.push({
        type: 'sentiment_drop',
        message: `${dropCount} sentiment drop(s) detected in the last hour`,
        details: spikes.filter(s => s.type === 'drop'),
        priority: 'medium',
      });
    }
  }

  // Summarize trending
  if (trending.length > 0) {
    insights.push({
      type: 'trending_entities',
      message: `${trending.length} entities trending in the last 6 hours`,
      details: trending,
      priority: 'medium',
    });
  }

  // Summarize anomalies
  if (anomalies.length > 0) {
    insights.push({
      type: 'anomalies',
      message: `${anomalies.length} anomalies detected in the last 24 hours`,
      details: anomalies,
      priority: anomalies.some(a => a.severity === 'high') ? 'high' : 'low',
    });
  }

  return {
    insights,
    spikes,
    trending,
    anomalies,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  detectSentimentSpikes,
  findTrendingEntities,
  detectAnomalies,
  generateAgentInsights,
};
