const AiChat = require('../models/AiChat');
const Article = require('../models/Article');
const { performAiRequest } = require('../services/openaiService');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const serializeArticle = (article) => ({
  articleId: article._id,
  title: article.title,
  source: article.source,
  sentiment: article.sentiment,
  confidence: article.confidence,
  url: article.url,
});

const buildContext = (articles) => articles.map((a, idx) => (
  `[${idx + 1}] ${a.title}\n` +
  `Source: ${a.source}\n` +
  `Sentiment: ${a.sentiment} (${Math.round((a.confidence || 0) * 100)}%)\n` +
  `Topic: ${a.topic || 'General'}\n` +
  `State: ${a.stateLocation || 'General'}\n` +
  `Summary: ${a.description || a.content || 'No summary available'}\n` +
  `URL: ${a.url}`
)).join('\n\n');

exports.listChats = async (req, res) => {
  try {
    const chats = await AiChat.find({ user: req.userId, archived: false })
      .select('title updatedAt createdAt messages')
      .sort({ updatedAt: -1 })
      .lean();

    const items = chats.map((chat) => ({
      _id: chat._id,
      title: chat.title,
      updatedAt: chat.updatedAt,
      createdAt: chat.createdAt,
      preview: chat.messages?.[chat.messages.length - 1]?.content?.slice(0, 140) || '',
      turns: chat.messages?.length || 0,
    }));

    res.json({ chats: items });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load chats' });
  }
};

exports.getChat = async (req, res) => {
  try {
    const chat = await AiChat.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load chat' });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { question, chatId = null } = req.body || {};
    if (!question || question.trim().length < 3) {
      return res.status(400).json({ error: 'Question must be at least 3 characters' });
    }

    const q = question.trim();
    const limit = clamp(parseInt(req.body.limit, 10) || 6, 3, 10);
    const tokens = q.split(/\s+/).filter(Boolean);
    const regex = tokens.length ? new RegExp(tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : null;

    const articleQuery = { userId: req.userId };
    if (regex) {
      articleQuery.$or = [
        { title: regex },
        { description: regex },
        { content: regex },
        { topic: regex },
        { categories: regex },
        { source: regex },
      ];
    }

    let articles = await Article.find(articleQuery)
      .sort({ updatedAt: -1, confidence: -1 })
      .limit(limit)
      .lean();

    if (!articles.length) {
      articles = await Article.find({ userId: req.userId })
        .sort({ updatedAt: -1, confidence: -1 })
        .limit(limit)
        .lean();
    }

    const context = buildContext(articles);
    const prompt = `You are MY News Sentiment analyst assistant. Answer ONLY from provided article context.\n\nRules:\n- Be concise, useful, and evidence-based.\n- If context is insufficient, say what is missing.\n- Reference articles like [1], [2].\n- Focus on Malaysian news sentiment and trends.\n\nUser question:\n${q}\n\nArticle context:\n${context || 'No article context available.'}\n\nReturn plain text answer only.`;

    const raw = await performAiRequest(
      prompt,
      process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      0.3,
      700,
    );

    const assistantReply = (raw || '').trim() || 'No answer generated.';

    let chat = null;
    if (chatId) {
      chat = await AiChat.findOne({ _id: chatId, user: req.userId });
    }
    if (!chat) {
      chat = await AiChat.create({
        user: req.userId,
        title: q.slice(0, 80),
        messages: [],
      });
    }

    chat.messages.push({ role: 'user', content: q, sources: [] });
    chat.messages.push({
      role: 'assistant',
      content: assistantReply,
      sources: articles.map(serializeArticle),
    });
    if (!chat.title || chat.title === 'New conversation') chat.title = q.slice(0, 80);
    await chat.save();

    res.json({
      chatId: chat._id,
      answer: assistantReply,
      sources: articles.map(serializeArticle),
    });
  } catch (err) {
    console.error('[AI Assistant] ask failed:', err.message);
    res.status(500).json({ error: err.message || 'Failed to answer question' });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const deleted = await AiChat.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Chat not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete chat' });
  }
};
