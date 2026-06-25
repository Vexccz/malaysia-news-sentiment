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

// Public
router.post('/register',            register);
router.post('/login',               login);
router.post('/google',              googleLogin);
router.post('/google-firebase',     googleFirebaseLogin);
router.get('/verify-email/:token',  verifyEmail);
router.post('/forgot-password',     forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/resend-verification', resendVerification);

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

    // Get comment count
    const commentCount = await Comment.countDocuments({ userId, isAnonymous: false });

    // Get recent comments (last 5, non-anonymous)
    const recentComments = await Comment.find({ userId, isAnonymous: false })
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
router.patch('/preferences',        protect, updatePreferences);
router.patch('/profile',            protect, updateProfile);

// 2FA
router.post('/2fa/setup',           protect, setup2FA);
router.post('/2fa/verify',          protect, verify2FA);
router.post('/2fa/disable',         protect, disable2FA);

module.exports = router;

