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
} = require('../controllers/collaborationController');

// ── Comments ────────────────────────────────────────────────
router.post('/comments', protect, addComment);
router.get('/comments/:articleId', getComments);
router.post('/comments/:id/like', protect, likeComment);
router.post('/comments/:id/reply', protect, replyToComment);

// ── Discussions ─────────────────────────────────────────────
router.get('/discussions', getRecentDiscussions);
router.get('/hot-takes', getHotTakes);
router.get('/discussion-of-day', getDiscussionOfDay);
router.post('/discussion-of-day', protect, setDiscussionOfDay);

// ── Sharing ─────────────────────────────────────────────────
router.post('/share', protect, trackShare);
router.get('/shared', getSharedArticles);

module.exports = router;
