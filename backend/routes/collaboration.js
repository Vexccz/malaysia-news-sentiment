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
  createPost,
  getPosts,
  likePost,
  reactToPost,
  replyToPost,
  createPoll,
  getPolls,
  votePoll,
  getUserBadges,
  getUserProfile,
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

// ── Community Posts (Share Your Take) ────────────────────────
router.get('/posts', getPosts);
router.post('/posts', protect, createPost);
router.post('/posts/:id/like', protect, likePost);
router.post('/posts/:id/react', protect, reactToPost);
router.post('/posts/:id/reply', protect, replyToPost);

// ── Community Polls ──────────────────────────────────────────
router.get('/polls', getPolls);
router.post('/polls', protect, createPoll);
router.post('/polls/:id/vote', protect, votePoll);

router.get('/shared', getSharedArticles);

// ── Badges & Profile ────────────────────────────────────────
router.get('/badges/:userId', getUserBadges);
router.get('/profile/:userId', getUserProfile);

module.exports = router;
