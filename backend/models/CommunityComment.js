const mongoose = require('mongoose');

const communityCommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  authorName: {
    type: String,
    required: [true, 'Author name is required']
  },
  authorRole: {
    type: String,
    default: 'reader'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  sentiment: {
    type: String,
    enum: ['positive', 'negative', 'neutral']
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article'
  },
  discussionId: {
    type: String
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CommunityComment',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CommunityComment', communityCommentSchema);
