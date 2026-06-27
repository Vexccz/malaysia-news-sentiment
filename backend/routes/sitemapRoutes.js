// ─────────────────────────────────────────────────────────
// Sitemap routes — SEO crawler discovery
//
// Serves:
//   GET /sitemap.xml          → index of all sitemaps
//   GET /sitemap-static.xml   → static pages (landing, about, etc.)
//   GET /sitemap-articles.xml → article pages (paginated, max 5000 per file)
//
// Returned with proper Content-Type so Google/Bing crawlers accept it.
// Cached 1 hour to avoid hammering MongoDB on every crawler hit.
// ─────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const Article = require('../models/Article');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://malaysia-news-sentiment.vercel.app';
const CACHE_SECONDS = 3600;

const STATIC_PAGES = [
  { path: '/',              changefreq: 'daily',   priority: '1.0' },
  { path: '/about',         changefreq: 'monthly', priority: '0.7' },
  { path: '/pricing',       changefreq: 'monthly', priority: '0.6' },
  { path: '/contact',       changefreq: 'monthly', priority: '0.5' },
  { path: '/api-docs',      changefreq: 'weekly',  priority: '0.6' },
  { path: '/login',         changefreq: 'monthly', priority: '0.5' },
  { path: '/register',      changefreq: 'monthly', priority: '0.5' },
];

const escapeXml = (str) => String(str || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

// ─── Sitemap index ─────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${FRONTEND_URL}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${FRONTEND_URL}/sitemap-articles.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
  res.send(xml);
});

// ─── Static pages sitemap ──────────────────────────────────
router.get('/sitemap-static.xml', (req, res) => {
  const now = new Date().toISOString();
  const urls = STATIC_PAGES.map(p => `  <url>
    <loc>${FRONTEND_URL}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
  res.send(xml);
});

// ─── Article pages sitemap ─────────────────────────────────
router.get('/sitemap-articles.xml', async (req, res) => {
  try {
    // Latest 5000 articles only (Google sitemap limit is 50K but smaller = faster)
    const articles = await Article
      .find({}, '_id title publishedAt updatedAt')
      .sort({ publishedAt: -1 })
      .limit(5000)
      .lean();

    const urls = articles.map(a => {
      const lastmod = (a.updatedAt || a.publishedAt || new Date()).toISOString();
      return `  <url>
    <loc>${FRONTEND_URL}/share/${a._id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', `public, max-age=${CACHE_SECONDS}`);
    res.send(xml);
  } catch (err) {
    console.error('[Sitemap] articles error:', err.message);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
  }
});

module.exports = router;
