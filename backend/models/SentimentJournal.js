const mongoose = require('mongoose');

const sentimentJournalSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Local calendar date as YYYY-MM-DD so one user has one entry per day (UTC-safe key).
  date:       { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  // Optional user-reported mood (-2..+2)
  mood:       { type: Number, min: -2, max: 2, default: 0 },
  // Free-text reflection
  note:       { type: String, default: '', maxlength: 2000 },
  // What the user actually read/engaged with that day — denormalised for analytics
  articles: [{
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    title:     String,
    sentiment: String,
    confidence: Number,
    source:    String,
  }],
  // Tags the user attaches (politics, ekonomi, sukan, etc.)
  tags:       [{ type: String }],
  // Snapshot of dominant sentiment for the day (computed when saving)
  daySentiment: {
    label:      { type: String, enum: ['Positive', 'Negative', 'Neutral', 'Mixed'], default: 'Neutral' },
    score:      { type: Number, default: 0 }, // -1..+1
    totals:     { positive: Number, negative: Number, neutral: Number },
  },
}, { timestamps: true });

sentimentJournalSchema.index({ user: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('SentimentJournal', sentimentJournalSchema);
