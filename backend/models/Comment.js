const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:     { type: String, required: true, maxlength: 1000 },
  isAnonymous: { type: Boolean, default: false },
  likes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:   { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema(
  {
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    articleId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    content:         { type: String, required: true, maxlength: 2000 },
    sentiment:       { type: String, enum: ['Positive', 'Negative', 'Neutral', null], default: null },
    commentSentiment:{ type: String, enum: ['Positive', 'Negative', 'Neutral'], default: null },
    isAnonymous:     { type: Boolean, default: false },
    likes:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies:         [replySchema],
  },
  { timestamps: true }
);

// Compound index for efficient queries
commentSchema.index({ articleId: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
