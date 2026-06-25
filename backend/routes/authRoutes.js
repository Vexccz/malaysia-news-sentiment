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

// Protected
router.get('/me',                   protect, getMe);
router.patch('/preferences',        protect, updatePreferences);
router.patch('/profile',            protect, updateProfile);

// 2FA
router.post('/2fa/setup',           protect, setup2FA);
router.post('/2fa/verify',          protect, verify2FA);
router.post('/2fa/disable',         protect, disable2FA);

module.exports = router;

