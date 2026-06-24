const mongoose = require('mongoose');
const UserActivity = require('../models/UserActivity');
const Article = require('../models/Article');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * POST /api/v1/behavior/track
 * Track a user action (view, bookmark, search, share, export)
 */
const trackAction = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const userId = req.userId;
    const { action, articleId, query, metadata } = req.body;

    if (!action || !['view', 'bookmark', 'search', 'share', 'export'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action type' });
    }

    const activity = await UserActivity.create({
      userId,
      action,
      articleId: articleId || null,
      query: query || '',
      timestamp: new Date(),
      metadata: metadata || {},
    });

    res.status(201).json({ success: true, activityId: activity._id });
  } catch (error) {
    console.error('Track action error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/v1/behavior/stats
 * Get user behavior statistics
 */
const getStats = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const userId = req.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Run all aggregations in parallel
    const [
      totalActions,
      actionBreakdown,
      topTopics,
      sentimentPreference,
      readingByHour,
      readingByDay,
      recentSearches,
    ] = await Promise.all([
      // 1. Total actions
      UserActivity.countDocuments({ userId: userObjectId }),

      // 2. Action breakdown
      UserActivity.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 3. Top topics from views/bookmarks
      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: { $in: ['view', 'bookmark'] }, 'metadata.topic': { $ne: '' } } },
        { $group: { _id: '$metadata.topic', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // 4. Sentiment preference
      UserActivity.aggregate([
        { $match: { userId: userObjectId, 'metadata.sentiment': { $ne: null } } },
        { $group: { _id: '$metadata.sentiment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 5. Reading by hour (heatmap)
      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: 'view' } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 6. Reading by day of week
      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: 'view' } },
        { $group: { _id: { $dayOfWeek: '$timestamp' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 7. Recent unique searches
      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: 'search', query: { $ne: '' } } },
        { $sort: { timestamp: -1 } },
        { $limit: 20 },
        { $group: { _id: '$query', lastSearched: { $first: '$timestamp' } } },
        { $sort: { lastSearched: -1 } },
        { $limit: 10 },
      ]),
    ]);

    // Calculate reading streak (consecutive days)
    const streakDays = await calculateStreak(userId);

    // Get total articles viewed
    const articlesViewed = await UserActivity.countDocuments({
      userId: userObjectId,
      action: 'view',
    });

    // Build heatmap data (7 days x 24 hours)
    const heatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    readingByHour.forEach(({ _id: hour, count }) => {
      // Spread across all days for now; day-specific below
      for (let d = 0; d < 7; d++) heatmap[d][hour] += 0; // placeholder
    });
    // Rebuild with day-of-week data
    const dayHourHeatmap = await UserActivity.aggregate([
      { $match: { userId: userObjectId, action: 'view' } },
      {
        $group: {
          _id: {
            day: { $subtract: [{ $dayOfWeek: '$timestamp' }, 1] }, // 0=Sun
            hour: { $hour: '$timestamp' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const finalHeatmap = Array(7).fill(null).map(() => Array(24).fill(0));
    dayHourHeatmap.forEach(({ _id: { day, hour }, count }) => {
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        finalHeatmap[day][hour] = count;
      }
    });

    // Day names
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    res.json({
      totalActions,
      articlesViewed,
      actionBreakdown: actionBreakdown.map(({ _id, count }) => ({ action: _id, count })),
      topTopics: topTopics.map(({ _id, count }) => ({ topic: _id, count })),
      sentimentPreference: sentimentPreference.map(({ _id, count }) => ({ sentiment: _id, count })),
      readingHeatmap: {
        data: finalHeatmap,
        days: dayLabels,
        hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      },
      readingByDay: readingByDay.map(({ _id, count }) => ({ day: _id, count })),
      recentSearches: recentSearches.map(({ _id, lastSearched }) => ({ query: _id, lastSearched })),
      readingStreak: streakDays,
    });
  } catch (error) {
    console.error('Get behavior stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate consecutive-day reading streak
 */
async function calculateStreak(userId) {
  try {
    const distinctDays = await UserActivity.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), action: 'view' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 90 },
    ]);

    if (distinctDays.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < distinctDays.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split('T')[0];

      if (distinctDays[i]._id === expected) {
        streak++;
      } else if (i === 0) {
        // Today has no activity yet; check if yesterday does
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (distinctDays[0]._id === yesterday.toISOString().split('T')[0]) {
          streak = 1;
          continue;
        }
        break;
      } else {
        break;
      }
    }

    return streak;
  } catch {
    return 0;
  }
}

/**
 * GET /api/v1/behavior/insights
 * AI-generated insights about user behavior
 */
const getInsights = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ error: 'Database not connected' });
  }

  try {
    const userId = req.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Gather data for insights
    const [
      totalViews,
      sentimentPref,
      peakHourData,
      topTopics,
      recentActivity,
      streakDays,
    ] = await Promise.all([
      UserActivity.countDocuments({ userId: userObjectId, action: 'view' }),

      UserActivity.aggregate([
        { $match: { userId: userObjectId, 'metadata.sentiment': { $ne: null } } },
        { $group: { _id: '$metadata.sentiment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: 'view' } },
        { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),

      UserActivity.aggregate([
        { $match: { userId: userObjectId, action: { $in: ['view', 'bookmark'] }, 'metadata.topic': { $ne: '' } } },
        { $group: { _id: '$metadata.topic', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 },
      ]),

      UserActivity.find({ userId: userObjectId })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('action timestamp query'),

      calculateStreak(userId),
    ]);

    const insights = [];

    // 1. Reading volume insight
    if (totalViews > 0) {
      if (totalViews > 100) {
        insights.push({
          type: 'volume',
          icon: '📚',
          title: 'Prolific Reader',
          description: `You've read ${totalViews} articles. You're one of our most engaged readers!`,
          color: '#8b5cf6',
        });
      } else if (totalViews > 20) {
        insights.push({
          type: 'volume',
          icon: '📖',
          title: 'Active Reader',
          description: `You've explored ${totalViews} articles so far. Keep exploring!`,
          color: '#3b82f6',
        });
      } else {
        insights.push({
          type: 'volume',
          icon: '🌱',
          title: 'Getting Started',
          description: `You've read ${totalViews} article${totalViews === 1 ? '' : 's'}. Dive deeper to discover more insights!`,
          color: '#10b981',
        });
      }
    }

    // 2. Sentiment preference insight
    if (sentimentPref.length > 0) {
      const top = sentimentPref[0];
      const total = sentimentPref.reduce((s, p) => s + p.count, 0);
      const pct = Math.round((top.count / total) * 100);
      const sentMap = {
        Positive: { emoji: '☀️', color: '#10b981', label: 'positive' },
        Negative: { emoji: '🌧️', color: '#ef4444', label: 'negative' },
        Neutral: { emoji: '⚖️', color: '#6b7280', label: 'neutral' },
      };
      const s = sentMap[top._id] || sentMap.Neutral;
      insights.push({
        type: 'sentiment',
        icon: s.emoji,
        title: 'Sentiment Preference',
        description: `You tend to read mostly ${s.label} articles (${pct}% of your reading). ${
          top._id === 'Positive' ? 'Staying optimistic!' :
          top._id === 'Negative' ? 'Keeping an eye on challenges!' :
          'Balanced perspective!'
        }`,
        color: s.color,
      });
    }

    // 3. Peak reading time
    if (peakHourData.length > 0) {
      const peakHour = peakHourData[0]._id;
      const period = peakHour < 6 ? 'early morning' :
                     peakHour < 12 ? 'morning' :
                     peakHour < 17 ? 'afternoon' :
                     peakHour < 21 ? 'evening' : 'night';
      insights.push({
        type: 'timing',
        icon: '⏰',
        title: 'Peak Reading Time',
        description: `Your peak reading time is ${peakHour}:00–${peakHour + 1}:00 (${period}). You're most engaged during this window!`,
        color: '#f59e0b',
      });
    }

    // 4. Top topics insight
    if (topTopics.length > 0) {
      const topicNames = topTopics.map(t => t._id).filter(Boolean);
      if (topicNames.length > 0) {
        insights.push({
          type: 'topics',
          icon: '🏷️',
          title: 'Top Interests',
          description: `Your favorite topics are ${topicNames.map(n => `"${n}"`).join(', ')}. ${
            topicNames.length >= 3 ? 'You have diverse interests!' : 'Want to explore more topics?'
          }`,
          color: '#06b6d4',
        });
      }
    }

    // 5. Streak insight
    if (streakDays > 0) {
      const streakEmoji = streakDays >= 7 ? '🔥' : streakDays >= 3 ? '⚡' : '✨';
      insights.push({
        type: 'streak',
        icon: streakEmoji,
        title: `${streakDays}-Day Streak`,
        description: streakDays >= 7
          ? `Amazing! You've been reading for ${streakDays} consecutive days. Keep the streak alive!`
          : streakDays >= 3
          ? `You've read for ${streakDays} days in a row. Push for a week-long streak!`
          : `You're on a ${streakDays}-day reading streak. Build momentum!`,
        color: streakDays >= 7 ? '#ef4444' : streakDays >= 3 ? '#f59e0b' : '#10b981',
      });
    }

    // 6. Activity recency
    if (recentActivity.length > 0) {
      const last = recentActivity[0];
      const minsAgo = Math.floor((Date.now() - new Date(last.timestamp)) / 60000);
      const timeLabel = minsAgo < 1 ? 'just now' :
                        minsAgo < 60 ? `${minsAgo} minutes ago` :
                        minsAgo < 1440 ? `${Math.floor(minsAgo / 60)} hours ago` :
                        `${Math.floor(minsAgo / 1440)} days ago`;
      insights.push({
        type: 'recency',
        icon: '🕐',
        title: 'Last Activity',
        description: `Your last activity was ${timeLabel}. ${
          minsAgo < 60 ? 'You\'re actively engaged!' : 'Come back for fresh insights!'
        }`,
        color: '#8b5cf6',
      });
    }

    // If no data yet
    if (insights.length === 0) {
      insights.push({
        type: 'empty',
        icon: '🔍',
        title: 'Start Exploring',
        description: 'Read articles, bookmark favorites, and search topics to generate personalized insights about your reading habits!',
        color: '#6b7280',
      });
    }

    res.json({ insights });
  } catch (error) {
    console.error('Get insights error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { trackAction, getStats, getInsights };
