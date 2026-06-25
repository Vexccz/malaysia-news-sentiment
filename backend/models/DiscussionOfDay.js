const mongoose = require('mongoose');

const discussionOfDaySchema = new mongoose.Schema(
  {
    articleId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, unique: true },
    setBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason:     { type: String, maxlength: 500 },
    active:     { type: Boolean, default: true },
    expiresAt:  { type: Date },
  },
  { timestamps: true }
);

discussionOfDaySchema.index({ active: 1, createdAt: -1 });

module.exports = mongoose.model('DiscussionOfDay', discussionOfDaySchema);
