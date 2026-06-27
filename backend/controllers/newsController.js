const mongoose   = require('mongoose');
const NodeCache  = require('node-cache');
const pLimit     = require('p-limit'); 

const { fetchFMTNews }      = require('../services/fmtService');
const { fetchAstroAwaniNews } = require('../services/astroAwaniService');
const { fetchMalaysiakiniNews } = require('../services/malaysiakiniService');
const { analyzeSentiment, analyseArticle, getClient } = require('../services/openaiService');
const Article = require('../models/Article');

// Helper: check if string is valid MongoDB ObjectId
const isValidObjectId = (id) => id && mongoose.Types.ObjectId.isValid(id) && id !== 'guest';

// ── In-memory cache — 15 min TTL ──────────────────────
const cache = new NodeCache({ stdTTL: 900, checkperiod: 120 });
const sentimentCache = new NodeCache({ stdTTL: 3600, checkperiod: 300 }); // 1hr cache for sentiment results
const sentimentLimit = pLimit(5);

const isDbConnected = () => mongoose.connection.readyState === 1;

// ─────────────────────────────────────────────────────────
// Impact Score — REAL engagement-based metric (0-100)
// ─────────────────────────────────────────────────────────
// Formula: weighted sum of real interactions, clamped 0-100
//   views × 0.5  + comments × 3 + bookmarks × 2 + shares × 5
// For new articles with no interactions yet, fall back to a
// small source-reputation seed (so cold-start articles still
// appear ranked sensibly).
//
// For source-only context (e.g. RSS ingestion, no engagement
// data yet), call calculateImpactScore(sourceName) — returns
// seed value 5-25 based on source tier.
//
// For real-time score on an existing article, call
//   computeArticleImpact(articleId) — async, queries DB.

const SOURCE_SEED = (name) => {
  const n = (name || '').toLowerCase();
  // Deterministic hash for stable seed within tier
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = ((hash << 5) - hash + n.charCodeAt(i)) | 0;
  const h = Math.abs(hash);

  // Tier A — established major outlets: seed 15-25
  if (['bernama', 'the star', 'astro awani', 'fmt', 'malay mail', 'malaysiakini'].some(s => n.includes(s)))
    return 15 + (h % 11);
  // Tier B — known outlets: seed 8-17
  if (['edge', 'new straits times', 'utusan', 'kosmo'].some(s => n.includes(s)))
    return 8 + (h % 10);
  // Tier C — unknown/local: seed 1-5
  return 1 + (h % 5);
};

const calculateImpactScore = (name) => SOURCE_SEED(name);

// Real engagement-based score (used by recompute jobs)
const computeArticleImpact = async (articleId, sourceName = '') => {
  const Comment = require('../models/Comment');
  const Share = require('../models/Share');
  const User = require('../models/User');
  const ArticleModel = require('../models/Article');

  const [article, commentCount, shareCount, bookmarkCount] = await Promise.all([
    ArticleModel.findById(articleId).select('viewCount source').lean(),
    Comment.countDocuments({ articleId }),
    Share.countDocuments({ articleId }),
    User.countDocuments({ bookmarks: articleId }),
  ]);
  if (!article) return 0;

  const viewCount = article.viewCount || 0;
  const engagement =
    (viewCount * 0.5) +
    (commentCount * 3) +
    (bookmarkCount * 2) +
    (shareCount * 5);

  // Cold start: use source seed if zero engagement
  if (engagement === 0) {
    return SOURCE_SEED(sourceName || article.source || '');
  }
  // Log scale so a single viral article doesn't dominate.
  // Each ~doubling of engagement adds ~7 points; caps at 100.
  const score = Math.min(100, Math.round(Math.log2(engagement + 1) * 7));
  return score;
};


// ── Decoders & Sanitizers ──────────────────
const decodeHTMLEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
    .replace(/&#x([a-fA-F0-9]+);/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’')
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&hellip;/g, '…');
};

const sanitize = (str, max = 150) =>
  decodeHTMLEntities(String(str || '').replace(/[<>"'\\]/g, '').trim()).slice(0, max);

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

const isGenericMalaysiaQuery = (query, latest = false) => {
  if (latest) return true;
  const normalized = String(query || '').trim().toLowerCase();
  return !normalized || normalized === 'malaysia';
};

const isMalaysiaRelevantArticle = (article = {}) => {
  const haystack = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();
  const sourceName = String(article.source?.name || article.source || '').toLowerCase();
  const url = String(article.url || '').toLowerCase();
  return MALAYSIA_TERMS.some(term => haystack.includes(term))
    || MALAYSIA_SOURCE_HINTS.some(hint => {
      const hintBase = hint.replace('.com.my', '').replace('.com', '');
      return url.includes(hint) || sourceName.includes(hintBase);
    });
};

const CRISIS_KEYWORDS = [
  'flood', 'banjir', 'crisis', 'krisis', 'corruption', 'rasuah', 'scandal',
  'arrested', 'ditangkap', 'emergency', 'darurat', 'attack', 'serangan',
  'death', 'kematian', 'mati', 'collapse', 'runtuh', 'explosion', 'letupan',
  'drought', 'bankrupt', 'muflis', 'riot', 'rusuhan', 'murder', 'bunuh',
  'accident', 'kemalangan', 'resign', 'letak jawatan', 'harga naik',
  'price hike', 'inflation', 'inflasi', 'fuel price', 'harga minyak',
  'layoff', 'retrenchment', 'buang kerja', 'protest', 'protes', 'fire', 'kebakaran',
  'hack', 'breach', 'robbery', 'rompak', 'kidnap', 'culik', 'rape', 'rogol',
];

const isAlertArticle = (title = '', description = '') => {
  const text = `${title} ${description}`.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
};

const extractSourceFromUrl = (url) => {
  if (!url) return 'Unknown';
  const domain = url.toLowerCase();
  if (domain.includes('thestar.com.my')) return 'The Star';
  if (domain.includes('bernama.com')) return 'Bernama';
  if (domain.includes('astroawani.com')) return 'Astro Awani';
  if (domain.includes('freemalaysiatoday.com')) return 'FMT';
  if (domain.includes('malaymail.com')) return 'Malay Mail';
  if (domain.includes('bharian.com.my')) return 'Berita Harian';
  if (domain.includes('hmetro.com.my')) return 'Harian Metro';
  if (domain.includes('sinarharian.com.my')) return 'Sinar Harian';
  if (domain.includes('theedgemarkets.com')) return 'The Edge';
  if (domain.includes('newstraittimes.com') || domain.includes('nst.com.my')) return 'NST';
  if (domain.includes('kinitv.com')) return 'KiniTV';
  if (domain.includes('malaysiakini.com')) return 'Malaysiakini';
  
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host.split('.')[0].toUpperCase();
  } catch { return 'Source'; }
};

const getAndAnalyzeNews = async (req, res) => {
  try {
    const q        = sanitize(req.query.q || 'Malaysia');
    const latest   = req.query.latest === 'true';
    const refresh  = req.query.refresh === 'true'; // #Fix: Bypass cache for debugging/new source verification
    const fast     = req.query.fast === 'true';    // #Perf: serve from DB, skip RSS fetch + AI analysis
    const pageSize = Math.min(parseInt(req.query.pageSize) || 12, 60);

    // ── FAST PATH: serve from DB cache instantly ──────────────────
    // Returns articles already analysed and stored. Bypasses RSS fetch
    // (slow network) and sentiment analysis (slow AI). Typical: <500ms.
    // Frontend can call this for instant render, then fire a background
    // refresh request without fast=true to update the cache.
    if (fast && isDbConnected()) {
      const dbQuery = {};
      // Topic filter (skip for generic Malaysia query)
      if (q && !isGenericMalaysiaQuery(q, latest)) {
        dbQuery.topic = { $regex: escapeRegex(q), $options: 'i' };
      }
      const articles = await Article.find(dbQuery)
        .sort({ publishedAt: -1 })
        .limit(pageSize)
        .lean();

      const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
      articles.forEach(a => {
        const key = a.sentiment || 'Neutral';
        if (sentimentCounts[key] !== undefined) sentimentCounts[key]++;
      });
      return res.json({
        total: articles.length,
        sentimentDistribution: sentimentCounts,
        articles,
        cached: true,
      });
    }

    const cacheKey = latest ? `news_raw_latest_${pageSize}` : `news_raw_${q}_${pageSize}`;
    let rawArticles = refresh ? null : cache.get(cacheKey);

    if (!rawArticles) {
      if (refresh) console.log(`🔄 Cache bypass triggered for: ${cacheKey}`);
      const { recordRssFetch } = require('../services/healthService');
      const trackFetch = async (name, fn) => {
        try {
          const arts = await fn();
          recordRssFetch(name, true, arts?.length || 0);
          return arts || [];
        } catch (err) {
          recordRssFetch(name, false, 0, err);
          return [];
        }
      };
      const [fmtDirectArts, astroAwaniArts, mkiniArts] = await Promise.all([
        trackFetch('fmt', fetchFMTNews),
        trackFetch('astroAwani', fetchAstroAwaniNews),
        trackFetch('malaysiakini', fetchMalaysiakiniNews),
      ]);

      const queryWords = q.toLowerCase().split(/\s+/).filter(w => {
        const forbidden = ['malaysia', 'breaking', 'news', 'latest', 'today', 'headline'];
        return w.length > 3 && !forbidden.includes(w);
      });
      
      const filterByQuery = (arts) => {
        if (queryWords.length === 0) return arts;
        return arts.filter(a => {
          const text = `${a.title} ${a.description || ''}`.toLowerCase();
          return queryWords.some(w => text.includes(w));
        });
      };

      const filteredAstro = filterByQuery(astroAwaniArts);
      const filteredFMT   = filterByQuery(fmtDirectArts);
      const filteredMKini = filterByQuery(mkiniArts);
      const mergedRaw = [...filteredAstro, ...filteredFMT, ...filteredMKini]
        .filter(art => art && art.url)
        .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      
      const seenUrls = new Set();
      rawArticles = mergedRaw.filter(art => {
        if (!art.url || seenUrls.has(art.url)) return false;
        seenUrls.add(art.url);
        return true;
      });

      if (isGenericMalaysiaQuery(q, latest)) {
        const malaysiaScoped = rawArticles.filter(isMalaysiaRelevantArticle);
        if (malaysiaScoped.length > 0) rawArticles = malaysiaScoped;
      }
      rawArticles = rawArticles.slice(0, pageSize);

      if (rawArticles.length > 0) cache.set(cacheKey, rawArticles);
    }

    if (rawArticles.length === 0) {
      return res.json({ articles: [], message: `No specific articles found for "${q}".` });
    }

    const urls = rawArticles.map(a => a.url);
    const existingArticles = isDbConnected() ? await Article.find({ url: { $in: urls } }).lean() : [];
    const existingMap = new Map(existingArticles.map(a => [a.url, a]));

    // Emit progress via Socket.io for real-time loading feedback
    const io = req.app.get('io');
    let analyzed = 0;
    const totalToAnalyze = rawArticles.length;

    const analyzedArticles = await Promise.all(
      rawArticles.map((article) =>
        sentimentLimit(async () => {
          try {
            if (isDbConnected()) {
              const existing = existingMap.get(article.url);
              if (existing) {
                let correctedSource = existing.source;
                if (['ollama', 'ai', 'local'].includes(String(correctedSource).toLowerCase())) {
                  correctedSource = extractSourceFromUrl(existing.url);
                }
                analyzed++;
                if (io) io.emit('analysis_progress', { done: analyzed, total: totalToAnalyze });
                return await Article.findOneAndUpdate(
                  { _id: existing._id },
                  { $set: { userId: req.isGuest ? (existing.userId || null) : (req.userId || existing.userId || null), topic: q || existing.topic, source: correctedSource } },
                  { new: true, lean: true } 
                );
              }
            }

            // Check sentiment cache first (avoid re-analyzing same article)
            const sentCacheKey = `sent_${article.url}`;
            let analysis = sentimentCache.get(sentCacheKey);
            if (!analysis) {
              analysis = await analyseArticle(article.title, article.description);
              sentimentCache.set(sentCacheKey, analysis);
            }
            const alert = isAlertArticle(article.title, article.description);
            analyzed++;
            if (io) io.emit('analysis_progress', { done: analyzed, total: totalToAnalyze });
            let sourceName = article.source?.name || 'Unknown';
            if (sourceName === 'Unknown' || !sourceName) sourceName = extractSourceFromUrl(article.url);

            const impact = calculateImpactScore(sourceName);

            const articleData = {
              title:       decodeHTMLEntities(article.title),
              description: decodeHTMLEntities(article.description || ''),
              content:     decodeHTMLEntities(article.content     || ''),
              source:      sourceName,
              url:         article.url,
              urlToImage:  article.urlToImage  || '',
              publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
              topic:       q,
              ...analysis,
              isAlert:     alert,
              userId:      (req.isGuest ? null : req.userId) || null,
              impactScore: impact,
            };

            if (isDbConnected()) {
              return await Article.findOneAndUpdate(
                { url: article.url },
                { $set: articleData },
                { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
              );
            }
            return articleData;
          } catch (err) {
            console.error(`Skipping article: ${err.message}`);
            return null;
          }
        })
      )
    );

    // Broadcast new analysis metrics to Admin
    if (io) {
      io.emit('system_stats_updated', { type: 'analysis_batch', count: analyzedArticles.length });
      io.emit('analysis_progress', { done: totalToAnalyze, total: totalToAnalyze, complete: true });
    }

    const results = analyzedArticles.filter(Boolean);
    const sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };
    results.forEach(a => { 
      const key = a.sentiment || 'Neutral';
      if (sentimentCounts[key] !== undefined) sentimentCounts[key]++; 
    });

    const payload = { total: results.length, sentimentDistribution: sentimentCounts, articles: results };
    if (isValidObjectId(req.userId)) {
      const User = require('../models/User');
      const updatedUser = await User.findByIdAndUpdate(
        req.userId, 
        { $inc: { analysisCount: results.length } },
        { new: true }
      ).catch(() => null);

      // Broadcast to Admins
      const io = req.app.get('io');
      if (io && updatedUser) {
        io.emit('user_activity', { 
          userId: updatedUser._id, 
          userName: updatedUser.name,
          analysisCount: updatedUser.analysisCount,
          timestamp: new Date()
        });
      }
    }
    res.json(payload);
  } catch (error) {
    console.error('Error in getAndAnalyzeNews:', error.message);
    res.status(500).json({ error: `Backend Error: ${error.message}` });
  }
};

const getTopSources = async (req, res) => {
  if (!isDbConnected()) return res.json([]);
  try {
    const topic  = sanitize(req.query.topic || '');
    const { timeframe } = req.query;
    const userId = req.userId;
    const match = {};
    if (topic) match.topic = { $regex: escapeRegex(topic), $options: 'i' };
    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h') match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d') match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }
    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }
    const results = await Article.aggregate([
      { $match: match },
      { $group: {
          _id:      '$source',
          total:    { $sum: 1 },
          positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
          negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
          neutral:  { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] },  1, 0] } },
      }},
      { $sort:    { total: -1 } },
      { $limit:   10 },
      { $project: { source: '$_id', total: 1, positive: 1, negative: 1, neutral: 1, _id: 0 } },
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateDigest = async (req, res) => {
  try {
    const { articles, topic } = req.body;
    if (!articles || articles.length === 0) return res.json({ digest: null });
    const { generateDigest: fetchDigest } = require('../services/openaiService');
    const result = await fetchDigest(articles, topic);
    res.json(result);
  } catch (error) {
    res.json({ digest: null, error: error.message });
  }
};

const getKeywords = async (req, res) => {
  if (!isDbConnected()) return res.json([]);
  try {
    const { timeframe } = req.query;
    const userId = req.userId;
    const match  = {};
    if (isValidObjectId(userId)) {
      match.$or = [{ userId: new mongoose.Types.ObjectId(userId) }, { userId: null }, { userId: { $exists: false } }];
    }
    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h') match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d') match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }
    const articles = await Article.find(match).select('title description').limit(200).lean();
    const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','was','are','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','this','that','these','those','it','its','he','she','they','we','you','i','his','her','their','our','your','my','as','if','so','than','then','when','where','how','what','which','who','not','no','more','also','after','before','about','up','out','over','new','says','said','akan','yang','di','ke','dari','dan','pada','untuk','dengan','dalam','tidak','telah','bagi','ini','itu','ada']);
    const freq = {};
    articles.forEach(({ title, description }) => {
      const words = `${title} ${description}`.toLowerCase().replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    });
    const keywords = Object.entries(freq).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([word, count]) => ({ word, count }));
    res.json(keywords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getForecast = async (req, res) => {
  try {
    const { articles, topic } = req.body;
    if (!articles || articles.length === 0) return res.json({ forecast: null });
    const { generateForecast } = require('../services/openaiService');
    const forecast = await generateForecast(articles, sanitize(topic, 100));
    res.json(forecast);
  } catch (error) {
    res.json({ outlook: 'Forecast service unavailable.', risks: [], projectionScore: 50 });
  }
};

const getRegionalSentiment = async (req, res) => {
  try {
    const topic  = sanitize(req.query.topic || '');
    const { timeframe } = req.query;
    const userId = req.userId;
    if (!userId) return res.json([]);
    const match = { stateLocation: { $ne: 'General' } };
    if (topic) match.topic = { $regex: escapeRegex(topic), $options: 'i' };
    if (timeframe) {
      const now = new Date();
      if (timeframe === '24h') match.createdAt = { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
      else if (timeframe === '7d') match.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      else if (timeframe === '30d') match.createdAt = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    }
    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      match.$or = [{ userId: null }, { userId: { $exists: false } }];
    }
    const regionalData = await Article.aggregate([
      { $match: match },
      { $group: { _id: '$stateLocation', count: { $sum: 1 }, positive: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } }, negative: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } }, neutral:  { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] }, 1, 0] } } } },
      { $project: { state: '$_id', count: 1, avgScore: { $divide: [{ $add: ['$positive', { $multiply: ['$neutral', 0.5] }] }, '$count'] } } }
    ]);
    res.json(regionalData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getArticleAnalysis = async (req, res) => {
  try {
    const { article } = req.body;
    if (!article || !article.title) return res.status(400).json({ error: 'Article required.' });
    const { analyzeDetailedArticle } = require('../services/openaiService');
    const analysis = await analyzeDetailedArticle(article);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/news/sentiment-timeline?topic=xxx&days=30
 * Returns daily sentiment aggregation for a topic over time
 */
const getSentimentTimeline = async (req, res) => {
  try {
    const { topic, days = 30 } = req.query;
    const userId = req.user?.id;
    const numDays = Math.min(parseInt(days) || 30, 365);
    const startDate = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000);

    const match = { publishedAt: { $gte: startDate } };
    const andConditions = [];
    
    if (topic && topic.trim()) {
      const escaped = escapeRegex(topic.trim());
      andConditions.push({
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { topic: { $regex: escaped, $options: 'i' } },
        ]
      });
    }

    if (isValidObjectId(userId)) {
      match.userId = new mongoose.Types.ObjectId(userId);
    } else {
      andConditions.push({ $or: [{ userId: null }, { userId: { $exists: false } }] });
    }

    if (andConditions.length) {
      match.$and = andConditions;
    }

    const timeline = await Article.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$publishedAt' } },
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
          positiveCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
          negativeCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
          neutralCount: { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral'] }, 1, 0] } },
          totalArticles: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          avgSentiment: { $round: ['$avgSentiment', 3] },
          positiveCount: 1,
          negativeCount: 1,
          neutralCount: 1,
          totalArticles: 1,
        },
      },
    ]);

    // Calculate summary stats
    const totalArticles = timeline.reduce((sum, d) => sum + d.totalArticles, 0);
    const avgSentiment = timeline.length > 0
      ? parseFloat((timeline.reduce((sum, d) => sum + d.avgSentiment, 0) / timeline.length).toFixed(3))
      : 0;
    
    // Trend direction: compare last 7 days avg vs previous 7 days
    const recent = timeline.slice(-7);
    const previous = timeline.slice(-14, -7);
    const recentAvg = recent.length ? recent.reduce((s, d) => s + d.avgSentiment, 0) / recent.length : 0;
    const prevAvg = previous.length ? previous.reduce((s, d) => s + d.avgSentiment, 0) / previous.length : 0;
    const trend = recentAvg > prevAvg + 0.05 ? 'improving' : recentAvg < prevAvg - 0.05 ? 'declining' : 'stable';

    // Peak dates
    const peakPositive = timeline.reduce((best, d) => d.avgSentiment > (best?.avgSentiment ?? -2) ? d : best, null);
    const peakNegative = timeline.reduce((best, d) => d.avgSentiment < (best?.avgSentiment ?? 2) ? d : best, null);

    res.json({
      success: true,
      timeline,
      summary: {
        totalArticles,
        avgSentiment,
        trend,
        days: numDays,
        peakPositiveDate: peakPositive?.date || null,
        peakNegativeDate: peakNegative?.date || null,
      },
    });
  } catch (error) {
    console.error('[Timeline] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ── Compare Topics (Multi-topic Comparative Analysis) ─────────
const compareTopics = async (req, res) => {
  try {
    const { topics, days = 30 } = req.body;

    if (!topics || !Array.isArray(topics) || topics.length < 2 || topics.length > 5) {
      return res.status(400).json({ error: 'Provide 2-5 topics to compare.' });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = [];

    for (const topic of topics) {
      const regex = new RegExp(escapeRegex(topic), 'i');
      const articles = await Article.find({
        $or: [
          { title: regex },
          { description: regex },
          { topic: regex },
        ],
        publishedAt: { $gte: since },
      }).lean();

      const total = articles.length;
      const positive = articles.filter(a => a.sentiment === 'Positive').length;
      const negative = articles.filter(a => a.sentiment === 'Negative').length;
      const neutral = articles.filter(a => a.sentiment === 'Neutral').length;

      // Calculate avg sentiment score: Positive=1, Negative=-1, Neutral=0
      const sentimentScore = (a) => a.sentiment === 'Positive' ? 1 : a.sentiment === 'Negative' ? -1 : 0;
      const avgSentiment = total > 0
        ? articles.reduce((sum, a) => sum + sentimentScore(a), 0) / total
        : 0;

      // Simple trend: compare first half vs second half sentiment
      const mid = Math.floor(total / 2);
      const firstHalf = articles.slice(0, mid);
      const secondHalf = articles.slice(mid);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, a) => s + sentimentScore(a), 0) / firstHalf.length : 0;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, a) => s + sentimentScore(a), 0) / secondHalf.length : 0;
      const trend = secondAvg - firstAvg > 0.05 ? 'improving' : secondAvg - firstAvg < -0.05 ? 'declining' : 'stable';

      results.push({
        topic,
        avgSentiment: Math.round(avgSentiment * 100) / 100,
        positivePercent: total > 0 ? Math.round((positive / total) * 100) : 0,
        negativePercent: total > 0 ? Math.round((negative / total) * 100) : 0,
        neutralPercent: total > 0 ? Math.round((neutral / total) * 100) : 0,
        articleCount: total,
        trend,
      });
    }

    res.json({ comparison: results, days });
  } catch (error) {
    console.error('[Compare] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ── Heatmap: Map articles to Malaysian states ──────────────────
const STATE_KEYWORDS = {
  'Johor': ['johor', 'jb', 'johor bahru', 'iskandar', 'pasir gudang', 'muar', 'batu pahat', 'kluang', 'pontian', 'kulai', 'senai'],
  'Kedah': ['kedah', 'alor setar', 'langkawi', 'sungai petani', 'kulim', 'jitra'],
  'Kelantan': ['kelantan', 'kota bharu', 'bachok', 'pasir mas', 'tumpat', 'tanah merah'],
  'Melaka': ['melaka', 'malacca', 'ayer keroh', 'alor gajah', 'jasin'],
  'Negeri Sembilan': ['negeri sembilan', 'seremban', 'port dickson', 'nilai', 'jelebu', 'rembau'],
  'Pahang': ['pahang', 'kuantan', 'temerloh', 'bentong', 'cameron highlands', 'raub', 'pekan', 'genting'],
  'Perak': ['perak', 'ipoh', 'taiping', 'teluk intan', 'sitiawan', 'lumut', 'kampar', 'batu gajah'],
  'Perlis': ['perlis', 'kangar', 'arau', 'padang besar'],
  'Pulau Pinang': ['pulau pinang', 'penang', 'george town', 'georgetown', 'butterworth', 'bayan lepas', 'seberang perai'],
  'Sabah': ['sabah', 'kota kinabalu', 'sandakan', 'tawau', 'lahad datu', 'keningau', 'semporna'],
  'Sarawak': ['sarawak', 'kuching', 'miri', 'sibu', 'bintulu', 'limbang', 'sri aman'],
  'Selangor': ['selangor', 'shah alam', 'petaling jaya', 'subang', 'klang', 'ampang', 'kajang', 'bangi', 'cyberjaya', 'puchong', 'rawang', 'sepang'],
  'Terengganu': ['terengganu', 'kuala terengganu', 'kemaman', 'dungun', 'marang', 'besut'],
  'Kuala Lumpur': ['kuala lumpur', 'kl', 'bukit bintang', 'cheras', 'bangsar', 'mont kiara', 'setapak', 'wangsa maju', 'kepong', 'sentul'],
  'Putrajaya': ['putrajaya'],
  'Labuan': ['labuan'],
};

const getHeatmapData = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const articles = await Article.find({
      publishedAt: { $gte: since }
    }).select('title content sentiment topic categories source').lean();

    const stateData = {};
    for (const state of Object.keys(STATE_KEYWORDS)) {
      stateData[state] = { articles: [], sentiments: [] };
    }

    // Map articles to states
    for (const article of articles) {
      const text = `${article.title || ''} ${article.content || ''}`.toLowerCase();
      for (const [state, keywords] of Object.entries(STATE_KEYWORDS)) {
        if (keywords.some(kw => text.includes(kw))) {
          stateData[state].articles.push(article);
          const sentVal = article.sentiment === 'Positive' ? 1 : article.sentiment === 'Negative' ? -1 : 0;
          stateData[state].sentiments.push(sentVal);
        }
      }
    }

    // Calculate results
    const results = Object.entries(stateData).map(([state, data]) => {
      const count = data.articles.length;
      const avgSentiment = count > 0
        ? data.sentiments.reduce((a, b) => a + b, 0) / count
        : 0;

      // Find top topic (prefer categories over search query)
      const topicCounts = {};
      data.articles.forEach(a => {
        const cats = a.categories && a.categories.length > 0
          ? a.categories
          : [a.topic || 'General'];
        cats.forEach(c => {
          topicCounts[c] = (topicCounts[c] || 0) + 1;
        });
      });
      const topTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return { state, avgSentiment: Math.round(avgSentiment * 100) / 100, articleCount: count, topTopic };
    });

    res.json(results);
  } catch (err) {
    console.error('[Heatmap] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── Categories ──────────────────────────────────────────────────
const { categorizeArticle, getAllCategories } = require('../services/categoryService');

const getCategoriesOverview = async (req, res) => {
  try {
    const articles = await Article.find()
      .sort({ publishedAt: -1 })
      .limit(500)
      .select('title content sentiment categories topic')
      .lean();

    const categoryMap = {};
    const allCats = getAllCategories();
    allCats.forEach(c => { categoryMap[c] = { articles: [], sentiments: [] }; });

    for (const article of articles) {
      // Use stored categories or compute on the fly
      const cats = (article.categories && article.categories.length > 0)
        ? article.categories
        : categorizeArticle(article.title, article.content);

      for (const cat of cats) {
        if (!categoryMap[cat]) categoryMap[cat] = { articles: [], sentiments: [] };
        categoryMap[cat].articles.push(article);
        const sv = article.sentiment === 'Positive' ? 1 : article.sentiment === 'Negative' ? -1 : 0;
        categoryMap[cat].sentiments.push(sv);
      }
    }

    const results = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        articleCount: data.articles.length,
        avgSentiment: data.articles.length > 0
          ? Math.round((data.sentiments.reduce((a, b) => a + b, 0) / data.articles.length) * 100) / 100
          : 0,
      }))
      .filter(c => c.articleCount > 0)
      .sort((a, b) => b.articleCount - a.articleCount);

    res.json(results);
  } catch (err) {
    console.error('[Categories] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

const getCategoryArticles = async (req, res) => {
  try {
    const { name } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Find articles that have this category stored, or match by keyword
    let articles = await Article.find({ categories: name })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // If no stored categories, do keyword-based search
    if (articles.length === 0) {
      const allArticles = await Article.find()
        .sort({ publishedAt: -1 })
        .limit(200)
        .lean();

      articles = allArticles.filter(a => {
        const cats = categorizeArticle(a.title, a.content);
        return cats.includes(name);
      }).slice(0, limit);
    }

    res.json({ articles, page, limit });
  } catch (err) {
    console.error('[Category Articles] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAndAnalyzeNews,
  getTopSources,
  generateDigest,
  getKeywords,
  getForecast,
  getRegionalSentiment,
  getArticleAnalysis,
  getSentimentTimeline,
  compareTopics,
  getHeatmapData,
  getCategoriesOverview,
  getCategoryArticles,
  calculateImpactScore,
  computeArticleImpact,
};
