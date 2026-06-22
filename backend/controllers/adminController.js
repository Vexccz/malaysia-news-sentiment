/**
 * adminController.js — Code Quality #17
 * Handles all admin-only analytics: system stats and AI strategic insights.
 * Extracted from newsController.js to reduce its responsibility and size.
 */
const mongoose = require('mongoose');
const Article  = require('../models/Article');
const User     = require('../models/User');
const { getClient, performAiRequest } = require('../services/openaiService');

const isDbConnected = () => mongoose.connection.readyState === 1;

// ── GET /api/news/admin/stats ─────────────────────────────────
const getAdminDashboardStats = async (req, res) => {
  try {
    // Each metric has a safety fallback — one failure won't block the whole dashboard
    const safeExec = async (promise, fallback) => {
      try { return await promise; }
      catch (err) { console.error('Admin Metric Error:', err.message); return fallback; }
    };

    const [
      overviewStats,
      totalUsers,
      usersStats,
      totalViews,
      recentUsers,
      recentArticles,
      topImpactArticles,
      popularTopics,
      topSources,
      activityStats,
    ] = await Promise.all([
      safeExec(Article.aggregate([
        { $group: {
            _id: null,
            totalUniqueArticles: { $sum: 1 },
            pos: { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
            neg: { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
            neu: { $sum: { $cond: [{ $eq: ['$sentiment', 'Neutral']  }, 1, 0] } },
        }},
      ]), []),
      safeExec(User.countDocuments(), 0),
      safeExec(User.aggregate([{ $group: { _id: null, totalAnalysed: { $sum: '$analysisCount' } } }]), []),
      safeExec(Article.aggregate([{ $group: { _id: null, count: { $sum: '$viewCount' } } }]), []),
      safeExec(User.find().sort({ createdAt: -1 }).limit(5).select('name email role analysisCount createdAt').lean(), []),
      safeExec(Article.find().sort({ createdAt: -1 }).limit(5).select('title sentiment source publishedAt topic impactScore').lean(), []),
      safeExec(Article.find().sort({ impactScore: -1 }).limit(5).select('title source impactScore sentiment').lean(), []),
      safeExec(Article.aggregate([
        { $group: { _id: '$topic', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]), []),
      safeExec(Article.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]), []),
      // Bug #2 Fix: $group must use _id field (not 'hour')
      safeExec(Article.aggregate([
        { $group: { _id: { $hour: { $toDate: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]), []),
    ]);

    const totalAnalysedCount = usersStats[0]?.totalAnalysed || overviewStats[0]?.totalUniqueArticles || 0;

    res.json({
      overview: {
        totalArticles:  totalAnalysedCount,
        totalUnique:    overviewStats[0]?.totalUniqueArticles || 0,
        totalUsers,
        totalViews:     totalViews[0]?.count || 0,
      },
      sentiment: {
        Positive: overviewStats[0]?.pos || 0,
        Negative: overviewStats[0]?.neg || 0,
        Neutral:  overviewStats[0]?.neu || 0,
      },
      recentUsers,
      recentArticles,
      topImpactArticles,
      popularTopics: (popularTopics || []).map(t => ({
        topic: t._id,
        count: t.count,
        sov:   Math.round((t.count / (overviewStats[0]?.totalUniqueArticles || 1)) * 100),
      })),
      topSources:      (topSources || []).map(s => ({ source: s._id, count: s.count })),
      activityTimeline: activityStats,
      operational: {
        latency: `${Date.now() - (req.startTime || Date.now())}ms`,
        openai:  (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_')) ? 'Stable' : 'Not Configured',
        mongodb: isDbConnected() ? 'Health: 100%' : 'Disconnected',
      },
    });
  } catch (error) {
    console.error('getAdminDashboardStats Critical Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ── GET /api/news/admin/insights ──────────────────────────────
const getAdminInsights = async (req, res) => {
  try {
    // Security #6: Graceful fallback if no AI key configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your_')) {
      return res.json({
        risk:        'AI not configured — add OPENAI_API_KEY to .env.',
        opportunity: 'Configure AI key for strategic insights.',
      });
    }

    const recent  = await Article.find().sort({ createdAt: -1 }).limit(10)
      .select('title sentiment topic').lean();

    const prompt = `Analyze these 10 news headlines from Malaysia: ${
      recent.map(a => `[${a.sentiment}] ${a.title}`).join(' | ')
    }. Return exactly 2 strategic points. Point 1: One Specific Crisis/Risk. Point 2: One Positive Opportunity. Keep each point under 20 words. No numbers.`;

    // Use performAiRequest which handles both Ollama and OpenAI formats
    const model = process.env.OPENAI_MODEL || 'llama3.2';
    const result = await performAiRequest(prompt, model, 0.3, 150);

    const lines = result.split('\n').filter(l => l.trim().length > 5);

    res.json({
      risk:        lines[0]?.replace(/^(Point 1:|Risk:|\d+\.)/i, '').trim() || 'No critical risks.',
      opportunity: lines[1]?.replace(/^(Point 2:|Opportunity:|\d+\.)/i, '').trim() || 'Stable market conditions.',
    });
  } catch (err) {
    console.error('[AdminInsights] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/news/admin/send-digest ───────────────────
const { sendDailyDigest } = require('../services/newsletterService');

const triggerDigest = async (req, res) => {
  try {
    await sendDailyDigest();
    res.json({ message: 'Daily digest sent successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send digest: ' + err.message });
  }
};

module.exports = { getAdminDashboardStats, getAdminInsights, triggerDigest };
