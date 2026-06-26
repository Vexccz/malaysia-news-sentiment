const Alert = require('../models/Alert');
const { sendAlertEmailNotification, sendTelegramAlert } = require('../services/alertService');

// GET /api/alerts — list user's alerts
exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/alerts — create alert
exports.createAlert = async (req, res) => {
  try {
    const { type, enabled, mode, conditions, telegramChatId } = req.body;

    if (!type || !['email', 'telegram', 'push'].includes(type)) {
      return res.status(400).json({ error: 'Invalid alert type. Must be email, telegram, or push.' });
    }

    if (type === 'telegram' && !telegramChatId) {
      return res.status(400).json({ error: 'Telegram chat ID is required for telegram alerts.' });
    }

    const resolvedMode = mode === 'trending' ? 'trending' : 'criteria';

    const alert = await Alert.create({
      user: req.userId,
      type,
      mode: resolvedMode,
      enabled: enabled !== false,
      conditions: {
        sentiment: conditions?.sentiment || 'any',
        threshold: conditions?.threshold ?? 0.7,
        topics: conditions?.topics || [],
        sources: conditions?.sources || [],
        trendingSpikePct: conditions?.trendingSpikePct ?? 50,
        trendingWindowHours: conditions?.trendingWindowHours ?? 6,
        trendingMinMentions: conditions?.trendingMinMentions ?? 5,
      },
      telegramChatId: type === 'telegram' ? telegramChatId : null,
    });

    res.status(201).json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/alerts/:id — update alert
exports.updateAlert = async (req, res) => {
  try {
    const alert = await Alert.findOne({ _id: req.params.id, user: req.userId });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    const { type, enabled, mode, conditions, telegramChatId } = req.body;

    if (type) alert.type = type;
    if (typeof enabled === 'boolean') alert.enabled = enabled;
    if (mode && ['criteria', 'trending'].includes(mode)) alert.mode = mode;
    if (conditions) {
      if (conditions.sentiment) alert.conditions.sentiment = conditions.sentiment;
      if (conditions.threshold !== undefined) alert.conditions.threshold = conditions.threshold;
      if (conditions.topics) alert.conditions.topics = conditions.topics;
      if (conditions.sources) alert.conditions.sources = conditions.sources;
      if (conditions.trendingSpikePct !== undefined) alert.conditions.trendingSpikePct = conditions.trendingSpikePct;
      if (conditions.trendingWindowHours !== undefined) alert.conditions.trendingWindowHours = conditions.trendingWindowHours;
      if (conditions.trendingMinMentions !== undefined) alert.conditions.trendingMinMentions = conditions.trendingMinMentions;
    }
    if (telegramChatId !== undefined) alert.telegramChatId = telegramChatId;

    await alert.save();
    res.json({ alert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/alerts/:id — delete alert
exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    res.json({ message: 'Alert deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/alerts/test — send test notification
exports.testAlert = async (req, res) => {
  try {
    const { alertId } = req.body;
    const alert = await Alert.findOne({ _id: alertId, user: req.userId }).populate('user', 'name email');
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });

    const testArticle = {
      title: alert.mode === 'trending' ? 'Trending Spike Detected: Ringgit Coverage' : 'Test Alert: Malaysia Economy Shows Growth',
      source: 'Test Source',
      sentiment: 'positive',
      confidence: 0.92,
      url: 'https://example.com/test-article',
      topic: alert.mode === 'trending' ? (alert.conditions?.topics?.[0] || 'general') : 'general',
    };

    const { deliverAlert } = require('../services/alertService');
    await deliverAlert(alert, testArticle, alert.mode === 'trending' ? 'trending' : 'match');

    res.json({ message: 'Test notification sent!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/alerts/evaluate-trending — manual trigger for trending evaluator
exports.evaluateTrendingNow = async (req, res) => {
  try {
    const { evaluateTrendingAlerts } = require('../services/alertService');
    await evaluateTrendingAlerts();
    res.json({ message: 'Trending evaluator finished.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
