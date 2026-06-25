const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema(
  {
    question:    { type: String, required: true, maxlength: 500 },
    options:     [{
      text:    { type: String, required: true, maxlength: 200 },
      voters:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    }],
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    articleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Article', default: null },
    expiresAt:   { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    isAnonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

pollSchema.index({ expiresAt: 1 });
pollSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Poll', pollSchema);
