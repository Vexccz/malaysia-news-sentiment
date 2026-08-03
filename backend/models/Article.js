const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema(
  {
    // ── Content ─────────────────────────────────────────────
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    content:     { type: String, default: '' },
    source:      { type: String, default: 'Unknown' },
    url:         { type: String, required: true },
    urlToImage:  { type: String, default: '' },
    publishedAt: { type: Date,   default: Date.now },
    topic:       { type: String, default: 'general' },

    // ── Sentiment & Feedback (#2 Hybrid System) ────────────────
    sentiment:   { type: String, enum: ['Positive', 'Negative', 'Neutral'], required: true },
    aiSentiment: { type: String, enum: ['Positive', 'Negative', 'Neutral'] },
    confidence:  { type: Number, min: 0, max: 1, default: 0 },
    reason:      { type: String, default: '' },
    isAlert:     { type: Boolean, default: false },
    stateLocation: { type: String, default: 'General' }, 
    language:      { type: String, default: 'en' },
    categories:    [{ type: String }],
    analysis_source: { type: String, default: 'local' },
    modelVersion: { type: String, default: '' },
    evidencePhrases: [{ type: String }],
    entities: [{
      name: { type: String, required: true },
      category: { type: String, required: true },
      type: { type: String, required: true },
    }],
    embedding:     { type: [Number], index: false }, // 384 dimensions

    // ── Popularity & User Stats (#1-3) ────────────────────────
    viewCount: { type: Number, default: 0, index: -1 },
    bookmarksCount: { type: Number, default: 0 },
    
    // Detailed User Voting
    feedback: {
      Positive: { type: Number, default: 0 },
      Negative: { type: Number, default: 0 },
      Neutral:  { type: Number, default: 0 },
      upVotes:  { type: Number, default: 0 },
      downVotes: { type: Number, default: 0 },
      // Tracks who already voted to prevent duplicates (#Bug3)
      voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },

    // ── Metrics & Reach (#Meltwater Style) ────────────────────
    impactScore: { type: Number, default: 0, min: 0, max: 100 },
    
    // ── Multi-user isolation (#2) ─────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      index: true,
    },
  },
  { timestamps: true }
);

// ── Indexes (#8) ─────────────────────────────────────────────
articleSchema.index({ url: 1 }, { unique: true });
articleSchema.index({ sentiment: 1 });
articleSchema.index({ topic: 1 });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ updatedAt: -1 }); // #Fix for Bumping to top
articleSchema.index({ isAlert: 1 });
articleSchema.index({ stateLocation: 1 });
articleSchema.index({ userId: 1, updatedAt: -1 }); // #Fix for Bumping to top
articleSchema.index({ 'entities.name': 1 });

articleSchema.pre('validate', function normalizeStateLocation() {
  const { normalizeState } = require('../services/stateNormalizer');
  this.stateLocation = normalizeState(this.stateLocation);
});

module.exports = mongoose.model('Article', articleSchema);
