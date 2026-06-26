const Article = require('../models/Article');

// XML/HTML-safe text encoder for SVG output
const xmlEscape = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Wrap text into lines for SVG (no auto-wrap in SVG)
const wrapTextLines = (text, maxChars, maxLines) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) {
        const remaining = words.slice(words.indexOf(word) + 1).join(' ');
        if (remaining) line += '…';
        lines.push(line);
        return lines;
      }
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
};

/**
 * GET /api/share/:articleId
 * Returns shareable data for an article (public, no auth)
 */
const getShareData = async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.findById(articleId).select('title sentiment source url urlToImage publishedAt topic confidence');
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const shareText = `${article.title} - Sentiment: ${article.sentiment} | MYNewsSentiment`;
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/shared/${articleId}`;

    res.json({
      id: article._id,
      title: article.title,
      sentiment: article.sentiment,
      confidence: article.confidence,
      source: article.source,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      topic: article.topic,
      shareText,
      shareUrl,
    });
  } catch (err) {
    console.error('[Share] Error:', err.message);
    res.status(500).json({ error: 'Failed to get share data' });
  }
};

/**
 * GET /api/embed/:articleId
 * Returns embeddable HTML snippet with sentiment badge
 */
const getEmbedCode = async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.findById(articleId).select('title sentiment source url confidence publishedAt');
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const sentimentColor = article.sentiment === 'Positive' ? '#22c55e' : article.sentiment === 'Negative' ? '#ef4444' : '#f59e0b';
    
    const embedHtml = `<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;max-width:400px;font-family:system-ui,-apple-system,sans-serif;background:#fff;">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <span style="background:${sentimentColor};color:#fff;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">${article.sentiment}</span>
    <span style="font-size:11px;color:#6b7280;">${article.source}</span>
  </div>
  <a href="${frontendUrl}/shared/${articleId}" target="_blank" style="color:#111;text-decoration:none;font-size:14px;font-weight:600;line-height:1.4;display:block;margin-bottom:8px;">${article.title}</a>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:11px;color:#9ca3af;">Confidence: ${Math.round((article.confidence || 0) * 100)}%</span>
    <a href="${frontendUrl}" target="_blank" style="font-size:10px;color:#2563eb;text-decoration:none;">MYNewsSentiment</a>
  </div>
</div>`;

    const iframeCode = `<iframe src="${frontendUrl}/shared/${articleId}?embed=true" width="420" height="200" frameborder="0" style="border-radius:12px;border:1px solid #e5e7eb;"></iframe>`;

    res.json({
      embedHtml,
      iframeCode,
      articleId: article._id,
      title: article.title,
      sentiment: article.sentiment,
    });
  } catch (err) {
    console.error('[Embed] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate embed code' });
  }
};

/**
 * GET /api/share/:articleId/og
 * Lightweight OG image generator as SVG (works without native canvas deps)
 */
const getOgImage = async (req, res) => {
  try {
    const { articleId } = req.params;
    const article = await Article.findById(articleId).select('title sentiment source topic confidence publishedAt');

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const sentimentColor = article.sentiment === 'Positive' ? '#22c55e' : article.sentiment === 'Negative' ? '#ef4444' : '#f59e0b';
    const titleLines = wrapTextLines(article.title, 34, 3).map((line, i) => (
      `<tspan x="72" dy="${i === 0 ? 0 : 52}">${xmlEscape(line)}</tspan>`
    )).join('');

    const source = xmlEscape(article.source || 'MY News Sentiment');
    const topic = xmlEscape(article.topic || 'Malaysia');
    const confidence = Math.round((article.confidence || 0) * 100);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#FAF8F3"/>
  <rect x="40" y="40" width="1120" height="550" fill="#FFFFFF" stroke="#1A1A1A" stroke-opacity="0.12"/>
  <rect x="40" y="40" width="1120" height="12" fill="#c00000"/>
  <text x="72" y="105" fill="#c00000" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">MY NEWS SENTIMENT</text>
  <text x="72" y="190" fill="#111111" font-family="Playfair Display, Georgia, serif" font-size="46" font-weight="700">${titleLines}</text>

  <rect x="72" y="404" width="178" height="44" fill="${sentimentColor}" fill-opacity="0.14" stroke="${sentimentColor}"/>
  <text x="96" y="432" fill="${sentimentColor}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">${xmlEscape(article.sentiment || 'Neutral')}</text>

  <text x="72" y="500" fill="#6B6A65" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">SOURCE</text>
  <text x="72" y="530" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600">${source}</text>

  <text x="420" y="500" fill="#6B6A65" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">TOPIC</text>
  <text x="420" y="530" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600">${topic}</text>

  <text x="760" y="500" fill="#6B6A65" font-family="Inter, Arial, sans-serif" font-size="18" letter-spacing="2">CONFIDENCE</text>
  <text x="760" y="530" fill="#111111" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600">${confidence}%</text>

  <line x1="72" y1="565" x2="1128" y2="565" stroke="#1A1A1A" stroke-opacity="0.12"/>
  <text x="72" y="600" fill="#6B6A65" font-family="Inter, Arial, sans-serif" font-size="16" letter-spacing="2">REAL-TIME MALAYSIAN NEWS SENTIMENT ANALYSIS</text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (err) {
    console.error('[OG] Error:', err.message);
    res.status(500).json({ error: 'Failed to generate OG image' });
  }
};

module.exports = { getShareData, getEmbedCode, getOgImage };
