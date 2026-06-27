// ─────────────────────────────────────────────────────────────
// Web Push (VAPID) service.
//
// Sends browser push notifications to users who subscribed via
// the frontend service worker. Used for:
//   - Alert articles matching user's saved topics
//   - Discussion replies (future)
//
// Configuration (env):
//   VAPID_PUBLIC_KEY  (required)
//   VAPID_PRIVATE_KEY (required)
//   VAPID_SUBJECT     (default: mailto:admin@mynews.my)
//
// If env vars missing, push silently no-ops (so dev still runs).
// ─────────────────────────────────────────────────────────────

const webpush = require('web-push');

const PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:admin@mynews.my';

const isConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
if (isConfigured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  console.log('🔔 Web Push configured.');
} else {
  console.log('🔔 Web Push NOT configured (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY).');
}

/**
 * Send a notification to a single subscription.
 * Returns true on success, false on failure (gone/invalid subscription).
 */
const sendNotification = async (subscription, payload) => {
  if (!isConfigured) return false;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60 });
    return true;
  } catch (err) {
    // 404 / 410 → subscription is dead, caller should remove from DB
    if (err.statusCode === 404 || err.statusCode === 410) {
      const e = new Error('Subscription gone');
      e.code = 'GONE';
      throw e;
    }
    console.error('Web push failed:', err.message);
    return false;
  }
};

/**
 * Send to many subscriptions; auto-remove dead ones.
 * Returns { sent, removed }.
 */
const sendToMany = async (subscriptions, payload, onRemove) => {
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const ok = await sendNotification(sub, payload);
        if (ok) sent++;
      } catch (err) {
        if (err.code === 'GONE' && typeof onRemove === 'function') {
          await onRemove(sub);
          removed++;
        }
      }
    })
  );
  return { sent, removed };
};

module.exports = {
  isConfigured,
  publicKey: PUBLIC_KEY,
  sendNotification,
  sendToMany,
};
