const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'telegram', 'push'],
    required: true,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  // Mode picker: 'criteria' = match incoming articles by sentiment/topic/source (existing).
  // 'trending' = match topics whose mention rate spikes in last N hours.
  mode: {
    type: String,
    enum: ['criteria', 'trending'],
    default: 'criteria',
  },
  conditions: {
    sentiment: {
      type: String,
      enum: ['Negative', 'Positive', 'Neutral', 'any'],
      default: 'any',
    },
    threshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    topics: [String],
    sources: [String],
    // Trending-mode tuning
    trendingSpikePct: {
      type: Number,
      min: 10,
      max: 1000,
      default: 50, // % growth vs baseline window
    },
    trendingWindowHours: {
      type: Number,
      min: 1,
      max: 168,
      default: 6,
    },
    trendingMinMentions: {
      type: Number,
      min: 1,
      max: 1000,
      default: 5,
    },
  },
  telegramChatId: {
    type: String,
    default: null,
  },
  lastTriggeredAt: { type: Date, default: null },
}, { timestamps: true });

alertSchema.index({ user: 1, enabled: 1 });

module.exports = mongoose.model('Alert', alertSchema);
