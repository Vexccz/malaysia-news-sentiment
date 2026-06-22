const mongoose = require('mongoose');
const isValidObjectId = (id) => id && mongoose.Types.ObjectId.isValid(id) && id !== 'guest';
const Article  = require('../models/Article');
const User     = require('../models/User');

const isDbConnected = () => mongoose.connection.readyState === 1;

const sanitize = (str, max = 150) =>
  String(str || '').replace(/[<>"'\\]/g, '').trim().slice(0, max);

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MALAYSIA_TERMS = [
  'malaysia', 'malaysian', 'kuala lumpur', 'putrajaya', 'selangor', 'johor', 'penang',
  'pulau pinang', 'sabah', 'sarawak', 'kelantan', 'terengganu', 'kedah', 'perlis',
  'pahang', 'perak', 'melaka', 'negeri sembilan', 'labuan', 'umno', 'bn', 'pakatan',
  'perikatan', 'anwar', 'ringgit', 'bursa malaysia',
];

const MALAYSIA_SOURCE_HINTS = [
  '.com.my', 'bernama.com', 'thestar.com.my', 'astroawani.com', 'freemalaysiatoday.com',
  'malaymail.com', 'bharian.com.my', 'hmetro.com.my', 'sinarharian.com.my',
  'theedgemarkets.com', 'nst.com.my', 'newstraittimes.com', 'malaysiakini.com',
];

const inferSourceFromUrl = (url) => {
  if (!url) return 'Media Source';
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0] || host;
    return label
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  } catch {
    return 'Media Source';
  }
};

const isMalaysiaRelevantArticle = (article = {}) => {
  const haystack = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();
  const sourceName = String(article.source || '').toLowerCase();
  const url = String(article.url || '').toLowerCase();
  return MALAYSIA_TERMS.some(term => haystack.includes(term))
    || MALAYSIA_SOURCE_HINTS.some(hint => url.includes(hint) || sourceName.includes(hint.replace('.com.my', '')));
};

const normalizeArticle = (article) => {
  const normalized = { ...article };
  if (!normalized.source || normalized.source === 'Unknown' || normalized.source === 'Source') {
    normalized.source = inferSourceFromUrl(normalized.url);
  }
  return normalized;
};

const shouldHideFromGenericMalaysiaFeed = (article, hasExplicitFilters) => {
  if (hasExplicitFilters) return false;
  return String(article.topic || '').trim().toLowerCase() === 'malaysia' && !isMalaysiaRelevantArticle(article);
};

/**
 * GET /api/history
 */
const getHistory = async (req, res) => {
  if (!isDbConnected()) {
    return res.json({ total: 0, pages: 0, page: 1, articles$or: [], warning: 'Database not connected.' });
  }
  try {
    const {
      sentiment,
      topic,
      search,
      from,
      to,
      sortBy = 'newest',
      page  = 1,
      limit = 20,
    } = req.query;

    const userId   = req.userId;
    const pageNum  = Math.max(parseInt(page)  || 1, 1);
    const limitNum = Math.min(parseInt(limit) || 20, 1000); 
    const skip     = (pageNum - 1) * limitNum;
    const hasExplicitFilters = Boolean(sentiment || topic || search || from || to);

    const { timeframe } = req.query;
    const now = new Date();

    const filter = {};
    if (isValidObjectId(userId)) {
      const { bookmarked } = req.query;
      if (bookmarked === 'true') {
        const user = await User.findById(userId).select('bookmarks').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });
        filter._id = { $in: user.bookmarks || [] };
      } else {
        filter.userId = new mongoose.Types.ObjectId(userId);
      }
    } else {
      filter.$or = [{ userId: null }, { userId: { $exists: false } }];
    }

    if (sentiment) filter.sentiment = sentiment;
    if (topic)     filter.topic = { $regex: escapeRegex(sanitize(topic)), $options: 'i' };

    if (search) {
      const s = escapeRegex(sanitize(search, 100));
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or$or: [
          { title: { $regex: s, $options: 'i' } },
          { description: { $regex: s, $options: 'i' } },
        ],
      });
    }

    if (from || to) {
      filter.createdAt = {}; 
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    } else if (timeframe) {
      if (timeframe === '24h')      filter.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d')  filter.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') filter.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const sortMap = {
      newest:     { updatedAt: -1 },
      oldest:     { updatedAt:  1 },
      confidence: { confidence: -1 },
      published:  { publishedAt: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.newest;

    const queryLimit = hasExplicitFilters || timeframe ? limitNum : Math.min(limitNum * 4, 100);

    const rawArticles = await Article.find(filter).sort(sort).skip(skip).limit(queryLimit).lean();

    const articles = rawArticles
      .map(normalizeArticle)
      .filter(article => !shouldHideFromGenericMalaysiaFeed(article, hasExplicitFilters || Boolean(timeframe)))
      .slice(0, limitNum);

    // Count total matching documents; if post-filtering is active, use a separate count
    const isPostFiltering = !hasExplicitFilters && !timeframe;
    let total;
    if (isPostFiltering) {
      // When post-filtering hides non-Malaysia articles, count only Malaysia-relevant ones
      // Use the DB count as an approximation since exact count would require loading all docs
      total = await Article.countDocuments(filter);
    } else {
      total = await Article.countDocuments(filter);
    }

    res.json(JSON.parse(JSON.stringify({
      total,
      pages: Math.ceil(total / limitNum),
      page:  pageNum,
      limit: limitNum,
      articles,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/history/trends
 */
const getTrends = async (req, res) => {
  if (!isDbConnected()) return res.json([]);
  try {
    const { timeframe } = req.query;
    const userId = req.userId;
    const match  = {};

    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }

    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h')      match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d')  match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const trends = await Article.aggregate([
      { $match: match },
      { $group: {
          _id:   { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sentiment: '$sentiment' },
          count: { $sum: 1 },
      }},
      { $sort: { '_id.date': 1 } },
    ]);

    const grouped = {};
    trends.forEach(({ _id, count }) => {
      const { date, sentiment } = _id;
      if (!grouped[date]) grouped[date] = { date, Positive: 0, Negative: 0, Neutral: 0 };
      const key = sentiment || 'Neutral';
      grouped[date][key] = (grouped[date][key] || 0) + count;
    });

    res.json(JSON.parse(JSON.stringify(Object.values(grouped))));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/history/stats
 */
const getStats = async (req, res) => {
  if (!isDbConnected()) return res.json({});
  try {
    const { timeframe } = req.query;
    const userId = req.userId;
    const match  = {};

    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }

    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h')      match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d')  match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const user = isValidObjectId(userId) ? await User.findById(userId).select('analysisCount') : null;

    const [sentiments, alerts] = await Promise.all([
      Article.aggregate([
        { $match: match },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Article.countDocuments({ ...match, isAlert: true }),
    ]);

    const sentimentMap = { Positive: 0, Negative: 0, Neutral: 0 };
    let calculatedTotal = 0;
    sentiments.forEach(({ _id, count }) => { 
      const key = _id || 'Neutral';
      sentimentMap[key] = (sentimentMap[key] || 0) + count;
      calculatedTotal += count;
    });

    res.json(JSON.parse(JSON.stringify({ total: calculatedTotal, sentiments: sentimentMap, alerts })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/history/:id
 */
const deleteArticle = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ error: 'Database not connected.' });
  try {
    const article = await Article.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!article) return res.status(404).json({ error: 'Article not found or unauthorized.' });
    res.json({ message: 'Article deleted.' });
  } catch (error) {
    console.error('deleteArticle error:', error.message);
    res.status(500).json({ error: 'Failed to delete article.' });
  }
};

/**
 * GET /api/history/dashboard-init
 */
const dashboardInit = async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      history: { articles$or: [], total: 0 },
      stats: { total: 0, sentiments: {}, alerts: 0 },
      trends$or: [],
      keywords$or: [],
      periodComparison: { total: 0, positive: 0, negative: 0, neutral: 0 },
    });
  }
  try {
    const { timeframe, limit, page = 1 } = req.query;
    const userId = req.userId;
    const limitNum = Math.min(parseInt(limit) || 10, 1000);
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    const match = {};
    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }
    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h')      match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d')  match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }

    const [rawArticles, sentimentsAgg, alertCount, trendsAgg, keywordDocs] = await Promise.all([
      Article.find(match).sort({ updatedAt: -1 }).skip(skip).limit(limitNum * 2).lean(),
      Article.aggregate([{ $match: match }, { $group: { _id: '$sentiment', count: { $sum: 1 } } }]),
      Article.countDocuments({ ...match, isAlert: true }),
      Article.aggregate([
        { $match: match },
        { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sentiment: '$sentiment' }, count: { $sum: 1 } } },
        { $sort: { '_id.date': 1 } },
      ]),
      Article.find(match).select('title description').limit(200).lean(),
    ]);

    // ── Period-over-period comparison for KPI trends ──────────────────────
    // Determine current vs previous period boundaries.
    // If no timeframe is set (all time), compare last 7 days vs 7 days before.
    const now = new Date();
    const MS = 24 * 60 * 60 * 1000;
    let curStart, prevStart, prevEnd;
    if (timeframe === '24h') {
      curStart  = new Date(now.getTime() - 1 * MS);
      prevStart = new Date(now.getTime() - 2 * MS);
      prevEnd   = curStart;
    } else if (timeframe === '7d') {
      curStart  = new Date(now.getTime() - 7 * MS);
      prevStart = new Date(now.getTime() - 14 * MS);
      prevEnd   = curStart;
    } else if (timeframe === '30d') {
      curStart  = new Date(now.getTime() - 30 * MS);
      prevStart = new Date(now.getTime() - 60 * MS);
      prevEnd   = curStart;
    } else {
      // All time – compare last 7 days vs 7 days before that
      curStart  = new Date(now.getTime() - 7 * MS);
      prevStart = new Date(now.getTime() - 14 * MS);
      prevEnd   = curStart;
    }

    const baseMatch = {};
    if (isValidObjectId(userId)) {
      baseMatch.userId = new mongoose.Types.ObjectId(userId);
    } else {
      baseMatch.$or = [{ userId: null }, { userId: { $exists: false } }];
    }

    const [curPeriodAgg, prevPeriodAgg] = await Promise.all([
      Article.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: curStart } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
      Article.aggregate([
        { $match: { ...baseMatch, createdAt: { $gte: prevStart, $lt: prevEnd } } },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]),
    ]);

    const curPeriod  = { total: 0, Positive: 0, Negative: 0, Neutral: 0 };
    const prevPeriod = { total: 0, Positive: 0, Negative: 0, Neutral: 0 };
    curPeriodAgg.forEach(({ _id, count }) => {
      const key = _id || 'Neutral';
      curPeriod[key] = (curPeriod[key] || 0) + count;
      curPeriod.total += count;
    });
    prevPeriodAgg.forEach(({ _id, count }) => {
      const key = _id || 'Neutral';
      prevPeriod[key] = (prevPeriod[key] || 0) + count;
      prevPeriod.total += count;
    });

    const pctChange = (cur, prev) => {
      if (!prev) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const periodComparison = {
      total:    pctChange(curPeriod.total,    prevPeriod.total),
      positive: pctChange(curPeriod.Positive, prevPeriod.Positive),
      negative: pctChange(curPeriod.Negative, prevPeriod.Negative),
      neutral:  pctChange(curPeriod.Neutral,  prevPeriod.Neutral),
    };
    // ── end comparison ───────────────────────────────────────────────────

    const sentimentMap = { Positive: 0, Negative: 0, Neutral: 0 };
    let total = 0;
    sentimentsAgg.forEach(({ _id, count }) => { 
      const key = _id || 'Neutral';
      sentimentMap[key] = (sentimentMap[key] || 0) + count;
      total += count; 
    });
    const user = isValidObjectId(userId) ? await User.findById(userId).select('analysisCount').lean() : null;

    const grouped = {};
    trendsAgg.forEach(({ _id, count }) => {
      const { date, sentiment } = _id;
      if (!grouped[date]) grouped[date] = { date, Positive: 0, Negative: 0, Neutral: 0 };
      const key = sentiment || 'Neutral';
      grouped[date][key] = (grouped[date][key] || 0) + count;
    });

    const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','was','are','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','this','that','these','those','it','its','he','she','they','we','you','i','his','her','their','our','your','my','as','if','so','than','then','when','where','how','what','which','who','not','no','more','also','after','before','about','up','out','over','new','says','said','akan','yang','di','ke','dari','dan','pada','untuk','with','dalam','tidak','telah','bagi','ini','itu','ada']);
    const freq = {};
    keywordDocs.forEach(({ title, description }) => {
      (`${title} ${description}`).toLowerCase().replace(/[^a-zA-Z\u00C0-\u024F\s]/g,' ').split(/\s+/)
        .filter(w => w.length > 3 && !STOP.has(w)).forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    });
    const keywords = Object.entries(freq).filter(([,v]) => v > 1).sort((a,b) => b[1]-a[1]).slice(0,60).map(([word,count]) => ({ word, count }));

    const articles = rawArticles
      .map(normalizeArticle)
      .filter(article => !shouldHideFromGenericMalaysiaFeed(article, false))
      .slice(0, limitNum);

    res.json({
      history: { articles, total: total },
      stats:   { total: total, sentiments: sentimentMap, alerts: alertCount },
      trends:  Object.values(grouped),
      keywords,
      periodComparison,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Public stats (no auth) - for landing page
const getPublicStats = async (req, res) => {
  if (!isDbConnected()) return res.json({ totalArticles: 0 });
  try {
    const totalArticles = await Article.countDocuments({});
    res.json({ totalArticles });
  } catch (error) {
    res.json({ totalArticles: 0 });
  }
};

// DELETE /api/history/cleanup - remove articles without valid sentiment
const cleanupUnclassified = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ error: 'DB not connected' });
  try {
    const result = await Article.deleteMany({
      $or$or: [
        { sentiment: { $exists: false } },
        { sentiment: null },
        { sentiment: '' },
        { sentiment: { $nin$or: ['Positive', 'Negative', 'Neutral'] } },
      ]
    });
    const remaining = await Article.countDocuments({});
    res.json({ deleted: result.deletedCount, remaining });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * GET /api/history/:id
 * Returns a single article by ID with related articles
 */
const getArticleById = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected.' });
  }
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid article ID.' });
    }

    const article = await Article.findById(id).lean();
    if (!article) {
      return res.status(404).json({ error: 'Article not found.' });
    }

    // Find related articles (same source or overlapping categories)
    const relatedFilter = {
      _id: { $ne: article._id },
      $or: [
        { source: article.source },
        ...(article.categories?.length ? [{ categories: { $in: article.categories } }] : []),
      ],
    };
    const related = await Article.find(relatedFilter)
      .sort({ publishedAt: -1 })
      .limit(5)
      .select('title source sentiment publishedAt url urlToImage categories confidence')
      .lean();

    res.json({ article, related });
  } catch (err) {
    console.error('[getArticleById] error:', err.message);
    res.status(500).json({ error: 'Failed to fetch article.' });
  }
};

module.exports = { getHistory, getTrends, getStats, deleteArticle, dashboardInit, getPublicStats, cleanupUnclassified, getArticleById };
