/**
 * Stream service (Feature #2)
 *
 * Broadcasts newly-ingested articles to all connected Socket.IO clients in real-time.
 * Persists the last N article events in Upstash Redis (XADD) so newly-connected
 * clients can replay recent history if they want.
 *
 * Architecture:
 *   RSS Ingestion → broadcastArticle() → Redis XADD + Socket.IO emit
 *   Frontend receives 'article:new' → prepends to dashboard + shows NEW badge
 *
 * Redis Stream:
 *   key: stream:articles
 *   maxlen: 100 (keep last 100 events, auto-trim)
 *   fields: { id, title, source, sentiment, confidence, publishedAt, urlToImage, isAlert }
 */

const STREAM_KEY = 'stream:articles';
const STREAM_MAXLEN = 100;

let _redis = null;

const getRedis = () => {
  if (_redis !== null) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[stream] Upstash creds missing — running in no-op mode');
    _redis = false; // sentinel: tried and failed
    return false;
  }

  try {
    const { Redis } = require('@upstash/redis');
    _redis = new Redis({ url, token });
    console.log('[stream] Upstash Redis connected:', url.replace(/https?:\/\//, '').slice(0, 25));
    return _redis;
  } catch (err) {
    console.error('[stream] Failed to init Upstash:', err.message);
    _redis = false;
    return false;
  }
};

/**
 * Serialize an article into the lean payload sent over the wire.
 * Frontend only needs minimal fields to render the "NEW" card.
 */
const serializeArticle = (article) => {
  if (!article) return null;
  return {
    id: String(article._id || article.id || ''),
    title: article.title || '',
    description: (article.description || '').slice(0, 240),
    source: typeof article.source === 'string' ? article.source : (article.source?.name || 'Unknown'),
    sentiment: article.sentiment || 'Neutral',
    confidence: Number(article.confidence || 0),
    url: article.url || '',
    urlToImage: article.urlToImage || '',
    publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString(),
    topic: article.topic || 'Malaysia',
    isAlert: !!article.isAlert,
    impactScore: Number(article.impactScore || 0),
  };
};

/**
 * Broadcast a freshly-created article to all connected clients.
 *
 * @param {object} article - Mongoose document (or POJO with _id)
 * @param {object} io - Socket.IO server instance (from app.get('io'))
 */
const broadcastArticle = async (article, io) => {
  const payload = serializeArticle(article);
  if (!payload || !payload.id) return false;

  // 1) Socket.IO real-time push (fan-out to every connected user)
  if (io) {
    try {
      io.emit('article:new', payload);
    } catch (err) {
      console.error('[stream] Socket.IO emit failed:', err.message);
    }
  }

  // 2) Redis stream (persisted last-100 history for replay / late joiners)
  const redis = getRedis();
  if (redis) {
    try {
      // Upstash XADD signature: xadd(key, options, fieldValues)
      // We use NOMKSTREAM=false (create if absent) and trim to MAXLEN
      await redis.xadd(STREAM_KEY, '*', {
        id: payload.id,
        title: payload.title,
        source: payload.source,
        sentiment: payload.sentiment,
        confidence: String(payload.confidence),
        publishedAt: payload.publishedAt,
        urlToImage: payload.urlToImage,
        isAlert: payload.isAlert ? '1' : '0',
        topic: payload.topic,
      });

      // Trim to last STREAM_MAXLEN entries (approximate)
      await redis.xtrim(STREAM_KEY, { strategy: 'MAXLEN', threshold: STREAM_MAXLEN, exactness: '~' });
    } catch (err) {
      console.error('[stream] Redis XADD failed:', err.message);
    }
  }

  return true;
};

/**
 * Fetch last N article events from the Redis stream.
 * Used by frontend on initial load to replay recent activity.
 *
 * Upstash JS SDK returns XREVRANGE as an object `{streamId: fieldsObj}`,
 * not the array-of-tuples shape of node-redis. We normalize here.
 */
const getRecentStream = async (count = 20) => {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const result = await redis.xrevrange(STREAM_KEY, '+', '-', count);
    if (!result || typeof result !== 'object') return [];

    // Object shape: { "streamId": { id, title, ... }, ... }
    // XREVRANGE already newest-first, so Object.entries preserves order.
    const list = Object.entries(result).map(([streamId, fields]) => {
      const f = fields || {};
      return {
        streamId,
        id: f.id,
        title: f.title,
        source: f.source,
        sentiment: f.sentiment,
        confidence: Number(f.confidence || 0),
        publishedAt: f.publishedAt,
        urlToImage: f.urlToImage,
        isAlert: f.isAlert === '1' || f.isAlert === 1 || f.isAlert === true,
        topic: f.topic,
      };
    });

    return list;
  } catch (err) {
    console.error('[stream] XREVRANGE failed:', err.message);
    return [];
  }
};

/**
 * Get current count of items in the Redis stream (for health check).
 */
const getStreamLength = async () => {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return await redis.xlen(STREAM_KEY);
  } catch (err) {
    return 0;
  }
};

module.exports = {
  broadcastArticle,
  getRecentStream,
  getStreamLength,
  serializeArticle,
  STREAM_KEY,
};
