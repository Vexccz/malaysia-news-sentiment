const mongoose = require('mongoose');
const Article = require('../models/Article');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ── In-memory cache — 5 min TTL ──────────────────────
let analyticsCache = { data: null, ts: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','was','are','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','this','that',
  'these','those','it','its','he','she','they','we','you','i','his','her',
  'their','our','your','my','as','if','so','than','then','when','where','how',
  'what','which','who','not','no','more','also','after','before','about','up',
  'out','over','new','says','said','akan','yang','di','ke','dari','dan','pada',
  'untuk','dengan','dalam','tidak','telah','bagi','ini','itu','ada','sudah',
  'antara','seperti','kerana','kini','masih','beliau','pernah','dapat','lain',
  'semua','setiap','malaysia','malaysian','bernama','astro','awani','fmt',
]);

/**
 * GET /api/v1/analytics/advanced
 * Returns aggregated data for all advanced analytics features.
 */
const getAdvancedAnalytics = async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ error: 'Database not connected', data: null });
  }

  // Return cached data if fresh
  if (analyticsCache.data && Date.now() - analyticsCache.ts < CACHE_TTL) {
    return res.json({ data: analyticsCache.data, cached: true });
  }

  try {
    const userId = req.userId;
    const match = {};

    if (userId && mongoose.Types.ObjectId.isValid(userId) && userId !== 'guest') {
      match.$or = [
        { userId: new mongoose.Types.ObjectId(userId) },
        { userId: null },
        { userId: { $exists: false } },
      ];
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }

    // ── 1. Source Bias Analysis (sentiment distribution per source) ──────
    const sourceBiasPromise = Article.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
          neutral:  { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] }, 1, 0] } },
          avgConfidence: { $avg: '$confidence' },
          avgImpact: { $avg: '$impactScore' },
        },
      },
      { $match: { total: { $gte: 3 } } },
      { $sort: { total: -1 } },
      { $limit: 12 },
      {
        $project: {
          source: '$_id', total: 1, positive: 1, negative: 1, neutral: 1,
          avgConfidence: { $round: ['$avgConfidence', 3] },
          avgImpact: { $round: ['$avgImpact', 1] },
          posRatio: { $round: [{ $divide: ['$positive', '$total'] }, 3] },
          negRatio: { $round: [{ $divide: ['$negative', '$total'] }, 3] },
          neuRatio: { $round: [{ $divide: ['$neutral', '$total'] }, 3] },
          _id: 0,
        },
      },
    ]);

    // ── 2. Day/Hour Heatmap (when articles are published) ───────────────
    const heatmapPromise = Article.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$publishedAt' },
            hour: { $hour: '$publishedAt' },
          },
          count: { $sum: 1 },
          avgSentiment: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ['$sentiment', 'Positive'] }, then: 1 },
                  { case: { $eq: ['$sentiment', 'Negative'] }, then: -1 },
                ],
                default: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          day: { $subtract: ['$_id.dayOfWeek', 1] }, // 0=Sun, 6=Sat
          hour: '$_id.hour',
          count: 1,
          avgSentiment: { $round: ['$avgSentiment', 3] },
          _id: 0,
        },
      },
    ]);

    // ── 3. Word Frequency Trends (top 10 words over recent days) ────────
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const wordTrendsPromise = Article.aggregate([
      { $match: { ...match, publishedAt: { $gte: thirtyDaysAgo } } },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' } },
          title: 1,
          description: 1,
        },
      },
      { $limit: 2000 },
    ]);

    // ── 4. Sentiment Correlation Matrix (between sources) ───────────────
    const correlationPromise = Article.aggregate([
      { $match: match },
      {
        $group: {
          _id: { source: '$source', sentiment: '$sentiment' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.source': 1 } },
    ]);

    // ── 5. Topic Clustering (keyword co-occurrence) ─────────────────────
    const topicClusteringPromise = Article.aggregate([
      { $match: match },
      { $sort: { publishedAt: -1 } },
      { $limit: 500 },
      { $project: { title: 1, description: 1, sentiment: 1 } },
    ]);

    // ── 6. Source Reliability Scores ────────────────────────────────────
    const reliabilityPromise = Article.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' },
          avgImpact: { $avg: '$impactScore' },
          alertCount: { $sum: { $cond: ['$isAlert', 1, 0] } },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
          neutral:  { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] }, 1, 0] } },
        },
      },
      { $match: { total: { $gte: 3 } } },
      { $sort: { total: -1 } },
      { $limit: 8 },
      {
        $project: {
          source: '$_id',
          total: 1,
          confidence: { $round: [{ $multiply: ['$avgConfidence', 100] }, 1] },
          impact: { $round: ['$avgImpact', 1] },
          alertRate: { $round: [{ $multiply: [{ $divide: ['$alertCount', '$total'] }, 100] }, 1] },
          consistency: {
            $round: [
              {
                $multiply: [
                  {
                    $subtract: [
                      1,
                      {
                        $divide: [
                          { $abs: { $subtract: ['$positive', { $divide: ['$total', 3] }] } },
                          '$total',
                        ],
                      },
                    ],
                  },
                  100,
                ],
              },
              1,
            ],
          },
          volume: { $min: [100, { $multiply: [{ $divide: ['$total', 50] }, 100] }] },
          _id: 0,
        },
      },
    ]);

    // Execute all in parallel
    const [sourceBias, heatmapRaw, articlesForWords, correlationRaw, topicArticles, reliability] =
      await Promise.all([
        sourceBiasPromise,
        heatmapPromise,
        wordTrendsPromise,
        correlationPromise,
        topicClusteringPromise,
        reliabilityPromise,
      ]);

    // ── Process Word Frequency Trends ───────────────────────────────────
    const wordDayMap = {}; // { word: { 'YYYY-MM-DD': count } }
    articlesForWords.forEach(({ date, title, description }) => {
      const words = `${title} ${description}`
        .toLowerCase()
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));
      words.forEach(w => {
        if (!wordDayMap[w]) wordDayMap[w] = {};
        wordDayMap[w][date] = (wordDayMap[w][date] || 0) + 1;
      });
    });

    // Get top 10 words overall
    const wordTotals = Object.entries(wordDayMap)
      .map(([word, dates]) => [word, Object.values(dates).reduce((a, b) => a + b, 0)])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topWords = wordTotals.map(([word]) => word);
    const allDates = [...new Set(articlesForWords.map(a => a.date))].sort();

    const wordTrends = allDates.map(date => {
      const entry = { date };
      topWords.forEach(word => {
        entry[word] = wordDayMap[word]?.[date] || 0;
      });
      return entry;
    });

    // ── Process Sentiment Correlation Matrix ────────────────────────────
    const sources = [...new Set(correlationRaw.map(c => c._id.source))].slice(0, 8);
    const sentimentMap = {};
    correlationRaw.forEach(({ _id: { source, sentiment }, count }) => {
      if (!sentimentMap[source]) sentimentMap[source] = { Positive: 0, Negative: 0, Neutral: 0, total: 0 };
      sentimentMap[source][sentiment] = count;
      sentimentMap[source].total += count;
    });

    // Build correlation: similarity between source sentiment distributions
    const correlationMatrix = sources.map(s1 => {
      const row = { source: s1 };
      sources.forEach(s2 => {
        if (s1 === s2) {
          row[s2] = 1.0;
        } else {
          const a = sentimentMap[s1] || { Positive: 0, Negative: 0, Neutral: 0, total: 1 };
          const b = sentimentMap[s2] || { Positive: 0, Negative: 0, Neutral: 0, total: 1 };
          // Cosine similarity of sentiment distributions
          const dot = (a.Positive / a.total) * (b.Positive / b.total) +
                      (a.Negative / a.total) * (b.Negative / b.total) +
                      (a.Neutral / a.total) * (b.Neutral / b.total);
          const magA = Math.sqrt((a.Positive / a.total) ** 2 + (a.Negative / a.total) ** 2 + (a.Neutral / a.total) ** 2);
          const magB = Math.sqrt((b.Positive / b.total) ** 2 + (b.Negative / b.total) ** 2 + (b.Neutral / b.total) ** 2);
          row[s2] = magA && magB ? Math.round((dot / (magA * magB)) * 100) / 100 : 0;
        }
      });
      return row;
    });

    // ── Process Topic Clustering ────────────────────────────────────────
    const topicFreq = {};
    topicArticles.forEach(({ title, description, sentiment }) => {
      const words = `${title} ${description}`
        .toLowerCase()
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));
      words.forEach(w => {
        if (!topicFreq[w]) topicFreq[w] = { count: 0, sentiment: { Positive: 0, Negative: 0, Neutral: 0 } };
        topicFreq[w].count++;
        topicFreq[w].sentiment[sentiment] = (topicFreq[w].sentiment[sentiment] || 0) + 1;
      });
    });

    const topicClusters = Object.entries(topicFreq)
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 40)
      .map(([word, { count, sentiment }]) => {
        const dominant = Object.entries(sentiment).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Neutral';
        return { word, count, sentiment: dominant };
      });

    // ── Assemble response ───────────────────────────────────────────────
    const result = {
      sourceBias,
      dayHourHeatmap: heatmapRaw,
      wordTrends: { words: topWords, data: wordTrends },
      sentimentCorrelation: { sources, matrix: correlationMatrix },
      topicClusters,
      sourceReliability: reliability,
    };

    // Cache
    analyticsCache = { data: result, ts: Date.now() };

    res.json({ data: result, cached: false });
  } catch (error) {
    console.error('Advanced analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAdvancedAnalytics };
