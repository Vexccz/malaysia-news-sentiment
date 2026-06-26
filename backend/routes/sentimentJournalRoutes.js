const express = require('express');
const router = express.Router();
const { protect, blockGuest } = require('../middleware/auth');
const {
  listEntries,
  getEntry,
  upsertEntry,
  deleteEntry,
  monthSummary,
} = require('../controllers/sentimentJournalController');

router.get('/',                protect, listEntries);
router.get('/month/:ym',       protect, monthSummary);          // /journal/month/2026-06
router.get('/:date',           protect, getEntry);              // /journal/2026-06-25
router.put('/:date',           protect, blockGuest, upsertEntry); // create or update for a date
router.delete('/:date',        protect, blockGuest, deleteEntry);

module.exports = router;
