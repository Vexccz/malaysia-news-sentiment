const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role:    { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  sources: [{
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    title: String,
    source: String,
    sentiment: String,
    confidence: Number,
    url: String,
  }],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const aiChatSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:    { type: String, default: 'New conversation' },
  messages: [messageSchema],
  archived: { type: Boolean, default: false },
}, { timestamps: true });

aiChatSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('AiChat', aiChatSchema);
