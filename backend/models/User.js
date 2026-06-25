const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, select: false },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  avatar: { type: String, default: '' },

  // Verification
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date },

  // Password reset
  resetToken: { type: String },
  resetExpires: { type: Date },

  // Preferences (for settings page)
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    language: { type: String, enum: ['en', 'ms'], default: 'en' },
    articlesPerPage: { type: Number, default: 10 },
    emailNotifications: { type: Boolean, default: true },
    alertNotifications: { type: Boolean, default: true },
    autoRefresh: { type: Boolean, default: false },
    defaultTopic: { type: String, default: 'Malaysia' },
  },

  // ── Dashboard Customization ───────────────────────────────
  dashboardLayout: [{
    widgetId: { type: String },
    position: { type: Number },
    size: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    visible: { type: Boolean, default: true },
  }],

  // ── User Activity (#3 Dashboard) ─────────────────────────
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  analysisCount: { type: Number, default: 0 },
  recentlyViewed: [{ 
    article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    viewedAt: { type: Date, default: Date.now }
  }],

  // ── Selected Badges (displayed on profile) ──────────────
  selectedBadges: [{ type: String }],

  // ── Two-Factor Auth ──────────────────────────────────────
  twoFactorSecret: { type: String, select: false },
  twoFactorEnabled: { type: Boolean, default: false },

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token;
};

// Generate reset token
userSchema.methods.generateResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetExpires = Date.now() + 60 * 60 * 1000; // 1h
  return token;
};

module.exports = mongoose.model('User', userSchema);
