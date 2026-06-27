const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register, login, googleLogin, googleFirebaseLogin, verifyEmail,
  forgotPassword, resetPassword, getMe,
  updatePreferences, updateProfile, resendVerification,
  setup2FA, verify2FA, disable2FA,
} = require('../controllers/authController');
const { signGuestToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authSchemas, profileSchemas } = require('../middleware/schemas');

// Public
router.post('/register',            validate(authSchemas.register), register);
router.post('/login',               validate(authSchemas.login), login);
router.post('/google',              googleLogin);
router.post('/google-firebase',     googleFirebaseLogin);
router.get('/verify-email/:token',  verifyEmail);
router.post('/forgot-password',     validate(authSchemas.forgotPassword), forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/resend-verification', validate(authSchemas.resendVerification), resendVerification);

// Guest mode - limited access without registration
router.post('/guest', (req, res) => {
  const token = signGuestToken();
  res.json({
    token,
    user: {
      _id: 'guest',
      name: 'Guest User',
      email: 'guest@mynews.my',
      role: 'guest',
      isGuest: true,
      preferences: { theme: 'dark', language: 'en' },
      bookmarks: [],
    },
  });
});

// Dev-only: force-verify an account (uses live DB connection)
if (process.env.NODE_ENV !== 'production') {
  const User = require('../models/User');
  router.post('/dev/force-verify', async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOneAndUpdate(
        { email },
        { isVerified: true, verificationToken: undefined, verificationExpires: undefined },
        { new: true }
      );
      if (!user) return res.status(404).json({ error: 'User not found.' });
      res.json({ message: `✅ ${email} is now verified.` });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// Public user profile (for community features)
router.get('/profile/:userId', async (req, res) => {
  try {
    const User = require('../models/User');
    const Comment = require('../models/Comment');
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name avatar role createdAt analysisCount bookmarks')
      .lean();

    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Get comment count (isAnonymous can be null or false — both mean not anonymous)
    const commentCount = await Comment.countDocuments({ userId, isAnonymous: { $ne: true } });

    // Get recent comments (last 5, non-anonymous)
    const recentComments = await Comment.find({ userId, isAnonymous: { $ne: true } })
      .select('content articleId commentSentiment createdAt')
      .populate('articleId', 'title source')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        analysisCount: user.analysisCount || 0,
        bookmarksCount: Array.isArray(user.bookmarks) ? user.bookmarks.length : 0,
        commentCount,
        recentComments: recentComments.map(c => ({
          content: c.content,
          sentiment: c.commentSentiment,
          createdAt: c.createdAt,
          articleTitle: c.articleId?.title || 'Unknown',
          articleSource: c.articleId?.source || '',
        })),
      },
    });
  } catch (err) {
    console.error('[Auth] Public profile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Protected
router.get('/me',                   protect, getMe);
router.patch('/preferences',        protect, validate(profileSchemas.updatePreferences), updatePreferences);
router.patch('/profile',            protect, validate(profileSchemas.updateProfile), updateProfile);

// Badge selection
router.get('/badges', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const mongoose = require('mongoose');
    let CommunityComment;
    try {
      CommunityComment = require('../models/CommunityComment');
    } catch (e) {
      // If model doesn't exist, return all badges as not earned
      const user = await User.findById(req.user.id).select('selectedBadges').lean();
      return res.json({
        badges: [
          { id: 'commentator', icon: '💬', name: 'Commentator', description: 'Post 5 or more comments', earned: false, progress: 0, target: 5 },
          { id: 'active_voice', icon: '⭐', name: 'Active Voice', description: 'Post 20 or more comments', earned: false, progress: 0, target: 20 },
          { id: 'top_contributor', icon: '🏆', name: 'Top Contributor', description: 'Post 50 or more comments', earned: false, progress: 0, target: 50 },
          { id: 'trendsetter', icon: '🚀', name: 'Trendsetter', description: 'Be first to comment in 10 discussions', earned: false, progress: 0, target: 10 },
          { id: 'beloved', icon: '❤️', name: 'Beloved', description: 'Receive 100 likes on comments', earned: false, progress: 0, target: 100 },
          { id: 'sentiment_expert', icon: '🎯', name: 'Sentiment Expert', description: 'Add sentiment to 20 comments', earned: false, progress: 0, target: 20 },
          { id: 'ghost_writer', icon: '👤', name: 'Ghost Writer', description: 'Post 20 anonymous comments', earned: false, progress: 0, target: 20 },
        ],
        selectedBadges: user?.selectedBadges || [],
      });
    }

    const user = await User.findById(req.user.id).select('selectedBadges').lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Compute metrics with fallbacks
    let totalComments = 0, firstCommentCount = 0, totalLikes = 0;
    let sentimentComments = 0, anonymousComments = 0;

    try { totalComments = await CommunityComment.countDocuments({ author: userId }); } catch (e) {}
    try {
      const firstComments = await CommunityComment.aggregate([
        { $sort: { createdAt: 1 } },
        { $group: { _id: '$discussionId', firstCommenter: { $first: '$author' } } },
        { $match: { firstCommenter: userId } },
        { $count: 'count' }
      ]);
      firstCommentCount = firstComments[0]?.count || 0;
    } catch (e) {}
    try {
      const likesResult = await CommunityComment.aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, totalLikes: { $sum: '$likeCount' } } }
      ]);
      totalLikes = likesResult[0]?.totalLikes || 0;
    } catch (e) {}
    try { sentimentComments = await CommunityComment.countDocuments({ author: userId, sentiment: { $exists: true, $ne: null } }); } catch (e) {}
    try { anonymousComments = await CommunityComment.countDocuments({ author: userId, isAnonymous: true }); } catch (e) {}

    const allBadges = [
      { id: 'commentator', icon: '💬', name: 'Commentator', description: 'Post 5 or more comments', earned: totalComments >= 5, progress: totalComments, target: 5 },
      { id: 'active_voice', icon: '⭐', name: 'Active Voice', description: 'Post 20 or more comments', earned: totalComments >= 20, progress: totalComments, target: 20 },
      { id: 'top_contributor', icon: '🏆', name: 'Top Contributor', description: 'Post 50 or more comments', earned: totalComments >= 50, progress: totalComments, target: 50 },
      { id: 'trendsetter', icon: '🚀', name: 'Trendsetter', description: 'Be first to comment in 10 discussions', earned: firstCommentCount >= 10, progress: firstCommentCount, target: 10 },
      { id: 'beloved', icon: '❤️', name: 'Beloved', description: 'Receive 100 likes on comments', earned: totalLikes >= 100, progress: totalLikes, target: 100 },
      { id: 'sentiment_expert', icon: '🎯', name: 'Sentiment Expert', description: 'Add sentiment to 20 comments', earned: sentimentComments >= 20, progress: sentimentComments, target: 20 },
      { id: 'ghost_writer', icon: '👤', name: 'Ghost Writer', description: 'Post 20 anonymous comments', earned: anonymousComments >= 20, progress: anonymousComments, target: 20 },
    ];

    res.json({ badges: allBadges, selectedBadges: user.selectedBadges || [] });
  } catch (err) {
    console.error('[Auth] Get badges error:', err.message);
    res.status(500).json({ error: 'Failed to fetch badges.' });
  }
});

router.put('/badges', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const { badgeIds } = req.body;
    if (!Array.isArray(badgeIds)) return res.status(400).json({ error: 'badgeIds must be an array' });
    // Limit to 3 selected badges
    const limited = badgeIds.slice(0, 3);
    await User.findByIdAndUpdate(req.user.id, { selectedBadges: limited });
    res.json({ selectedBadges: limited });
  } catch (err) {
    console.error('[Auth] Update badges error:', err.message);
    res.status(500).json({ error: 'Failed to update badges.' });
  }
});

// 2FA
router.post('/2fa/setup',           protect, setup2FA);
router.post('/2fa/verify',          protect, verify2FA);
router.post('/2fa/disable',         protect, disable2FA);

module.exports = router;

