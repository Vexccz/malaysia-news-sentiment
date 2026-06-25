const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content:     { type: String, required: true, maxlength: 2000 },
    sentiment:   { type: String, enum: ['Positive', 'Negative', 'Neutral'], default: null },
    isAnonymous: { type: Boolean, default: false },
    likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    reactions:   [{
      emoji:  { type: String, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    }],
    replies:     [{
      userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content:     { type: String, required: true, maxlength: 1000 },
      isAnonymous: { type: Boolean, default: false },
      likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      createdAt:   { type: Date, default: Date.now },
    }],
    tags:        [{ type: String, trim: true }],
    pinned:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
