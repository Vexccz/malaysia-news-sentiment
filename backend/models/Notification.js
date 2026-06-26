const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'reply',
        'mention',
        'bookmark_topic_update',
        'alert_triggered',
        'discussion_pinned',
        'badge_earned',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String },
    link: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now, index: -1 },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

// TTL: auto-delete read notifications after 30 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30, partialFilterExpression: { read: true } }
);

module.exports = mongoose.model('Notification', notificationSchema);
