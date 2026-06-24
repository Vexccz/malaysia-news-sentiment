const Comment = require('../models/Comment');
const Share = require('../models/Share');
const Article = require('../models/Article');

// ── Comments ────────────────────────────────────────────────────

// @desc    Add a comment to an article
// @route   POST /api/v1/collab/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { articleId, content, sentiment } = req.body;

    if (!articleId || !content?.trim()) {
      return res.status(400).json({ error: 'articleId and content are required.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less.' });
    }

    const comment = await Comment.create({
      userId: req.userId,
      articleId,
      content: content.trim(),
      sentiment: sentiment || null,
    });

    // Populate user info for response
    await comment.populate('userId', 'name avatar');

    const commentObj = comment.toObject();
    commentObj.user = commentObj.userId;
    commentObj.userId = commentObj.user._id;

    // Emit via Socket.IO for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('comment:new', { articleId, comment: commentObj });
    }

    res.status(201).json({ comment: commentObj });
  } catch (err) {
    console.error('[Collab] addComment error:', err.message);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
};

// @desc    Get comments for an article
// @route   GET /api/v1/collab/comments/:articleId
// @access  Public (optional auth for like state)
exports.getComments = async (req, res) => {
  try {
    const { articleId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({ articleId })
        .populate('userId', 'name avatar')
        .populate('replies.userId', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments({ articleId }),
    ]);

    // Normalize user field
    const normalized = comments.map(c => {
      c.user = c.userId;
      c.userId = c.user?._id;
      c.replies = (c.replies || []).map(r => {
        r.user = r.userId;
        r.userId = r.user?._id;
        return r;
      });
      return c;
    });

    res.json({
      comments: normalized,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Collab] getComments error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
};

// @desc    Like/unlike a comment
// @route   POST /api/v1/collab/comments/:id/like
// @access  Private
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const uid = req.userId;
    const idx = comment.likes.findIndex(id => id.toString() === uid);

    if (idx > -1) {
      comment.likes.splice(idx, 1); // unlike
    } else {
      comment.likes.push(uid); // like
    }

    await comment.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('comment:like', {
        articleId: comment.articleId,
        commentId: comment._id,
        likes: comment.likes.length,
      });
    }

    res.json({ likes: comment.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error('[Collab] likeComment error:', err.message);
    res.status(500).json({ error: 'Failed to like comment.' });
  }
};

// @desc    Reply to a comment
// @route   POST /api/v1/collab/comments/:id/reply
// @access  Private
exports.replyToComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Reply content is required.' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Reply must be 1000 characters or less.' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const reply = { userId: req.userId, content: content.trim() };
    comment.replies.push(reply);
    await comment.save();

    // Get the newly added reply with populated user
    const updated = await Comment.findById(req.params.id)
      .populate('userId', 'name avatar')
      .populate('replies.userId', 'name avatar')
      .lean();

    const newReply = updated.replies[updated.replies.length - 1];
    newReply.user = newReply.userId;
    newReply.userId = newReply.user?._id;

    const io = req.app.get('io');
    if (io) {
      io.emit('comment:reply', {
        articleId: comment.articleId,
        commentId: comment._id,
        reply: newReply,
      });
    }

    res.status(201).json({ reply: newReply });
  } catch (err) {
    console.error('[Collab] replyToComment error:', err.message);
    res.status(500).json({ error: 'Failed to reply.' });
  }
};

// ── Sharing ─────────────────────────────────────────────────────

// @desc    Track a share action
// @route   POST /api/v1/collab/share
// @access  Private
exports.trackShare = async (req, res) => {
  try {
    const { articleId, platform } = req.body;

    if (!articleId || !platform) {
      return res.status(400).json({ error: 'articleId and platform are required.' });
    }

    const validPlatforms = ['whatsapp', 'twitter', 'linkedin', 'email', 'copy_link'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
    }

    const share = await Share.create({
      userId: req.userId,
      articleId,
      platform,
    });

    // Increment share count on article (store as a virtual counter via a simple field)
    await Article.findByIdAndUpdate(articleId, { $inc: { shareCount: 1 } }).catch(() => {});

    res.status(201).json({ share });
  } catch (err) {
    console.error('[Collab] trackShare error:', err.message);
    res.status(500).json({ error: 'Failed to track share.' });
  }
};

// @desc    Get shared articles feed
// @route   GET /api/v1/collab/shared
// @access  Public
exports.getSharedArticles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { platform } = req.query;

    const match = {};
    if (platform && platform !== 'all') {
      match.platform = platform;
    }

    const pipeline = [
      { $match: match },
      { $sort: { sharedAt: -1 } },
      {
        $group: {
          _id: '$articleId',
          lastSharedAt: { $first: '$sharedAt' },
          shareCount: { $sum: 1 },
          platforms: { $addToSet: '$platform' },
          lastPlatform: { $first: '$platform' },
        },
      },
      { $sort: { lastSharedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'articles',
          localField: '_id',
          foreignField: '_id',
          as: 'article',
        },
      },
      { $unwind: '$article' },
      {
        $project: {
          _id: 0,
          article: '$article',
          lastSharedAt: 1,
          shareCount: 1,
          platforms: 1,
          lastPlatform: 1,
        },
      },
    ];

    const [results, countResult] = await Promise.all([
      Share.aggregate(pipeline),
      Share.aggregate([
        { $match: match },
        { $group: { _id: '$articleId' } },
        { $count: 'total' },
      ]),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      shared: results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Collab] getSharedArticles error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shared articles.' });
  }
};
