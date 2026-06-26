const Alert = require('../models/Alert');
const Article = require('../models/Article');
const Notification = require('../models/Notification');
const { sendAlertEmail } = require('./emailService');

/**
 * Check all enabled CRITERIA alerts against a newly analyzed article.
 * Called after each article is processed. Trending alerts are skipped here
 * — they run on a periodic interval in evaluateTrendingAlerts().
 */
const checkAlerts = async (article) => {
  try {
    const alerts = await Alert.find({ enabled: true, mode: { $ne: 'trending' } }).populate('user', 'name email');

    for (const alert of alerts) {
      if (!matchesConditions(alert, article)) continue;
      await deliverAlert(alert, article, 'match');
    }
  } catch (err) {
    console.error('Alert check error:', err.message);
  }
};

/**
 * Check if an article matches alert conditions
 */
const matchesConditions = (alert, article) => {
  const { sentiment, threshold, topics, sources } = alert.conditions;

  // Sentiment filter (normalize case for comparison)
  if (sentiment !== 'any') {
    if (article.sentiment?.toLowerCase() !== sentiment.toLowerCase()) return false;
  }

  // Confidence threshold
  if (article.confidence && article.confidence < threshold) return false;

  // Topics filter (schema uses 'topic' singular string, not 'topics' array)
  if (topics && topics.length > 0) {
    const articleTopic = (article.topic || '').toLowerCase();
    const titleLower = (article.title || '').toLowerCase();
    const hasMatch = topics.some(t => 
      articleTopic.includes(t.toLowerCase()) || titleLower.includes(t.toLowerCase())
    );
    if (!hasMatch) return false;
  }

  // Sources filter
  if (sources && sources.length > 0) {
    const articleSource = (article.source || '').toLowerCase();
    const hasMatch = sources.some(s => articleSource.includes(s.toLowerCase()));
    if (!hasMatch) return false;
  }

  return true;
};

/**
 * Send email notification for an alert (uses consolidated emailService)
 */
const sendAlertEmailNotification = async (user, article, alert) => {
  try {
    await sendAlertEmail(user, article, alert);
  } catch (err) {
    console.error('Email alert failed:', err.message);
  }
};

const sendPushAlert = async (userId, article, alert, triggerType = 'match') => {
  try {
    await Notification.create({
      user: userId,
      type: triggerType === 'trending' ? 'trending' : 'system',
      title: triggerType === 'trending' ? `Trending spike: ${article.topic || article.title}` : 'Alert matched your rule',
      body: `${article.title} · ${article.source || 'Unknown'} · ${article.sentiment || 'Neutral'}`,
      link: article.url ? `/history` : '/alerts',
      metadata: {
        alertId: alert._id,
        articleId: article._id,
        triggerType,
        topic: article.topic || null,
      },
    });
  } catch (err) {
    console.error('Push alert failed:', err.message);
  }
};

const deliverAlert = async (alert, article, triggerType = 'match') => {
  if (alert.type === 'email' && alert.user?.email) {
    await sendAlertEmailNotification(alert.user, article, alert);
  } else if (alert.type === 'telegram' && alert.telegramChatId) {
    await sendTelegramAlert(alert.telegramChatId, article);
  } else if (alert.type === 'push') {
    await sendPushAlert(alert.user?._id || alert.user, article, alert, triggerType);
  }

  alert.lastTriggeredAt = new Date();
  try { await alert.save(); } catch {}
};

const evaluateTrendingAlerts = async () => {
  try {
    const alerts = await Alert.find({ enabled: true, mode: 'trending' }).populate('user', 'name email');
    const now = Date.now();

    for (const alert of alerts) {
      const hours = Number(alert.conditions?.trendingWindowHours || 6);
      const spikePct = Number(alert.conditions?.trendingSpikePct || 50);
      const minMentions = Number(alert.conditions?.trendingMinMentions || 5);
      const topics = (alert.conditions?.topics || []).filter(Boolean);
      const currentSince = new Date(now - hours * 60 * 60 * 1000);
      const baselineSince = new Date(now - hours * 2 * 60 * 60 * 1000);
      const baselineUntil = currentSince;

      const currentMatch = {
        createdAt: { $gte: currentSince },
        ...(topics.length ? { topic: { $in: topics } } : {}),
      };
      const baselineMatch = {
        createdAt: { $gte: baselineSince, $lt: baselineUntil },
        ...(topics.length ? { topic: { $in: topics } } : {}),
      };

      const [current, baseline] = await Promise.all([
        Article.aggregate([
          { $match: currentMatch },
          { $group: { _id: '$topic', count: { $sum: 1 }, topTitle: { $first: '$title' }, source: { $first: '$source' }, sentiment: { $first: '$sentiment' }, url: { $first: '$url' } } },
          { $sort: { count: -1 } },
        ]),
        Article.aggregate([
          { $match: baselineMatch },
          { $group: { _id: '$topic', count: { $sum: 1 } } },
        ]),
      ]);

      const baselineMap = new Map(baseline.map((b) => [b._id || 'general', b.count]));
      for (const row of current) {
        const topic = row._id || 'general';
        const currentCount = row.count || 0;
        const baselineCount = baselineMap.get(topic) || 0;
        const growth = baselineCount <= 0 ? (currentCount >= minMentions ? 999 : 0) : (((currentCount - baselineCount) / baselineCount) * 100);
        const cooldown = alert.lastTriggeredAt && (now - new Date(alert.lastTriggeredAt).getTime()) < (hours * 60 * 60 * 1000);

        if (currentCount < minMentions || growth < spikePct || cooldown) continue;

        await deliverAlert(alert, {
          _id: null,
          title: `Topic spike detected: ${topic}`,
          source: row.source || 'MY News Sentiment',
          sentiment: row.sentiment || 'Neutral',
          topic,
          url: row.url || '',
        }, 'trending');
        break;
      }
    }
  } catch (err) {
    console.error('Trending alert evaluation failed:', err.message);
  }
};

/**
 * Send Telegram notification for an alert
 */
const sendTelegramAlert = async (chatId, article) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not set, skipping telegram alert');
      return;
    }

    const sentimentEmoji = article.sentiment === 'Positive' ? '🟢' : article.sentiment === 'Negative' ? '🔴' : '🟡';
    const text = `${sentimentEmoji} *News Alert*\n\n*${article.title}*\nSource: ${article.source || 'Unknown'}\nSentiment: ${article.sentiment} (${Math.round((article.confidence || 0) * 100)}%)\n${article.url ? `\n[Read Article](${article.url})` : ''}`;

    const fetch = require('node-fetch');
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false,
      }),
    });
  } catch (err) {
    console.error('Telegram alert failed:', err.message);
  }
};

module.exports = { checkAlerts, sendAlertEmailNotification, sendTelegramAlert, evaluateTrendingAlerts, sendPushAlert, deliverAlert };
