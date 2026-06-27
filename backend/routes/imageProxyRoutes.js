const express = require('express');
const router = express.Router();
const { isSafeRemoteUrl, fetchRemoteImage } = require('../services/imageProxyService');

/**
 * GET /api/v1/image?url=<encoded-remote-url>
 *
 * Server-side image proxy. Reasons we proxy:
 *  - Source CDNs (Astro Awani, FMT) sometimes block hotlinking → broken thumbnails.
 *  - Slower network than ours → user waits.
 *  - Privacy — browser never directly contacts the source CDN.
 *
 * Cached 7 days in-process (NodeCache). Repeats serve immediately.
 * Hard cap 5MB per image. Allowed MIME types only.
 */
router.get('/', async (req, res) => {
  const remoteUrl = req.query.url;
  if (!remoteUrl || typeof remoteUrl !== 'string') {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  if (!isSafeRemoteUrl(remoteUrl)) {
    return res.status(400).json({ error: 'Unsafe or invalid url' });
  }

  try {
    const { buffer, contentType, etag, lastModified, cached } = await fetchRemoteImage(remoteUrl);

    // Browser-side cache for 7 days too — let CDN/browser absorb hits.
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.setHeader('Content-Type', contentType);
    if (etag) res.setHeader('ETag', etag);
    if (lastModified) res.setHeader('Last-Modified', lastModified);
    res.setHeader('X-Proxy-Cache', cached ? 'HIT' : 'MISS');
    res.send(buffer);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({
      error: 'Image proxy failed',
      detail: err.message,
    });
  }
});

module.exports = router;
