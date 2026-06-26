const express = require('express');
const router = express.Router();
const { protect, blockGuest } = require('../middleware/auth');
const { listChats, getChat, askQuestion, deleteChat } = require('../controllers/aiAssistantController');

router.get('/chats', protect, listChats);
router.get('/chats/:id', protect, getChat);
router.post('/ask', protect, blockGuest, askQuestion);
router.delete('/chats/:id', protect, blockGuest, deleteChat);

module.exports = router;
