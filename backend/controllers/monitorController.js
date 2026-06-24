const Article = require('../models/Article');

/**
 * GET /api/v1/monitor/stats
 * Returns real-time monitoring statistics
 */
const getMonitorStats = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Articles per hour (last 24h, bucketed by hour)
    const hourlyPipeline = [
      { $match: { publishedAt: { $gte: oneDayAgo } } },
      {
        $group: {
          _id: { $hour: '$publishedAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const hourlyData = await Article.aggregate(hourlyPipeline);

    // Articles in last hour
    const articlesLastHour = await Article.countDocuments({ publishedAt: { $gte: oneHourAgo } });

    // Sentiment distribution (last 24h)
    const sentimentPipeline = [
      { $match: { publishedAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$sentiment', count: { $sum: 1 } } },
    ];
    const sentimentData = await Article.aggregate(sentimentPipeline);
    const sentimentDist = { Positive: 0, Negative: 0, Neutral: 0 };
    sentimentData.forEach((s) => {
      if (s._id && sentimentDist[s._id] !== undefined) sentimentDist[s._id] = s.count;
    });

    // Active sources (last 24h)
    const sourcesPipeline = [
      { $match: { publishedAt: { $gte: oneDayAgo } } },
      { $group: { _id: '$source' } },
      { $count: 'total' },
    ];
    const sourcesResult = await Article.aggregate(sourcesPipeline);
    const activeSources = sourcesResult[0]?.total || 0;

    // Latest articles for ticker (last 20)
    const latestArticles = await Article.find()
      .sort({ publishedAt: -1 })
      .limit(20)
      .select('title source publishedAt sentiment url')
      .lean();

    // Total articles today
    const totalToday = await Article.countDocuments({ publishedAt: { $gte: oneDayAgo } });

    res.json({
      success: true,
      stats: {
        articlesPerHour: articlesLastHour,
        totalToday,
        sentimentDistribution: sentimentDist,
        activeSources,
        hourlyBreakdown: hourlyData.map((h) => ({ hour: h._id, count: h.count })),
        latestArticles,
        generatedAt: now.toISOString(),
      },
    });
  } catch (err) {
    console.error('[Monitor] getMonitorStats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch monitor stats' });
  }
};

/**
 * GET /api/v1/monitor/stream
 * SSE endpoint for live article streaming with Socket.IO broadcast
 */
const streamMonitor = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  let lastCheck = new Date();
  let isAlive = true;

  // Heartbeat every 15s
  const heartbeat = setInterval(() => {
    if (!isAlive) return;
    res.write(`:heartbeat\n\n`);
  }, 15000);

  // Poll every 30s for new articles
  let errorCount = 0;
  const poller = setInterval(async () => {
    if (!isAlive) return;
    try {
      const newArticles = await Article.find({ publishedAt: { $gt: lastCheck } })
        .sort({ publishedAt: -1 })
        .limit(10)
        .select('title source url publishedAt sentiment confidence description stateLocation isAlert')
        .lean();

      if (newArticles.length > 0) {
        lastCheck = new Date();
        res.write(
          `data: ${JSON.stringify({ type: 'new_articles', articles: newArticles, timestamp: lastCheck.toISOString() })}\n\n`
        );

        // Also broadcast via Socket.IO
        const io = req.app.get('io');
        if (io) {
          io.emit('monitor:new_articles', { articles: newArticles, timestamp: lastCheck.toISOString() });
        }
      }
      errorCount = 0;
    } catch (err) {
      console.error('[Monitor] SSE poll error:', err.message);
      errorCount++;
      if (errorCount >= 5) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Connection lost' })}\n\n`);
        isAlive = false;
        clearInterval(heartbeat);
        clearInterval(poller);
        res.end();
      }
    }
  }, 30000);

  req.on('close', () => {
    isAlive = false;
    clearInterval(heartbeat);
    clearInterval(poller);
  });
};

/**
 * Start the Socket.IO broadcast interval (called from server.js)
 * Checks for new articles every 5 minutes and broadcasts to all connected clients
 */
const startMonitorBroadcast = (io) => {
  let lastBroadcastCheck = new Date();

  setInterval(async () => {
    try {
      const newArticles = await Article.find({ publishedAt: { $gt: lastBroadcastCheck } })
        .sort({ publishedAt: -1 })
        .limit(10)
        .select('title source url publishedAt sentiment confidence description stateLocation isAlert')
        .lean();

      if (newArticles.length > 0) {
        lastBroadcastCheck = new Date();
        io.emit('monitor:new_articles', {
          articles: newArticles,
          timestamp: lastBroadcastCheck.toISOString(),
        });
        console.log(`[Monitor] Broadcasted ${newArticles.length} new article(s) to connected clients`);
      }
    } catch (err) {
      console.error('[Monitor] Broadcast interval error:', err.message);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

module.exports = { getMonitorStats, streamMonitor, startMonitorBroadcast };
