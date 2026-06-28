const express  = require('express');
const router   = express.Router();
const { protect, authorize } = require('../middleware/auth');

// Code Quality #17: Handlers now live in dedicated, focused controllers
const { getAndAnalyzeNews, getTopSources, generateDigest, getKeywords, getForecast, getRegionalSentiment, getArticleAnalysis, getSentimentTimeline, compareTopics, getHeatmapData, getCategoriesOverview, getCategoryArticles } = require('../controllers/newsController');
const { advancedSearch } = require('../controllers/searchController');
const { trackNewsView, handleSentimentVote, getTopViewedNews, toggleBookmarkStatus } = require('../controllers/engagementController');
const { getAdminDashboardStats, getAdminInsights, triggerDigest } = require('../controllers/adminController');

// ── News analysis ─────────────────────────────────────────────
router.get('/',               protect, getAndAnalyzeNews);
router.get('/sources',        protect, getTopSources);
router.get('/keywords',       protect, getKeywords);
router.get('/regional',       protect, getRegionalSentiment);
router.get('/top',            protect, getTopViewedNews);
router.post('/digest',        protect, generateDigest);
router.post('/forecast',      protect, getForecast);
router.post('/analyze-article', protect, getArticleAnalysis);
router.get('/sentiment-timeline', protect, getSentimentTimeline);
router.get('/advanced-search',    protect, advancedSearch);
router.post('/compare',           protect, compareTopics);
router.get('/heatmap',            protect, getHeatmapData);
router.get('/categories',         protect, getCategoriesOverview);
router.get('/category/:name',     protect, getCategoryArticles);

// ── Admin (role-gated) ────────────────────────────────────────
router.get('/admin/stats',    protect, authorize('admin'), getAdminDashboardStats);
router.get('/admin/insights', protect, authorize('admin'), getAdminInsights);
router.post('/admin/send-digest', protect, authorize('admin'), triggerDigest);

// ── Engagement ────────────────────────────────────────────────
router.post('/:id/view',      protect, trackNewsView);
router.post('/:id/vote',      protect, handleSentimentVote);
router.post('/:id/bookmark',  protect, toggleBookmarkStatus);


// Article similarity detection
router.get('/:id/similar', protect, async (req, res) => {
  const { findSimilarArticles } = require('../services/articleSimilarity');
  try {
    const threshold = parseFloat(req.query.threshold) || 0.75;
    const limit = parseInt(req.query.limit) || 3;
    const similar = await findSimilarArticles(req.params.id, threshold, limit);
    res.json({ similar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sentiment explanation (XAI)
router.get('/:id/explain', protect, async (req, res) => {
  const Article = require('../models/Article');
  const { getSentimentExplanation } = require('../services/sentimentExplanation');
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    const text = `${article.title || ''} ${article.description || ''}`;
    const explanation = getSentimentExplanation(text, article.sentiment, article.confidence || 0);
    res.json(explanation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Markdown export
router.get('/:id/markdown', protect, async (req, res) => {
  const Article = require('../models/Article');
  try {
    const article = await Article.findById(req.params.id).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    
    const md = '# ' + article.title + '\n\n' +
      '**Source:** ' + article.source + ' | **Published:** ' + new Date(article.publishedAt).toLocaleDateString() + '\n' +
      '**Sentiment:** ' + article.sentiment + ' (' + Math.round((article.confidence || 0) * 100) + '% confidence)\n\n' +
      '## Summary\n' + (article.description || 'No description.') + '\n\n' +
      '## Content\n' + (article.content || article.description || 'Full content not available.') + '\n\n' +
      '## Metadata\n| Field | Value |\n|-------|-------|\n' +
      '| Topic | ' + (article.topic || 'General') + ' |\n' +
      '| State | ' + (article.stateLocation || 'N/A') + ' |\n' +
      '| Views | ' + (article.viewCount || 0) + ' |\n\n' +
      '## Reader Sentiment\n- Positive: ' + (article.feedback?.Positive || 0) + '\n- Neutral: ' + (article.feedback?.Neutral || 0) + '\n- Negative: ' + (article.feedback?.Negative || 0) + '\n\n' +
      '---\n*Exported from Malaysia News Sentiment Dashboard*\n';
    
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="article.md"');
    res.send(md);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
