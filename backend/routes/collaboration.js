const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  addComment,
  getComments,
  likeComment,
  replyToComment,
  trackShare,
  getSharedArticles,
  getRecentDiscussions,
  getHotTakes,
  setDiscussionOfDay,
  getDiscussionOfDay,
  getTrendingKeywords,
  getSentimentPulse,
  toggleReaction,
  getLeaderboard,
} = require('../controllers/collaborationController');

// ── Comments ────────────────────────────────────────────────
router.post('/comments', protect, addComment);
router.get('/comments/:articleId', getComments);
router.post('/comments/:id/like', protect, likeComment);
router.post('/comments/:id/reply', protect, replyToComment);
router.post('/comments/:id/react', protect, toggleReaction);

// ── Discussions ─────────────────────────────────────────────
router.get('/discussions', getRecentDiscussions);
router.get('/hot-takes', getHotTakes);
router.get('/discussion-of-day', getDiscussionOfDay);
router.post('/discussion-of-day', protect, setDiscussionOfDay);

// ── Sharing ─────────────────────────────────────────────────
router.post('/share', protect, trackShare);

// ── Community Features ───────────────────────────────────────
router.get('/trending-keywords', getTrendingKeywords);
router.get('/sentiment-pulse', getSentimentPulse);
router.get('/leaderboard', getLeaderboard);
router.get('/shared', getSharedArticles);

module.exports = router;
