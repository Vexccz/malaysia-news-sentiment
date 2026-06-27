const cron = require('node-cron');
const Article = require('../models/Article');
const User = require('../models/User');
const { generateDigest } = require('./openaiService');
const { sendEmail, FRONTEND_URL } = require('./emailService');

/**
 * Generate newsletter HTML from digest data
 */
const buildNewsletterHtml = (digest, stats, date) => {
  const digestEn = typeof digest === 'string' ? digest : (digest?.en || 'No digest available.');
  const digestMs = typeof digest === 'string' ? '' : (digest?.ms || '');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .head { background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; }
    .head h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 800; }
    .head p { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px; color: #374151; font-size: 14px; line-height: 1.8; }
    .stats-row { display: flex; gap: 16px; margin: 24px 0; }
    .stat-box { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-num { font-size: 28px; font-weight: 900; color: #0f172a; }
    .stat-label { font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
    .stat-pos .stat-num { color: #10b981; }
    .stat-neg .stat-num { color: #ef4444; }
    .stat-neu .stat-num { color: #f59e0b; }
    .digest-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0; white-space: pre-line; }
    .digest-section h3 { margin: 0 0 12px; color: #0f172a; font-size: 16px; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff !important; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; }
    .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>📊 Daily Sentiment Digest</h1>
      <p>${date} — MY News Sentiment Intelligence</p>
    </div>
    <div class="body">
      <p>Here's your daily summary of Malaysian news sentiment analysis:</p>
      
      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-num">${stats.total || 0}</div>
          <div class="stat-label">Articles</div>
        </div>
        <div class="stat-box stat-pos">
          <div class="stat-num">${stats.positive || 0}</div>
          <div class="stat-label">Positive</div>
        </div>
        <div class="stat-box stat-neg">
          <div class="stat-num">${stats.negative || 0}</div>
          <div class="stat-label">Negative</div>
        </div>
        <div class="stat-box stat-neu">
          <div class="stat-num">${stats.neutral || 0}</div>
          <div class="stat-label">Neutral</div>
        </div>
      </div>

      <div class="digest-section">
        <h3>🇬🇧 Executive Summary</h3>
        <p>${digestEn}</p>
      </div>

      ${digestMs ? `
      <div class="digest-section">
        <h3>🇲🇾 Ringkasan Eksekutif</h3>
        <p>${digestMs}</p>
      </div>
      ` : ''}

      <hr class="divider" />
      
      <p style="text-align: center;">
        <a class="btn" href="${FRONTEND_URL}/dashboard">View Full Dashboard →</a>
      </p>
    </div>
    <div class="footer">
      You're receiving this because you subscribed to daily digests on MY News Sentiment.<br/>
      <a href="${FRONTEND_URL}/settings" style="color: #3b82f6;">Manage preferences</a> · FYP Project © 2026 UMPSA
    </div>
  </div>
</body>
</html>`;
};

/**
 * Send daily digest to all subscribed users
 */
const sendDailyDigest = async (frequency = 'daily') => {
  console.log(`[Newsletter] Starting ${frequency} digest generation...`);

  try {
    // Get articles from last window (24h for daily, 7d for weekly)
    const windowMs = frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs);
    const articles = await Article.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(frequency === 'weekly' ? 150 : 50)
      .lean();

    if (articles.length === 0) {
      console.log(`[Newsletter] No articles in last window. Skipping ${frequency} digest.`);
      return;
    }

    // Calculate stats
    const stats = {
      total: articles.length,
      positive: articles.filter(a => a.sentiment === 'Positive').length,
      negative: articles.filter(a => a.sentiment === 'Negative').length,
      neutral: articles.filter(a => a.sentiment === 'Neutral').length,
    };

    // Generate AI digest
    let digest = { en: `${frequency === 'weekly' ? 'Weekly' : 'Daily'} digest summary unavailable.`, ms: '' };
    try {
      const result = await generateDigest(articles, frequency === 'weekly' ? 'Weekly Overview' : 'Daily Overview');
      if (result?.digest) digest = result.digest;
    } catch (err) {
      console.warn('[Newsletter] AI digest failed:', err.message);
    }

    const date = new Date().toLocaleDateString('en-MY', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const html = buildNewsletterHtml(digest, stats, date);

    // Find subscribed users matching this frequency
    const users = await User.find({
      isVerified: true,
      'preferences.newsletter': { $ne: false },
      'preferences.digestFrequency': frequency,
    }).select('email name').lean();

    if (users.length === 0) {
      console.log(`[Newsletter] No ${frequency} subscribers found.`);
      return;
    }

    let sent = 0;
    const subjectPrefix = frequency === 'weekly' ? '📊 Weekly' : '📊 Daily';

    for (const user of users) {
      try {
        await sendEmail({
          to: user.email,
          subject: `${subjectPrefix} Sentiment Digest — ${date}`,
          html,
        });
        sent++;
      } catch (err) {
        console.warn(`[Newsletter] Failed to send to ${user.email}:`, err.message);
      }
    }

    console.log(`[Newsletter] ✅ ${frequency} digest sent to ${sent}/${users.length} users.`);
  } catch (err) {
    console.error('[Newsletter] Fatal error:', err.message);
  }
};

/**
 * Schedule digests — daily at 8 AM MYT, weekly Monday at 8 AM MYT
 */
const scheduleNewsletter = () => {
  // Daily digest — every day at 8:00 AM Malaysia Time
  cron.schedule('0 8 * * *', () => {
    console.log('[Newsletter] Daily cron triggered');
    sendDailyDigest('daily');
  }, { timezone: 'Asia/Kuala_Lumpur' });

  // Weekly digest — every Monday at 8:00 AM Malaysia Time
  cron.schedule('0 8 * * 1', () => {
    console.log('[Newsletter] Weekly cron triggered');
    sendDailyDigest('weekly');
  }, { timezone: 'Asia/Kuala_Lumpur' });

  console.log('📧 Newsletter scheduler active — daily 8AM MYT, weekly Monday 8AM MYT');
};

module.exports = { sendDailyDigest, scheduleNewsletter, buildNewsletterHtml };
