const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { sendVerificationEmail, sendResetEmail } = require('../services/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Firebase Admin (optional — graceful no-op if not configured) ──────────
let firebaseAdmin = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : null;
    if (serviceAccount) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      firebaseAdmin = admin;
    } else {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set — Firebase token verification disabled.');
    }
  } else {
    firebaseAdmin = admin;
  }
} catch (e) {
  console.warn('⚠️  firebase-admin not available:', e.message);
}

// ── REGISTER ──────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone number is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    // Check existing
    if (email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    if (phone) {
      const existing = await User.findOne({ phone });
      if (existing) return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    const user = new User({ name, email, phone, password, provider: 'local' });
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email if email provided
    if (email) {
      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailErr) {
        console.error('Email send failed (non-fatal):', emailErr.message);
      }
    }

    res.status(201).json({
      message: email
        ? `Registration successful! A verification link has been sent to ${email}.`
        : 'Registration successful! Please log in.',
      requiresVerification: !!email,
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ── LOGIN ────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email && !phone) return res.status(400).json({ error: 'Email or phone is required.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const query = email ? { email } : { phone };
    const user = await User.findOne(query).select('+password');

    if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    if (!user.isVerified && user.email) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', unverified: true });
    }

    const token = signToken(user._id, user.role);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        provider: user.provider,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error('Login error:', err); // Log full error for diagnosis
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ── GOOGLE LOGIN ─────────────────────────────────────────────
const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential missing.' });

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: 'Google login is not configured on this server.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({ name, email, googleId, avatar: picture, provider: 'google', isVerified: true });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.provider = 'google';
      user.isVerified = true;
      if (picture) user.avatar = picture;
      await user.save();
    }

    const token = signToken(user._id, user.role);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, provider: user.provider, preferences: user.preferences },
    });
  } catch (err) {
    console.error('Google login error:', err); // Log full error for diagnosis
    res.status(401).json({ error: 'Google authentication failed.' });
  }
};

// ── FIREBASE GOOGLE LOGIN ─────────────────────────────────────
// Server-side token verification via firebase-admin
const googleFirebaseLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Firebase ID token is required.' });
    }

    if (!firebaseAdmin) {
      return res.status(503).json({ error: 'Firebase authentication is not configured on this server.' });
    }

    // Verify the Firebase ID token — never trust req.body for identity claims
    let decodedToken;
    try {
      decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    } catch (verifyErr) {
      console.error('Firebase token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid or expired Firebase token.' });
    }

    // Security #8: Ignore req.body identity fields (name/email/picture).
    // All identity claims MUST come from the verified Firebase token, not the client.
    // Frontend should only send { token: idToken }.
    const { email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ error: 'Firebase token does not contain an email address.' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name || 'Google User',
        email,
        avatar: picture || '',
        provider: 'google',
        isVerified: true,
      });
    } else {
      user.provider = 'google';
      user.isVerified = true;
      if (picture && !user.avatar) user.avatar = picture;
      await user.save();
    }

    const localToken = signToken(user._id, user.role);
    res.json({
      token: localToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    console.error('Firebase bridge error:', err.message);
    res.status(500).json({ error: 'Failed to synchronize with backend.' });
  }
};

// ── VERIFY EMAIL ─────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Verification link is invalid or has expired.' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const token = signToken(user._id, user.role);
    res.json({ message: 'Email verified successfully! You are now logged in.', token, user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences } });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed.' });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email });
    // Always respond with success to prevent email enumeration
    if (!user || user.provider === 'google') {
      return res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
    }

    const resetToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendResetEmail(user, resetToken);
    } catch (emailErr) {
      user.resetToken = undefined;
      user.resetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }

    res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetToken: hashedToken,
      resetExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired.' });

    user.password = password;
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    const jwtToken = signToken(user._id, user.role);
    res.json({ message: 'Password reset successful!', token: jwtToken, user: { id: user._id, name: user.name, email: user.email, preferences: user.preferences } });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
};

// ── GET ME ────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // Guest user - return synthetic user object
    if (req.isGuest || req.userId === 'guest') {
      return res.json({ user: { id: 'guest', name: 'Guest User', email: 'guest@mynews.my', role: 'guest', isGuest: true, preferences: { theme: 'dark', language: 'en' }, bookmarks: [] } });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone,
        avatar: user.avatar, role: user.role, provider: user.provider,
        bio: user.bio,
        preferences: user.preferences, createdAt: user.createdAt,
        twoFactorEnabled: user.twoFactorEnabled || false,
        analysisCount: user.analysisCount || 0,
        bookmarksCount: Array.isArray(user.bookmarks) ? user.bookmarks.length : 0,
        recentlyViewedCount: Array.isArray(user.recentlyViewed) ? user.recentlyViewed.length : 0,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};

// ── UPDATE PREFERENCES ────────────────────────────────────────
const updatePreferences = async (req, res) => {
  try {
    // Security #5: Whitelist allowed preference keys before merging.
    // Prevents injection of arbitrary fields into the preferences subdocument.
    const ALLOWED_PREFS = ['theme', 'language', 'articlesPerPage', 'emailNotifications', 'alertNotifications', 'autoRefresh', 'defaultTopic'];
    const safeUpdates = {};
    ALLOWED_PREFS.forEach(key => {
      if (req.body[key] !== undefined) safeUpdates[`preferences.${key}`] = req.body[key];
    });

    if (Object.keys(safeUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid preference fields provided.' });
    }

    // $set with runValidators enforces Mongoose enum/type constraints
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: safeUpdates },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({ message: 'Preferences updated.', preferences: user.preferences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences.' });
  }
};

// ── UPDATE PROFILE ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, avatar, bio, phone } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone || undefined; // avoid empty string unique conflict

    await user.save();

    res.json({
      message: 'Profile updated.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// ── RESEND VERIFICATION ────────────────────────────────────────
const resendVerification = async (req, res) => {
  // Security #9: Always return the same generic message regardless of outcome
  // to prevent user-existence enumeration attacks.
  const GENERIC_MSG = { message: 'If this email is registered and unverified, a new link has been sent.' };
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.isVerified) {
      return res.json(GENERIC_MSG);
    }

    const token = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      await sendVerificationEmail(user, token);
    } catch (emailErr) {
      // Log the real error server-side but never expose it to the client
      console.error('Resend verification email failed (non-fatal):', emailErr.message);
    }

    res.json(GENERIC_MSG);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification.' });
  }
};

// ── TWO-FACTOR AUTH ──────────────────────────────────────────
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const secret = speakeasy.generateSecret({
      name: `MY News Sentiment (${user.email})`,
      issuer: 'MY News Sentiment',
      length: 20,
    });

    // Store temp secret (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save({ validateBeforeSave: false });

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qr: qrDataUrl,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: 'Failed to setup 2FA.' });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Invalid code format.' });

    const user = await User.findById(req.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: '2FA not set up. Call setup first.' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1, // allow 30s clock skew
    });

    if (!verified) return res.status(400).json({ error: 'Invalid verification code.' });

    user.twoFactorEnabled = true;
    await user.save({ validateBeforeSave: false });

    res.json({ message: '2FA enabled successfully!', twoFactorEnabled: true });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: 'Failed to verify 2FA.' });
  }
};

const disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+twoFactorSecret');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: '2FA disabled.', twoFactorEnabled: false });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
};

module.exports = { register, login, googleLogin, googleFirebaseLogin, verifyEmail, forgotPassword, resetPassword, getMe, updatePreferences, updateProfile, resendVerification, setup2FA, verify2FA, disable2FA };
