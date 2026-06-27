// ─────────────────────────────────────────────────────────────
// Alert-article push fanout.
//
// When a new article matches `isAlert=true` (CRISIS_KEYWORDS) and is
// upserted by the RSS ingestion job, this fans out a web push to every
// user whose pushTopics matches the article. If a user has NO pushTopics
// configured, they receive ALL alert articles (opt-out model).
//
// Dead subscriptions (410/404) are auto-pruned from the user document.
// ─────────────────────────────────────────────────────────────

const User = require('../models/User');
const { sendToMany, isConfigured } = require('./webPushService');

const matchesUserTopics = (article, topics) => {
  if (!topics || topics.length === 0) return true; // empty = all alerts
  const haystack = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  return topics.some((t) => t && haystack.includes(String(t).toLowerCase()));
};

const removeDeadSubscription = async (userId, endpoint) => {
  await User.updateOne(
    { _id: userId },
    { $pull: { pushSubscriptions: { endpoint } } }
  );
};

const pushAlertToInterestedUsers = async (article) => {
  if (!isConfigured || !article) return { sent: 0, removed: 0 };

  // Only target users with at least one push subscription.
  const users = await User.find({
    'pushSubscriptions.0': { $exists: true },
  }).select('_id pushSubscriptions pushTopics').lean();

  if (!users.length) return { sent: 0, removed: 0 };

  const payload = {
    title: `⚠️ ${article.source || 'Alert'}`,
    body: String(article.title || '').slice(0, 200),
    url: `/articles/${article._id || ''}`,
    sentiment: article.sentiment || 'Neutral',
    articleId: String(article._id || ''),
  };

  let totalSent = 0;
  let totalRemoved = 0;

  for (const user of users) {
    if (!matchesUserTopics(article, user.pushTopics)) continue;

    const { sent, removed } = await sendToMany(
      user.pushSubscriptions,
      payload,
      async (deadSub) => removeDeadSubscription(user._id, deadSub.endpoint)
    );
    totalSent += sent;
    totalRemoved += removed;
  }
  return { sent: totalSent, removed: totalRemoved };
};

module.exports = { pushAlertToInterestedUsers };
