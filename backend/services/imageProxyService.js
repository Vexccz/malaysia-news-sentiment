const axios = require('axios');
const NodeCache = require('node-cache');

// 7 days in-memory cache. Enough to kill hotlink flakiness + speed repeat views.
const imageCache = new NodeCache({ stdTTL: 7 * 24 * 60 * 60, checkperiod: 600 });
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB hard cap
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
]);

const isSafeRemoteUrl = (url) => {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    // Stop SSRF to localhost/private by cheap hostname block.
    const host = u.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '::1'].includes(host)) return false;
    if (host.endsWith('.local')) return false;
    return true;
  } catch {
    return false;
  }
};

const fetchRemoteImage = async (remoteUrl) => {
  const cached = imageCache.get(remoteUrl);
  if (cached) return { ...cached, cached: true };

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 10000,
    maxContentLength: MAX_IMAGE_BYTES,
    maxBodyLength: MAX_IMAGE_BYTES,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MYNewsSentiment/1.0; +https://malaysia-news-sentiment.vercel.app)',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': 'https://malaysia-news-sentiment.vercel.app/',
    },
    validateStatus: (s) => s >= 200 && s < 400,
  });

  const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported image content-type: ${contentType || 'unknown'}`);
  }

  const payload = {
    buffer: Buffer.from(response.data),
    contentType,
    etag: response.headers.etag || null,
    lastModified: response.headers['last-modified'] || null,
  };

  imageCache.set(remoteUrl, payload);
  return { ...payload, cached: false };
};

module.exports = {
  isSafeRemoteUrl,
  fetchRemoteImage,
};
