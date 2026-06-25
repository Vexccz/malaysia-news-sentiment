const CommunityComment = require('../models/CommunityComment');

// EXISTING CONTROLLER FUNCTIONS

// @desc    Toggle like on a comment
// @route   POST /collab/comment/:id/like
const likeComment = async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const userId = req.user.id;
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      // Unlike
      comment.likes.splice(likeIndex, 1);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      // Like
      comment.likes.push(userId);
      comment.likeCount += 1;
    }

    await comment.save();
    res.status(200).json({
      message: likeIndex > -1 ? 'Comment unliked' : 'Comment liked',
      likeCount: comment.likeCount,
      liked: likeIndex === -1
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Report a comment
// @route   POST /collab/comment/:id/report
const reportComment = async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.reported = true;
    comment.reportedBy = req.user.id;
    await comment.save();

    res.status(200).json({ message: 'Comment reported successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get shared articles
// @route   GET /collab/shared
const getSharedArticles = async (req, res) => {
  try {
    const sharedArticles = await CommunityComment.find({ article: { $exists: true, $ne: null } })
      .populate('article')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(sharedArticles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get discussions list
// @route   GET /collab/discussions
const getDiscussions = async (req, res) => {
  try {
    const discussions = await CommunityComment.aggregate([
      { $match: { discussionId: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$discussionId',
        commentCount: { $sum: 1 },
        lastActivity: { $max: '$createdAt' },
        sentiment: { $first: '$sentiment' }
      }},
      { $sort: { lastActivity: -1 } },
      { $limit: 20 }
    ]);

    res.status(200).json(discussions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get comments for a discussion with threading support
// @route   GET /collab/discussions/:id/comments (EXISTING)
const getDiscussionComments = async (req, res) => {
  try {
    const comments = await CommunityComment.find({ discussionId: req.params.id })
      .sort({ createdAt: -1 });

    // Group by parentComment for threading
    const topLevel = comments.filter(c => !c.parentComment);
    const replies = comments.filter(c => c.parentComment);

    const threaded = topLevel.map(comment => ({
      ...comment.toObject(),
      replies: replies.filter(r => r.parentComment.toString() === comment._id.toString())
    }));

    res.status(200).json(threaded);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get discussion of the day
// @route   GET /collab/discussion-of-day
const getDiscussionOfDay = async (req, res) => {
  try {
    // Get the most active discussion today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const discussion = await CommunityComment.aggregate([
      { $match: { createdAt: { $gte: today }, discussionId: { $exists: true } } },
      { $group: {
        _id: '$discussionId',
        commentCount: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }},
      { $sort: { commentCount: -1 } },
      { $limit: 1 }
    ]);

    res.status(200).json(discussion[0] || { message: 'No active discussions today' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Post a comment to a discussion
// @route   POST /collab/discussions/:id/comment
const postComment = async (req, res) => {
  try {
    const { content, sentiment, isAnonymous } = req.body;

    const comment = await CommunityComment.create({
      content,
      author: req.user.id,
      authorName: req.user.name || 'Anonymous',
      authorRole: req.user.role || 'reader',
      isAnonymous: isAnonymous || false,
      sentiment,
      discussionId: req.params.id
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Share an article
// @route   POST /collab/share
const shareArticle = async (req, res) => {
  try {
    const { articleId, content } = req.body;

    const share = await CommunityComment.create({
      content: content || 'Shared an article',
      author: req.user.id,
      authorName: req.user.name || 'Anonymous',
      authorRole: req.user.role || 'reader',
      article: articleId
    });

    res.status(201).json(share);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get trending keywords
// @route   GET /collab/trending-keywords
const getTrendingKeywords = async (req, res) => {
  try {
    // Aggregate most mentioned words from recent comments
    const recentComments = await CommunityComment.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select('content');

    const wordCount = {};
    recentComments.forEach(comment => {
      const words = comment.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          wordCount[word] = (wordCount[word] || 0) + 1;
        }
      });
    });

    const keywords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    res.status(200).json(keywords);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get sentiment pulse data
// @route   GET /collab/sentiment-pulse
const getSentimentPulse = async (req, res) => {
  try {
    const sentimentData = await CommunityComment.aggregate([
      { $match: { sentiment: { $exists: true, $ne: null } } },
      { $group: {
        _id: '$sentiment',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.status(200).json(sentimentData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get top contributors leaderboard
// @route   GET /collab/leaderboard
const getTopContributors = async (req, res) => {
  try {
    const contributors = await CommunityComment.aggregate([
      { $group: {
        _id: '$author',
        authorName: { $first: '$authorName' },
        commentCount: { $sum: 1 },
        totalLikes: { $sum: '$likeCount' }
      }},
      { $sort: { commentCount: -1 } },
      { $limit: 20 }
    ]);

    res.status(200).json(contributors);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get community polls
// @route   GET /collab/polls
const getCommunityPolls = async (req, res) => {
  try {
    // Polls stored as comments with special structure
    const polls = await CommunityComment.find({ isPoll: true })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json(polls);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Vote on a poll
// @route   POST /collab/polls/:id/vote
const votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await CommunityComment.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (!poll.votes) poll.votes = [];
    poll.votes.push({ user: req.user.id, option: optionIndex });
    await poll.save();

    res.status(200).json({ message: 'Vote recorded', poll });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a poll
// @route   POST /collab/polls
const createPoll = async (req, res) => {
  try {
    const { question, options, discussionId } = req.body;

    const poll = await CommunityComment.create({
      content: question,
      author: req.user.id,
      authorName: req.user.name || 'Anonymous',
      isPoll: true,
      pollOptions: options,
      discussionId
    });

    res.status(201).json(poll);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get reaction summary for a comment
// @route   GET /collab/comment/:id/reactions
const getReactionSummary = async (req, res) => {
  try {
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.status(200).json({
      likeCount: comment.likeCount,
      likes: comment.likes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add reaction to a comment
// @route   POST /collab/comment/:id/react
const reactToComment = async (req, res) => {
  try {
    const { reactionType } = req.body;
    const comment = await CommunityComment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!comment.reactions) comment.reactions = {};
    if (!comment.reactions[reactionType]) comment.reactions[reactionType] = [];
    
    const userIndex = comment.reactions[reactionType].indexOf(req.user.id);
    if (userIndex > -1) {
      comment.reactions[reactionType].splice(userIndex, 1);
    } else {
      comment.reactions[reactionType].push(req.user.id);
    }

    await comment.save();
    res.status(200).json({ message: 'Reaction updated', reactions: comment.reactions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// NEW CONTROLLER FUNCTIONS

// @desc    Get threaded comments for a discussion
// @route   GET /collab/discussions/:discussionId/comments
const getThreadedComments = async (req, res) => {
  try {
    const { discussionId } = req.params;

    // Fetch top-level comments (no parent)
    const topLevelComments = await CommunityComment.find({
      discussionId,
      parentComment: null
    }).sort({ createdAt: -1 });

    // Fetch replies for each top-level comment
    const threadedComments = await Promise.all(
      topLevelComments.map(async (comment) => {
        const replies = await CommunityComment.find({
          parentComment: comment._id
        }).sort({ createdAt: -1 });

        return {
          ...comment.toObject(),
          replies: replies
        };
      })
    );

    res.status(200).json(threadedComments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Post a reply to a comment
// @route   POST /collab/discussions/:discussionId/:commentId/reply
const postReply = async (req, res) => {
  try {
    const { discussionId, commentId } = req.params;
    const { content, sentiment, isAnonymous } = req.body;

    // Verify parent comment exists
    const parentComment = await CommunityComment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: 'Parent comment not found' });
    }

    const reply = await CommunityComment.create({
      content,
      author: req.user.id,
      authorName: req.user.name || 'Anonymous',
      authorRole: req.user.role || 'reader',
      isAnonymous: isAnonymous || false,
      sentiment,
      discussionId,
      parentComment: commentId
    });

    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user badges
// @route   GET /collab/badges/:userId
const getUserBadges = async (req, res) => {
  try {
    const { userId } = req.params;

    // Compute badge metrics
    const totalComments = await CommunityComment.countDocuments({ author: userId });

    // Count distinct discussions where user was first commenter
    const firstComments = await CommunityComment.aggregate([
      { $sort: { createdAt: 1 } },
      { $group: {
        _id: '$discussionId',
        firstCommenter: { $first: '$author' }
      }},
      { $match: { firstCommenter: require('mongoose').Types.ObjectId(userId) } },
      { $count: 'count' }
    ]);
    const firstCommentCount = firstComments[0]?.count || 0;

    // Sum of likeCount across all user's comments
    const likesResult = await CommunityComment.aggregate([
      { $match: { author: require('mongoose').Types.ObjectId(userId) } },
      { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } }
    ]);
    const totalLikes = likesResult[0]?.totalLikes || 0;

    // High accuracy comments (comments with sentiment field populated)
    const highAccuracyComments = await CommunityComment.countDocuments({
      author: userId,
      sentiment: { $exists: true, $ne: null }
    });

    // Anonymous comments
    const anonymousComments = await CommunityComment.countDocuments({
      author: userId,
      isAnonymous: true
    });

    // Define badges
    const badges = [
      {
        id: 'commentator',
        icon: '💬',
        name: 'Commentator',
        description: 'Posted 5 or more comments',
        earned: totalComments >= 5
      },
      {
        id: 'active_voice',
        icon: '⭐',
        name: 'Active Voice',
        description: 'Posted 20 or more comments',
        earned: totalComments >= 20
      },
      {
        id: 'top_contributor',
        icon: '🏆',
        name: 'Top Contributor',
        description: 'Posted 50 or more comments',
        earned: totalComments >= 50
      },
      {
        id: 'trendsetter',
        icon: '🚀',
        name: 'Trendsetter',
        description: 'First to comment in 10 or more discussions',
        earned: firstCommentCount >= 10
      },
      {
        id: 'beloved',
        icon: '❤️',
        name: 'Beloved',
        description: 'Received 100 or more likes',
        earned: totalLikes >= 100
      },
      {
        id: 'sentiment_expert',
        icon: '🎯',
        name: 'Sentiment Expert',
        description: 'Provided sentiment on 20 or more comments',
        earned: highAccuracyComments >= 20
      },
      {
        id: 'ghost_writer',
        icon: '👤',
        name: 'Ghost Writer',
        description: 'Posted 20 or more anonymous comments',
        earned: anonymousComments >= 20
      }
    ];

    res.status(200).json(badges);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user profile
// @route   GET /collab/profile/:userId
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's comments
    const comments = await CommunityComment.find({ author: userId });
    const commentCount = comments.length;

    // Calculate total likes
    const totalLikes = comments.reduce((sum, comment) => sum + comment.likeCount, 0);

    // Get top badges (earned badges)
    const badgesResponse = await new Promise((resolve) => {
      // Reuse getUserBadges logic
      const mockReq = { params: { userId } };
      const mockRes = {
        status: () => ({ json: resolve })
      };
      getUserBadges(mockReq, mockRes);
    });

    const topBadges = badgesResponse.filter(badge => badge.earned);

    // Get author info from most recent comment
    const latestComment = await CommunityComment.findOne({ author: userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      name: latestComment?.authorName || 'Unknown User',
      role: latestComment?.authorRole || 'reader',
      joinDate: latestComment?.createdAt || null,
      commentCount,
      totalLikes,
      topBadges
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  // Existing functions
  likeComment,
  reportComment,
  getSharedArticles,
  getDiscussions,
  getDiscussionComments,
  getDiscussionOfDay,
  postComment,
  shareArticle,
  getTrendingKeywords,
  getSentimentPulse,
  getTopContributors,
  getCommunityPolls,
  votePoll,
  createPoll,
  getReactionSummary,
  reactToComment,
  // New functions
  getThreadedComments,
  postReply,
  getUserBadges,
  getUserProfile
};
