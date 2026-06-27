const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const User = require('../models/User');
const { publicKey, isConfigured, sendNotification } = require('../services/webPushService');

// ── Subscription schemas ─────────────────────────────────────
const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      auth:   z.string().min(1),
      p256dh: z.string().min(1),
    }),
  }),
  deviceLabel: z.string().max(120).optional(),
});

const topicsSchema = z.object({
  topics: z.array(z.string().trim().min(1).max(60)).max(20),
});

// ── GET /push/key  →  VAPID public key for the browser ───────
router.get('/key', (req, res) => {
  res.json({ publicKey, isConfigured });
});

// ── POST /push/subscribe  (auth) ─────────────────────────────
router.post('/subscribe', protect, validate(subscribeSchema), async (req, res) => {
  try {
    const { subscription, deviceLabel = '' } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Replace any existing subscription with same endpoint (re-subscribe case)
    user.pushSubscriptions = (user.pushSubscriptions || []).filter(
      (s) => s.endpoint !== subscription.endpoint
    );
    user.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceLabel,
    });
    await user.save();
    res.json({ ok: true, count: user.pushSubscriptions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /push/unsubscribe  (auth) ───────────────────────────
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const before = user.pushSubscriptions?.length || 0;
    user.pushSubscriptions = (user.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
    await user.save();
    res.json({ ok: true, removed: before - user.pushSubscriptions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /push/topics ─────────────────────────────────────────
router.get('/topics', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('pushTopics').lean();
    res.json({ topics: user?.pushTopics || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /push/topics ─────────────────────────────────────────
router.put('/topics', protect, validate(topicsSchema), async (req, res) => {
  try {
    const { topics } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { pushTopics: topics } },
      { new: true }
    );
    res.json({ topics: user.pushTopics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /push/test  (auth) — send a test push to yourself ───
router.post('/test', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.pushSubscriptions?.length) {
      return res.status(400).json({ error: 'No active push subscription' });
    }

    const payload = {
      title: 'MY News Sentiment',
      body: 'Test notification — your push setup is working.',
      url: '/',
    };
    let sent = 0;
    for (const sub of user.pushSubscriptions) {
      const ok = await sendNotification(sub, payload).catch(() => false);
      if (ok) sent++;
    }
    res.json({ ok: true, sent, total: user.pushSubscriptions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
