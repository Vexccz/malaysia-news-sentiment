const Comment = require('../models/Comment');
const Share = require('../models/Share');
const Article = require('../models/Article');
const DiscussionOfDay = require('../models/DiscussionOfDay');

// ── Simple sentiment classifier for comments ─────────────────
const classifyCommentSentiment = (text) => {
  const lower = text.toLowerCase();
  const posWords = ['good', 'great', 'excellent', 'agree', 'accurate', 'correct', 'true', 'well done', 'nice', 'love', 'best', 'awesome', 'fantastic', 'brilliant', 'right', 'support', 'positive', 'helpful', 'informative', 'insightful'];
  const negWords = ['bad', 'wrong', 'disagree', 'false', 'fake', 'terrible', 'awful', 'worst', 'hate', 'stupid', 'biased', 'propaganda', 'nonsense', 'rubbish', 'garbage', 'lie', 'misleading', 'negative', 'poor', 'disappoint'];
  
  let posScore = 0;
  let negScore = 0;
  posWords.forEach(w => { if (lower.includes(w)) posScore++; });
  negWords.forEach(w => { if (lower.includes(w)) negScore++; });
  
  if (posScore > negScore) return 'Positive';
  if (negScore > posScore) return 'Negative';
  return 'Neutral';
};

// ── Compute user badges ─────────────────────────────────────
const computeBadges = async (userId) => {
  const badges = [];
  
  try {
    // Total comments
    const totalComments = await Comment.countDocuments({ userId });
    
    if (totalComments >= 50) badges.push({ icon: '🏆', label: 'Top Contributor', tier: 'gold' });
    else if (totalComments >= 20) badges.push({ icon: '⭐', label: 'Active Voice', tier: 'silver' });
    else if (totalComments >= 5) badges.push({ icon: '💬', label: 'Commentator', tier: 'bronze' });
    
    // First comment on articles
    const firstComments = await Comment.aggregate([
      { $sort: { createdAt: 1 } },
      { $group: { _id: '$articleId', firstUserId: { $first: '$userId' } } },
      { $match: { firstUserId: userId } },
      { $count: 'total' },
    ]);
    const firstCount = firstComments[0]?.total || 0;
    if (firstCount >= 10) badges.push({ icon: '🚀', label: 'Trendsetter', tier: 'gold' });
    else if (firstCount >= 3) badges.push({ icon: '🎯', label: 'First Mover', tier: 'silver' });
    
    // Total likes received
    const userComments = await Comment.find({ userId }).select('likes').lean();
    const totalLikes = userComments.reduce((sum, c) => sum + (c.likes?.length || 0), 0);
    if (totalLikes >= 100) badges.push({ icon: '❤️', label: 'Beloved', tier: 'gold' });
    else if (totalLikes >= 20) badges.push({ icon: '👍', label: 'Appreciated', tier: 'silver' });
    
    // Sentiment accuracy (if user voted sentiment that matches AI)
    const sentimentMatches = await Comment.countDocuments({ 
      userId, 
      sentiment: { $ne: null },
      $expr: { $eq: ['$sentiment', '$commentSentiment'] } 
    });
    if (sentimentMatches >= 20) badges.push({ icon: '🎯', label: 'Sentiment Expert', tier: 'gold' });
    else if (sentimentMatches >= 5) badges.push({ icon: '🔍', label: 'Sharp Eye', tier: 'silver' });
    
    // Anonymous streak
    const anonCount = await Comment.countDocuments({ userId, isAnonymous: true });
    if (anonCount >= 20) badges.push({ icon: '👤', label: 'Ghost Writer', tier: 'silver' });
    
  } catch (err) {
    console.error('[Badges] Error computing badges:', err.message);
  }
  
  return badges;
};

// ── Comments ────────────────────────────────────────────────────

// @desc    Add a comment to an article
// @route   POST /api/v1/collab/comments
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { articleId, content, sentiment, isAnonymous } = req.body;

    if (!articleId || !content?.trim()) {
      return res.status(400).json({ error: 'articleId and content are required.' });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: 'Comment must be 2000 characters or less.' });
    }

    // Auto-classify comment sentiment
    const commentSentiment = classifyCommentSentiment(content);

    const comment = await Comment.create({
      userId: req.userId,
      articleId,
      content: content.trim(),
      sentiment: sentiment || null,
      commentSentiment,
      isAnonymous: isAnonymous === true,
    });

    // Populate user info for response
    await comment.populate('userId', 'name avatar');

    const commentObj = comment.toObject();
    commentObj.user = comment.userId;
    commentObj.userId = commentObj.user._id;
    
    // Compute badges for the commenter
    commentObj.badges = await computeBadges(req.userId);

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

    // Normalize user field + compute badges
    const userIds = [...new Set(comments.map(c => c.userId?._id?.toString()).filter(Boolean))];
    const badgeMap = {};
    for (const uid of userIds) {
      badgeMap[uid] = await computeBadges(uid);
    }

    const normalized = comments.map(c => {
      c.user = c.userId;
      c.userId = c.user?._id;
      c.badges = badgeMap[c.user?._id?.toString()] || [];
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
    const { content, isAnonymous } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Reply content is required.' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Reply must be 1000 characters or less.' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const reply = { userId: req.userId, content: content.trim(), isAnonymous: isAnonymous === true };
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

// ── Hot Takes ────────────────────────────────────────────────────

// @desc    Get most discussed articles this week
// @route   GET /api/v1/collab/hot-takes
// @access  Public
exports.getHotTakes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$articleId',
          commentCount: { $sum: 1 },
          lastCommentAt: { $max: '$createdAt' },
          uniqueUsers: { $addToSet: '$userId' },
          sentimentVotes: {
            $push: {
              $cond: [{ $ne: ['$sentiment', null] }, '$sentiment', '$$REMOVE']
            }
          },
        },
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          controversy: {
            $let: {
              vars: {
                pos: { $size: { $filter: { input: '$sentimentVotes', cond: { $eq: ['$$this', 'Positive'] } } } },
                neg: { $size: { $filter: { input: '$sentimentVotes', cond: { $eq: ['$$this', 'Negative'] } } } },
                total: { $size: '$sentimentVotes' },
              },
              in: {
                $cond: [
                  { $gt: ['$$total', 0] },
                  { $divide: [{ $min: ['$$pos', '$$neg'] }, { $max: [{ $divide: ['$$total', 2] }, 1] }] },
                  0,
                ],
              },
            },
          },
        },
      },
      { $sort: { commentCount: -1, controversy: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'articles',
          localField: '_id',
          foreignField: '_id',
          as: 'article',
        },
      },
      { $unwind: { path: '$article', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          articleId: '$_id',
          articleTitle: '$article.title',
          articleSource: '$article.source',
          articleSentiment: '$article.sentiment',
          commentCount: 1,
          uniqueUserCount: 1,
          lastCommentAt: 1,
          controversy: { $round: [{ $multiply: ['$controversy', 100] }, 0] },
        },
      },
    ];

    const results = await Comment.aggregate(pipeline);
    res.json({ hotTakes: results });
  } catch (err) {
    console.error('[Collab] getHotTakes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hot takes.' });
  }
};

// ── Discussion of the Day ────────────────────────────────────────

// @desc    Set discussion of the day (admin)
// @route   POST /api/v1/collab/discussion-of-day
// @access  Private (Admin)
exports.setDiscussionOfDay = async (req, res) => {
  try {
    const { articleId, reason } = req.body;
    if (!articleId) return res.status(400).json({ error: 'articleId is required.' });

    // Deactivate previous
    await DiscussionOfDay.updateMany({ active: true }, { active: false });

    const dotd = await DiscussionOfDay.create({
      articleId,
      setBy: req.userId,
      reason: reason || '',
      active: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    await dotd.populate('articleId', 'title source sentiment url');

    const io = req.app.get('io');
    if (io) io.emit('discussion-of-day', { articleId, reason });

    res.status(201).json({ discussion: dotd });
  } catch (err) {
    console.error('[Collab] setDiscussionOfDay error:', err.message);
    res.status(500).json({ error: 'Failed to set discussion of the day.' });
  }
};

// @desc    Get active discussion of the day
// @route   GET /api/v1/collab/discussion-of-day
// @access  Public
exports.getDiscussionOfDay = async (req, res) => {
  try {
    const dotd = await DiscussionOfDay.findOne({ active: true })
      .populate('articleId', 'title source sentiment url description')
      .sort({ createdAt: -1 })
      .lean();

    if (!dotd) return res.json({ discussion: null });

    // Get comment count
    const commentCount = await Comment.countDocuments({ articleId: dotd.articleId._id });

    res.json({
      discussion: {
        ...dotd,
        commentCount,
      },
    });
  } catch (err) {
    console.error('[Collab] getDiscussionOfDay error:', err.message);
    res.status(500).json({ error: 'Failed to fetch discussion of the day.' });
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

// @desc    Get recent discussions across all articles
// @route   GET /api/v1/collab/discussions
// @access  Public
exports.getRecentDiscussions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$articleId',
          lastCommentAt: { $first: '$createdAt' },
          commentCount: { $sum: 1 },
          lastComment: { $first: '$content' },
          lastUser: { $first: '$userId' },
          lastSentiment: { $first: '$sentiment' },
          lastIsAnonymous: { $first: '$isAnonymous' },
        },
      },
      { $sort: { lastCommentAt: -1 } },
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
      { $unwind: { path: '$article', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'lastUser',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          articleId: '$_id',
          articleTitle: '$article.title',
          articleSource: '$article.source',
          articleSentiment: '$article.sentiment',
          lastCommentAt: 1,
          commentCount: 1,
          lastComment: 1,
          lastSentiment: 1,
          lastIsAnonymous: 1,
          userName: {
            $cond: [
              { $eq: ['$lastIsAnonymous', true] },
              'Anonymous',
              { $ifNull: ['$user.name', 'Anonymous'] },
            ],
          },
        },
      },
    ];

    const [results, countResult] = await Promise.all([
      Comment.aggregate(pipeline),
      Comment.aggregate([
        { $group: { _id: '$articleId' } },
        { $count: 'total' },
      ]),
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      discussions: results,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[Collab] getRecentDiscussions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch discussions.' });
  }
};

// ── Trending Keywords from Comments ──────────────────────────────

// @desc    Toggle emoji reaction on a comment
// @route   POST /api/v1/collab/comments/:id/react
// @access  Private
exports.toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const allowedEmojis = ['😂', '😢', '😡', '🔥', '👏', '❤️', '🤔', '💯'];
    if (!emoji || !allowedEmojis.includes(emoji)) {
      return res.status(400).json({ error: 'Invalid emoji.' });
    }

    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found.' });

    const uid = req.userId;
    // Check if user already reacted with this emoji
    const existingIdx = comment.reactions.findIndex(
      r => r.emoji === emoji && r.userId.toString() === uid
    );

    if (existingIdx > -1) {
      comment.reactions.splice(existingIdx, 1); // remove reaction
    } else {
      comment.reactions.push({ emoji, userId: uid }); // add reaction
    }

    await comment.save();

    // Group reactions by emoji for response
    const grouped = {};
    comment.reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false };
      grouped[r.emoji].count++;
      if (r.userId.toString() === uid) grouped[r.emoji].userReacted = true;
    });

    res.json({ reactions: Object.values(grouped) });
  } catch (err) {
    console.error('[Collab] toggleReaction error:', err.message);
    res.status(500).json({ error: 'Failed to toggle reaction.' });
  }
};

// @desc    Get trending keywords from recent comments
// @route   GET /api/v1/collab/trending-keywords
// @access  Public
exports.getTrendingKeywords = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 15;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get recent non-anonymous comments
    const comments = await Comment.find({
      createdAt: { $gte: since },
      isAnonymous: { $ne: true },
    })
      .select('content')
      .lean()
      .limit(500);

    // Extract keywords (simple word frequency)
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
      'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'don', 'now', 'and', 'but', 'or', 'if', 'while', 'that', 'this',
      'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
      'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
      'what', 'which', 'who', 'whom', 'about', 'up', 'down', 'also', 'like',
      'just', 'get', 'got', 'make', 'made', 'take', 'know', 'think', 'see',
      'come', 'go', 'say', 'said', 'one', 'two', 'new', 'good', 'first',
      'last', 'long', 'great', 'little', 'own', 'old', 'right', 'big', 'high',
      'different', 'small', 'large', 'next', 'early', 'young', 'important',
      'because', 'still', 'much', 'well', 'back', 'even', 'any', 'give',
      'day', 'year', 'way', 'thing', 'man', 'woman', 'world', 'life', 'hand',
      'part', 'place', 'case', 'week', 'company', 'system', 'program', 'work',
      'use', 'problem', 'fact',
    ]);

    const wordCount = {};
    comments.forEach(c => {
      const words = (c.content || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
      words.forEach(w => {
        wordCount[w] = (wordCount[w] || 0) + 1;
      });
    });

    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));

    res.json({ keywords, totalComments: comments.length });
  } catch (err) {
    console.error('[Collab] getTrendingKeywords error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending keywords.' });
  }
};

// ── Sentiment Pulse ──────────────────────────────────────────────

// @desc    Get sentiment distribution from recent comments
// @route   GET /api/v1/collab/sentiment-pulse
// @access  Public
exports.getSentimentPulse = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { createdAt: { $gte: since }, commentSentiment: { $ne: null } } },
      {
        $group: {
          _id: '$commentSentiment',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ];

    const dailyPipeline = [
      { $match: { createdAt: { $gte: since }, commentSentiment: { $ne: null } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            sentiment: '$commentSentiment',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];

    const [distribution, daily] = await Promise.all([
      Comment.aggregate(pipeline),
      Comment.aggregate(dailyPipeline),
    ]);

    const total = distribution.reduce((sum, d) => sum + d.count, 0);
    const sentiments = distribution.map(d => ({
      sentiment: d._id,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 100) : 0,
    }));

    // Format daily data
    const dailyFormatted = {};
    daily.forEach(d => {
      if (!dailyFormatted[d._id.date]) dailyFormatted[d._id.date] = {};
      dailyFormatted[d._id.date][d._id.sentiment] = d.count;
    });

    const dailyArray = Object.entries(dailyFormatted)
      .map(([date, sents]) => ({ date, ...sents }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ sentiments, daily: dailyArray, total });
  } catch (err) {
    console.error('[Collab] getSentimentPulse error:', err.message);
    res.status(500).json({ error: 'Failed to fetch sentiment pulse.' });
  }
};

// ── User Leaderboard ─────────────────────────────────────────────

// @desc    Get top commenters this week
// @route   GET /api/v1/collab/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 10;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      { $match: { createdAt: { $gte: since }, isAnonymous: { $ne: true } } },
      {
        $group: {
          _id: '$userId',
          commentCount: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } },
          lastCommentAt: { $max: '$createdAt' },
        },
      },
      { $sort: { commentCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          avatar: '$user.avatar',
          role: '$user.role',
          commentCount: 1,
          totalLikes: 1,
          lastCommentAt: 1,
        },
      },
    ];

    const leaderboard = await Comment.aggregate(pipeline);

    res.json({ leaderboard, days });
  } catch (err) {
    console.error('[Collab] getLeaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
};

// ── Community Posts (Share Your Take) ────────────────────────────

const CommunityPost = require('../models/CommunityPost');
const classifyCommentSentiment2 = (text) => {
  const lower = text.toLowerCase();
  const posWords = ['good', 'great', 'excellent', 'agree', 'accurate', 'correct', 'true', 'well done', 'nice', 'love', 'best', 'awesome', 'fantastic', 'brilliant', 'right', 'support', 'positive', 'helpful', 'informative', 'insightful'];
  const negWords = ['bad', 'wrong', 'disagree', 'false', 'fake', 'terrible', 'awful', 'worst', 'hate', 'stupid', 'biased', 'propaganda', 'nonsense', 'rubbish', 'garbage', 'lie', 'misleading', 'negative', 'poor', 'disappoint'];
  let posScore = 0, negScore = 0;
  posWords.forEach(w => { if (lower.includes(w)) posScore++; });
  negWords.forEach(w => { if (lower.includes(w)) negScore++; });
  if (posScore > negScore) return 'Positive';
  if (negScore > posScore) return 'Negative';
  return 'Neutral';
};

// @desc    Create a standalone community post
// @route   POST /api/v1/collab/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content, isAnonymous, tags } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required.' });
    if (content.length > 2000) return res.status(400).json({ error: 'Max 2000 characters.' });

    const sentiment = classifyCommentSentiment2(content);
    const post = await CommunityPost.create({
      userId: req.userId,
      content: content.trim(),
      sentiment,
      isAnonymous: isAnonymous === true,
      tags: (tags || []).slice(0, 5).map(t => t.trim().toLowerCase()),
    });

    await post.populate('userId', 'name avatar');
    const obj = post.toObject();
    obj.user = obj.userId;
    obj.userId = obj.user?._id;

    res.status(201).json({ post: obj });
  } catch (err) {
    console.error('[Collab] createPost error:', err.message);
    res.status(500).json({ error: 'Failed to create post.' });
  }
};

// @desc    Get community posts (feed)
// @route   GET /api/v1/collab/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const tag = req.query.tag;

    const filter = {};
    if (tag) filter.tags = tag.toLowerCase();

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .populate('userId', 'name avatar')
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);

    // Normalize user field + compute badges
    const userIds = [...new Set(posts.map(p => p.userId?._id?.toString()).filter(Boolean))];
    const badgeMap = {};
    for (const uid of userIds) {
      badgeMap[uid] = await computeBadges(uid);
    }

    const normalized = posts.map(p => {
      p.user = p.userId;
      p.userId = p.user?._id;
      p.badges = badgeMap[p.user?._id?.toString()] || [];
      return p;
    });

    res.json({ posts: normalized, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Collab] getPosts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch posts.' });
  }
};

// @desc    Like/unlike a community post
// @route   POST /api/v1/collab/posts/:id/like
// @access  Private
exports.likePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const uid = req.userId;
    const idx = post.likes.findIndex(id => id.toString() === uid);
    if (idx > -1) post.likes.splice(idx, 1);
    else post.likes.push(uid);

    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error('[Collab] likePost error:', err.message);
    res.status(500).json({ error: 'Failed to like post.' });
  }
};

// @desc    React to a community post
// @route   POST /api/v1/collab/posts/:id/react
// @access  Private
exports.reactToPost = async (req, res) => {
  try {
    const { emoji } = req.body;
    const allowedEmojis = ['😂', '😢', '😡', '🔥', '👏', '❤️', '🤔', '💯'];
    if (!emoji || !allowedEmojis.includes(emoji)) return res.status(400).json({ error: 'Invalid emoji.' });

    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const uid = req.userId;
    const existingIdx = post.reactions.findIndex(r => r.emoji === emoji && r.userId.toString() === uid);
    if (existingIdx > -1) post.reactions.splice(existingIdx, 1);
    else post.reactions.push({ emoji, userId: uid });

    await post.save();

    const grouped = {};
    post.reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false };
      grouped[r.emoji].count++;
      if (r.userId.toString() === uid) grouped[r.emoji].userReacted = true;
    });

    res.json({ reactions: Object.values(grouped) });
  } catch (err) {
    console.error('[Collab] reactToPost error:', err.message);
    res.status(500).json({ error: 'Failed to react to post.' });
  }
};

// @desc    Reply to a community post
// @route   POST /api/v1/collab/posts/:id/reply
// @access  Private
exports.replyToPost = async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required.' });

    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const newReply = {
      userId: req.userId,
      content: content.trim(),
      isAnonymous: isAnonymous === true,
    };
    post.replies.push(newReply);
    await post.save();

    const addedReply = post.replies[post.replies.length - 1];
    await post.populate('replies.userId', 'name avatar');

    const replyObj = addedReply.toObject();
    replyObj.user = replyObj.userId;
    replyObj.userId = replyObj.user?._id;

    res.status(201).json({ reply: replyObj });
  } catch (err) {
    console.error('[Collab] replyToPost error:', err.message);
    res.status(500).json({ error: 'Failed to reply to post.' });
  }
};
