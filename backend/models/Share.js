const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    platform:  {
      type: String,
      enum: ['whatsapp', 'twitter', 'linkedin', 'email', 'copy_link'],
      required: true,
    },
    sharedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for getting shared articles feed
shareSchema.index({ sharedAt: -1 });
shareSchema.index({ articleId: 1, sharedAt: -1 });

module.exports = mongoose.model('Share', shareSchema);
