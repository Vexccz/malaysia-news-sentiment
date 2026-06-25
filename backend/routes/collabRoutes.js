const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const {
  // Existing functions
  likeComment,
  reportComment,
  getSharedArticles,
  getDiscussions,
  getDiscussionComments,
  getDiscussionOfDay,
  postComment,
  shareArticle,
  getTrendingKeywords,
  getSentimentPulse,
  getTopContributors,
  getCommunityPolls,
  votePoll,
  createPoll,
  getReactionSummary,
  reactToComment,
  // New functions
  getThreadedComments,
  postReply,
  getUserBadges,
  getUserProfile
} = require('../controllers/collabController');

// EXISTING ROUTES

// @route   POST /collab/discussions/:id/comment
// @desc    Post a comment to a discussion
// @access  Private
router.post('/discussions/:id/comment', auth, postComment);

// @route   GET /collab/shared
// @desc    Get shared articles
// @access  Public
router.get('/shared', getSharedArticles);

// @route   GET /collab/discussions
// @desc    Get discussions list
// @access  Public
router.get('/discussions', getDiscussions);

// @route   GET /collab/discussion-of-day
// @desc    Get discussion of the day
// @access  Public
router.get('/discussion-of-day', getDiscussionOfDay);

// @route   POST /collab/share
// @desc    Share an article
// @access  Private
router.post('/share', auth, shareArticle);

// @route   POST /collab/comment/:id/like
// @desc    Toggle like on a comment
// @access  Private
router.post('/comment/:id/like', auth, likeComment);

// @route   POST /collab/comment/:id/report
// @desc    Report a comment
// @access  Private
router.post('/comment/:id/report', auth, reportComment);

// @route   GET /collab/trending-keywords
// @desc    Get trending keywords
// @access  Public
router.get('/trending-keywords', getTrendingKeywords);

// @route   GET /collab/sentiment-pulse
// @desc    Get sentiment pulse data
// @access  Public
router.get('/sentiment-pulse', getSentimentPulse);

// @route   GET /collab/leaderboard
// @desc    Get top contributors leaderboard
// @access  Public
router.get('/leaderboard', getTopContributors);

// @route   GET /collab/polls
// @desc    Get community polls
// @access  Public
router.get('/polls', getCommunityPolls);

// @route   POST /collab/polls/:id/vote
// @desc    Vote on a poll
// @access  Private
router.post('/polls/:id/vote', auth, votePoll);

// @route   POST /collab/polls
// @desc    Create a poll
// @access  Private
router.post('/polls', auth, createPoll);

// @route   GET /collab/comment/:id/reactions
// @desc    Get reaction summary for a comment
// @access  Public
router.get('/comment/:id/reactions', getReactionSummary);

// @route   POST /collab/comment/:id/react
// @desc    Add reaction to a comment
// @access  Private
router.post('/comment/:id/react', auth, reactToComment);

// NEW ROUTES

// @route   GET /collab/discussions/:discussionId/comments
// @desc    Get threaded comments for a discussion
// @access  Public
router.get('/discussions/:discussionId/comments', getThreadedComments);

// @route   POST /collab/discussions/:discussionId/:commentId/reply
// @desc    Post a reply to a comment
// @access  Private
router.post('/discussions/:discussionId/:commentId/reply', auth, postReply);

// @route   GET /collab/badges/:userId
// @desc    Get user badges
// @access  Public
router.get('/badges/:userId', getUserBadges);

// @route   GET /collab/profile/:userId
// @desc    Get user profile
// @access  Public
router.get('/profile/:userId', getUserProfile);

module.exports = router;
