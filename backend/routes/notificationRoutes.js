const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');

// GET /api/v1/notifications — list current user's notifications
router.get('/', protect, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const onlyUnread = req.query.unread === '1' || req.query.unread === 'true';

    const filter = { user: req.user.id };
    if (onlyUnread) filter.read = false;

    const [items, unreadCount, totalCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user.id, read: false }),
      Notification.countDocuments({ user: req.user.id }),
    ]);

    res.json({ items, unreadCount, totalCount });
  } catch (err) {
    console.error('GET notifications failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/v1/notifications/:id/read — mark one as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    console.error('mark read failed:', err.message);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

// PUT /api/v1/notifications/read-all — mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );
    res.json({ updated: result.modifiedCount || 0 });
  } catch (err) {
    console.error('mark all read failed:', err.message);
    res.status(500).json({ error: 'Failed to mark all notifications' });
  }
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('delete notification failed:', err.message);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// POST /api/v1/notifications/test — dev helper, create sample notification
router.post('/test', protect, async (req, res) => {
  try {
    const sample = await Notification.create({
      user: req.user.id,
      type: 'system',
      title: 'Sample notification',
      body: 'This is a test notification from MY News Sentiment.',
      link: '/community',
    });
    res.json(sample);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create test notification' });
  }
});

module.exports = router;
