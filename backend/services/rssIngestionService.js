const pLimit = require('p-limit');
const Article = require('../models/Article');
const { fetchFMTNews } = require('./fmtService');
const { fetchAstroAwaniNews } = require('./astroAwaniService');
const { fetchMalaysiakiniNews } = require('./malaysiakiniService');
const { analyseArticle } = require('./openaiService');
const { recordRssFetch } = require('./healthService');
const { pushAlertToInterestedUsers } = require('./pushAlertService');
const { broadcastArticle } = require('./streamService');
const { syncArticleToGraph } = require('./graphSyncService');

const sentimentLimit = pLimit(5);

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
  return 'Unknown';
};

const SOURCE_SEED = (name) => {
  const n = (name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = ((hash << 5) - hash + n.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  if (['bernama', 'the star', 'astro awani', 'fmt', 'malay mail', 'malaysiakini'].some(s => n.includes(s))) return 15 + (h % 11);
  if (['edge', 'new straits times', 'utusan', 'kosmo'].some(s => n.includes(s))) return 8 + (h % 10);
  return 1 + (h % 5);
};

const ingestRssBatch = async (ioInstance = null) => {
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

  const mergedRaw = [...astroAwaniArts, ...fmtDirectArts, ...mkiniArts]
    .filter(art => art && art.url)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const seenUrls = new Set();
  const rawArticles = mergedRaw.filter(art => {
    if (!art.url || seenUrls.has(art.url)) return false;
    seenUrls.add(art.url);
    return true;
  }).filter(isMalaysiaRelevantArticle).slice(0, 80);

  const urls = rawArticles.map(a => a.url);
  const existingArticles = await Article.find({ url: { $in: urls } }).lean();
  const existingMap = new Map(existingArticles.map(a => [a.url, a]));

  let created = 0;
  let updated = 0;

  await Promise.all(rawArticles.map((article) => sentimentLimit(async () => {
    const existing = existingMap.get(article.url);
    if (existing) {
      await Article.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: {
            source: existing.source && existing.source !== 'Unknown' ? existing.source : extractSourceFromUrl(existing.url),
            topic: existing.topic || 'Malaysia',
            publishedAt: article.publishedAt ? new Date(article.publishedAt) : existing.publishedAt,
            urlToImage: article.urlToImage || existing.urlToImage || '',
          }
        },
        { new: true }
      );
      updated++;
      return;
    }

    const analysis = await analyseArticle(article.title, article.description);
    const sourceName = article.source?.name || extractSourceFromUrl(article.url);
    const isAlert = isAlertArticle(article.title, article.description);
    const upserted = await Article.findOneAndUpdate(
      { url: article.url },
      {
        $set: {
          title: decodeHTMLEntities(article.title),
          description: decodeHTMLEntities(article.description || ''),
          content: decodeHTMLEntities(article.content || ''),
          source: sourceName,
          url: article.url,
          urlToImage: article.urlToImage || '',
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
          topic: 'Malaysia',
          ...analysis,
          isAlert,
          impactScore: SOURCE_SEED(sourceName),
          userId: null,
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    created++;

    // Real-time broadcast (Feature #2) — fan-out the freshly-created article
    // to all connected Socket.IO clients + persist to Redis stream.
    if (upserted) {
      broadcastArticle(upserted, ioInstance).catch((err) => {
        console.error('[stream] broadcast failed:', err.message);
      });

      // Knowledge graph projection (Feature #5) — incremental sync to Neo4j.
      // MongoDB stays source of truth; this just keeps Aura warm.
      syncArticleToGraph(upserted).catch((err) => {
        console.error('[graph] sync failed:', err.message);
      });
    }

    // Push notification to interested users for new alert articles.
    if (isAlert && upserted) {
      pushAlertToInterestedUsers(upserted).catch((err) => {
        console.error('Push alert fanout failed:', err.message);
      });
    }
  })));

  return {
    fetched: rawArticles.length,
    created,
    updated,
    totalSources: 3,
  };
};

module.exports = { ingestRssBatch };
