/**
 * adminController.js — Code Quality #17
 * Handles all admin-only analytics: system stats and AI strategic insights.
 * Extracted from newsController.js to reduce its responsibility and size.
 */
const mongoose = require('mongoose');
const Article  = require('../models/Article');
const User     = require('../models/User');


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
      safeExec(User.find().sort({ createdAt: -1 }).limit(100).select('name email role analysisCount createdAt').lean(), []),
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
// Data-driven strategic insights from real article aggregation (no LLM needed)
const getAdminInsights = async (req, res) => {
  try {
    const now   = new Date();
    const d7    = new Date(now.getTime() - 7  * 86400000);
    const d14   = new Date(now.getTime() - 14 * 86400000);

    // 1. Find the topic with highest negative ratio this week
    const topicRisk = await Article.aggregate([
      { $match: { createdAt: { $gte: d7 }, topic: { $ne: 'general' } } },
      { $group: {
          _id: '$topic',
          total: { $sum: 1 },
          neg:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
      }},
      { $addFields: { negRatio: { $divide: ['$neg', '$total'] } } },
      { $match: { total: { $gte: 2 }, negRatio: { $gte: 0.4 } } },
      { $sort: { negRatio: -1 } },
      { $limit: 1 },
    ]);

    // 2. Find the state with rising negative sentiment (this week vs last week)
    const [stateThisWeek, statePrevWeek] = await Promise.all([
      Article.aggregate([
        { $match: { createdAt: { $gte: d7 }, stateLocation: { $nin: ['General', null, ''] } } },
        { $group: {
            _id: '$stateLocation',
            total: { $sum: 1 },
            neg:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
        }},
        { $addFields: { negRatio: { $divide: ['$neg', '$total'] } } },
        { $match: { total: { $gte: 2 } } },
        { $sort: { negRatio: -1 } },
        { $limit: 3 },
      ]),
      Article.aggregate([
        { $match: { createdAt: { $gte: d14, $lt: d7 }, stateLocation: { $nin: ['General', null, ''] } } },
        { $group: {
            _id: '$stateLocation',
            total: { $sum: 1 },
            neg:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
        }},
        { $addFields: { negRatio: { $divide: ['$neg', '$total'] } } },
        { $match: { total: { $gte: 2 } } },
      ]),
    ]);

    let stateRisk = null;
    for (const cur of stateThisWeek) {
      const prev = statePrevWeek.find(p => p._id === cur._id);
      const prevRatio = prev?.negRatio || 0;
      const delta = cur.negRatio - prevRatio;
      if (!stateRisk || delta > stateRisk.delta) {
        stateRisk = { state: cur._id, negRatio: cur.negRatio, delta };
      }
    }

    // 3. Find the topic with best positive momentum
    const [topicPosThisWeek, topicPosPrevWeek] = await Promise.all([
      Article.aggregate([
        { $match: { createdAt: { $gte: d7 }, topic: { $ne: 'general' } } },
        { $group: {
            _id: '$topic',
            total: { $sum: 1 },
            pos:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
        }},
        { $addFields: { posRatio: { $divide: ['$pos', '$total'] } } },
        { $match: { total: { $gte: 2 } } },
        { $sort: { posRatio: -1 } },
        { $limit: 3 },
      ]),
      Article.aggregate([
        { $match: { createdAt: { $gte: d14, $lt: d7 }, topic: { $ne: 'general' } } },
        { $group: {
            _id: '$topic',
            total: { $sum: 1 },
            pos:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
        }},
        { $addFields: { posRatio: { $divide: ['$pos', '$total'] } } },
        { $match: { total: { $gte: 2 } } },
      ]),
    ]);

    let topicOpp = null;
    for (const cur of topicPosThisWeek) {
      const prev = topicPosPrevWeek.find(p => p._id === cur._id);
      const prevRatio = prev?.posRatio || 0;
      const delta = cur.posRatio - prevRatio;
      if (!topicOpp || delta > topicOpp.delta) {
        topicOpp = { topic: cur._id, posRatio: cur.posRatio, delta };
      }
    }

    // 4. Overall sentiment shift (this week vs last week)
    const [overallThisWeek, overallPrevWeek] = await Promise.all([
      Article.aggregate([
        { $match: { createdAt: { $gte: d7 } } },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            neg:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
            pos:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
        }},
      ]),
      Article.aggregate([
        { $match: { createdAt: { $gte: d14, $lt: d7 } } },
        { $group: {
            _id: null,
            total: { $sum: 1 },
            neg:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Negative'] }, 1, 0] } },
            pos:   { $sum: { $cond: [{ $eq: ['$sentiment', 'Positive'] }, 1, 0] } },
        }},
      ]),
    ]);

    const tw = overallThisWeek[0] || { total: 0, neg: 0, pos: 0 };
    const pw = overallPrevWeek[0]  || { total: 0, neg: 0, pos: 0 };
    const negShift = tw.total > 0 ? (tw.neg / tw.total) : 0;
    const prevNeg  = pw.total > 0 ? (pw.neg / pw.total) : 0;
    const sentimentTrend = negShift - prevNeg;

    // 5. Build insight strings from real data
    let riskText = 'System is stable — no critical negative trends detected in the past 7 days.';
    if (topicRisk.length > 0 && stateRisk) {
      const topicName = topicRisk[0]._id;
      const negPct    = Math.round(topicRisk[0].negRatio * 100);
      const stateNeg  = Math.round(stateRisk.negRatio * 100);
      riskText = `"${topicName}" coverage is ${negPct}% negative this week. ${stateRisk.state} shows the steepest sentiment decline at ${stateNeg}% negative — monitor closely.`;
    } else if (topicRisk.length > 0) {
      riskText = `"${topicRisk[0]._id}" coverage is ${Math.round(topicRisk[0].negRatio * 100)}% negative this week — rising concern across multiple states.`;
    } else if (stateRisk) {
      riskText = `${stateRisk.state} sentiment declining (${Math.round(stateRisk.negRatio * 100)}% negative) with no dominant topic — possible regional unrest.`;
    }

    let oppText = 'Steady positive coverage across topics — no standout growth areas this week.';
    if (topicOpp && topicOpp.posRatio > 0.5) {
      const pct = Math.round(topicOpp.posRatio * 100);
      oppText = `"${topicOpp.topic}" shows ${pct}% positive sentiment this week — growing public interest and favorable coverage.`;
    }

    let trendLabel = 'Stable';
    if (sentimentTrend > 0.1)       trendLabel = 'Declining';
    else if (sentimentTrend > 0.05) trendLabel = 'Slightly Declining';
    else if (sentimentTrend < -0.1) trendLabel = 'Improving';

    res.json({
      risk:        riskText,
      opportunity: oppText,
      trend:       trendLabel,
      data: {
        topicRisk:  topicRisk[0]  || null,
        stateRisk,
        topicOpp:   topicOpp      || null,
        sentimentShift: {
          thisWeekNeg:  Math.round(negShift * 100),
          prevWeekNeg:  Math.round(prevNeg * 100),
          delta:        Math.round(sentimentTrend * 100),
        },
      },
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
