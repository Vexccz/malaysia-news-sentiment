const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { sendTestEmail, isRealSmtp } = require('../services/emailService');
const User = require('../models/User');

/**
 * GET /api/v1/admin/test-email
 * Send a test email to verify SMTP configuration.
 * Admin only.
 * Query params:
 *   - to (optional): recipient email. Defaults to EMAIL_USER.
 */
router.get('/test-email', protect, authorize('admin'), async (req, res) => {
  try {
    const to = req.query.to || process.env.EMAIL_USER;

    if (!to) {
      return res.status(400).json({
        error: 'No recipient. Set EMAIL_USER env var or pass ?to=email@example.com',
      });
    }

    const info = await sendTestEmail(to);

    res.json({
      success: true,
      message: `Test email sent to ${to}`,
      mode: isRealSmtp() ? 'production' : 'ethereal',
      messageId: info.messageId,
      ...(info.accepted && { accepted: info.accepted }),
    });
  } catch (err) {
    console.error('[Admin] Test email failed:', err.message);
    res.status(500).json({
      error: 'Failed to send test email',
      details: err.message,
      mode: isRealSmtp() ? 'production' : 'ethereal',
    });
  }
});

/**
 * GET /api/v1/admin/email-status
 * Check current email configuration status.
 * Admin only.
 */
router.get('/email-status', protect, authorize('admin'), (req, res) => {
  const realSmtp = isRealSmtp();

  res.json({
    configured: realSmtp,
    mode: realSmtp ? 'production' : 'ethereal',
    host: realSmtp ? (process.env.EMAIL_HOST || 'smtp.gmail.com') : 'smtp.ethereal.email',
    port: realSmtp ? parseInt(process.env.EMAIL_PORT || '587') : 587,
    user: realSmtp ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : null,
    note: realSmtp
      ? 'SMTP credentials configured. Emails will be delivered.'
      : 'No SMTP credentials. Using Ethereal test account (emails not delivered).',
  });
});

// ── User Management ──────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filtering.
 */
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search, sort = 'createdAt', order = 'desc' } = req.query;
    const query = {};
    
    if (role && role !== 'all') query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    
    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query).sort(sortObj).skip(skip).limit(parseInt(limit)).select('-password').lean(),
      User.countDocuments(query),
    ]);
    
    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/admin/users/:id/role
 * Update user role.
 */
router.put('/users/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user.
 */
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/v1/admin/users/:id/status
 * Enable/disable user account.
 */
router.put('/users/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { active } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: active }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/admin/recompute-impact
 * Manually trigger impact score recompute for all articles.
 * Replaces fake source-hash impact with real engagement-based score.
 */
router.post('/recompute-impact', protect, authorize('admin'), async (req, res) => {
  try {
    const { recomputeAllImpactScores } = require('../services/impactService');
    const result = await recomputeAllImpactScores();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/admin/health
 * Backend health snapshot — DB state, cron job status, RSS ingestion,
 * memory, uptime, recent errors. Admin only.
 */
router.get('/health', protect, authorize('admin'), (req, res) => {
  try {
    const { getHealthSnapshot } = require('../services/healthService');
    res.json(getHealthSnapshot());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
