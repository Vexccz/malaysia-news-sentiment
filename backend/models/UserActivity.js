const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['view', 'bookmark', 'search', 'share', 'export'],
      required: true,
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article',
      default: null,
    },
    query: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now, index: true },
    metadata: {
      sentiment: { type: String, enum: ['Positive', 'Negative', 'Neutral', null], default: null },
      topic: { type: String, default: '' },
      source: { type: String, default: '' },
      duration: { type: Number, default: 0 }, // seconds spent
    },
  },
  { timestamps: true }
);

// Compound index for fast per-user queries sorted by time
userActivitySchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
