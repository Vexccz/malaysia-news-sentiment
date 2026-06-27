// Utility: build a proxied image URL so the backend fetches + caches the bytes.
//
// Reasons we proxy:
//  - Source CDNs (FMT, Astro Awani, etc.) sometimes hotlink-block third parties
//    causing broken thumbnails in production.
//  - Their CDN can be slower than ours.
//  - User's browser never directly contacts the source CDN (privacy).
//
// Behaviour:
//  - Falsy / missing url → returns empty string (caller should hide the <img>).
//  - data: URLs (base64 avatars etc.) → passed through unchanged.
//  - Already-proxied URLs (contain `/api/v1/image?`) → passed through unchanged
//    to avoid double-proxying.
//  - Anything else → `${API_BASE}/image?url=<encoded>`.
//
// Note: `import.meta.env.VITE_API_BASE` must include the `/api/v1` suffix.
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';

export const proxyImage = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('/api/v1/image?')) return url;
  // Reject relative URLs / our own assets — only proxy external http(s).
  if (!/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}/image?url=${encodeURIComponent(url)}`;
};

export default proxyImage;
