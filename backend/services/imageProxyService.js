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

// Per-CDN referer map — many MY news CDNs block hotlinking based on Referer.
// Setting Referer to the source domain itself bypasses the check.
const getRefererForHost = (host) => {
  const h = host.toLowerCase();
  if (h.includes('astroawani')) return 'https://www.astroawani.com/';
  if (h.includes('malaysiakini')) return 'https://www.malaysiakini.com/';
  if (h.includes('freemalaysiatoday') || h.includes('fmt')) return 'https://www.freemalaysiatoday.com/';
  if (h.includes('bernama')) return 'https://www.bernama.com/';
  if (h.includes('thestar')) return 'https://www.thestar.com.my/';
  if (h.includes('nst.com.my')) return 'https://www.nst.com.my/';
  if (h.includes('themalaysianreserve')) return 'https://themalaysianreserve.com/';
  if (h.includes('hmetro')) return 'https://www.hmetro.com.my/';
  if (h.includes('sinarharian')) return 'https://www.sinarharian.com.my/';
  if (h.includes('utusan')) return 'https://www.utusan.com.my/';
  if (h.includes('malaymail')) return 'https://www.malaymail.com/';
  if (h.includes('theedge')) return 'https://www.theedgemarkets.com/';
  if (h.includes('berita') || h.includes('rtm')) return 'https://berita.rtm.gov.my/';
  return 'https://www.google.com/';
};

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const fetchRemoteImage = async (remoteUrl) => {
  const cached = imageCache.get(remoteUrl);
  if (cached) return { ...cached, cached: true };

  const urlObj = new URL(remoteUrl);
  const referer = getRefererForHost(urlObj.hostname);

  const response = await axios.get(remoteUrl, {
    responseType: 'arraybuffer',
    timeout: 12000,
    maxContentLength: MAX_IMAGE_BYTES,
    maxBodyLength: MAX_IMAGE_BYTES,
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ms;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': referer,
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
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
