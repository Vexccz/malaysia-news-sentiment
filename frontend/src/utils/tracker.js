/**
 * Non-blocking behavior tracking utility.
 * Uses navigator.sendBeacon when available (fire-and-forget),
 * falls back to fetch with keepalive.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api/v1';

function getToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

/**
 * Track a user action without blocking the UI.
 * @param {'view'|'bookmark'|'search'|'share'|'export'} action
 * @param {object} data - { articleId, query, metadata }
 */
export function trackBehavior(action, data = {}) {
  const token = getToken();
  if (!token) return; // Don't track if not logged in

  const payload = JSON.stringify({
    action,
    articleId: data.articleId || null,
    query: data.query || '',
    metadata: data.metadata || {},
  });

  const url = `${API_BASE}/behavior/track`;

  // Prefer sendBeacon (non-blocking, survives page unload)
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    // sendBeacon doesn't support custom headers, so we include token in a custom header
    // via a workaround: use fetch with keepalive instead
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: payload,
        keepalive: true,
      }).catch(() => {}); // silently swallow
    } catch {
      // Ignore errors — tracking should never break UX
    }
  } else {
    // Fallback: regular fetch with keepalive
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Ignore
    }
  }
}

/**
 * Convenience helpers
 */
export const trackView = (articleId, metadata = {}) =>
  trackBehavior('view', { articleId, metadata });

export const trackBookmark = (articleId, metadata = {}) =>
  trackBehavior('bookmark', { articleId, metadata });

export const trackSearch = (query, metadata = {}) =>
  trackBehavior('search', { query, metadata });

export const trackShare = (articleId, metadata = {}) =>
  trackBehavior('share', { articleId, metadata });

export const trackExport = (metadata = {}) =>
  trackBehavior('export', { metadata });
