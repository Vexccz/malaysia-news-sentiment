const SentimentJournal = require('../models/SentimentJournal');
const Article = require('../models/Article');

const normalizeDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return null;
  return s;
};

const scoreSentiment = (label) => {
  if (label === 'Positive') return 1;
  if (label === 'Negative') return -1;
  return 0;
};

const computeSummary = (articles = [], mood = 0) => {
  const totals = { positive: 0, negative: 0, neutral: 0 };
  let score = 0;
  for (const article of articles) {
    if (article.sentiment === 'Positive') totals.positive += 1;
    else if (article.sentiment === 'Negative') totals.negative += 1;
    else totals.neutral += 1;
    score += scoreSentiment(article.sentiment);
  }

  const denominator = Math.max(articles.length, 1);
  const combined = ((score / denominator) * 0.7) + ((mood / 2) * 0.3);
  let label = 'Neutral';
  if (totals.positive && totals.negative) label = 'Mixed';
  else if (combined >= 0.25) label = 'Positive';
  else if (combined <= -0.25) label = 'Negative';

  return {
    label,
    score: Number(combined.toFixed(3)),
    totals,
  };
};

exports.listEntries = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 31, 90);
    const items = await SentimentJournal.find({ user: req.userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    res.json({ entries: items });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load journal' });
  }
};

exports.getEntry = async (req, res) => {
  try {
    const date = normalizeDate(req.params.date);
    if (!date) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });

    const entry = await SentimentJournal.findOne({ user: req.userId, date }).lean();
    if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load journal entry' });
  }
};

exports.upsertEntry = async (req, res) => {
  try {
    const date = normalizeDate(req.params.date);
    if (!date) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });

    const mood = Number(req.body.mood ?? 0);
    const note = String(req.body.note || '').slice(0, 2000);
    const tags = Array.isArray(req.body.tags) ? req.body.tags.slice(0, 10).map((t) => String(t).trim()).filter(Boolean) : [];

    let selectedArticles = [];
    if (Array.isArray(req.body.articleIds) && req.body.articleIds.length) {
      const rows = await Article.find({
        _id: { $in: req.body.articleIds },
        userId: req.userId,
      }).select('title sentiment confidence source').lean();
      selectedArticles = rows.map((a) => ({
        articleId: a._id,
        title: a.title,
        sentiment: a.sentiment,
        confidence: a.confidence,
        source: a.source,
      }));
    }

    const daySentiment = computeSummary(selectedArticles, mood);

    const entry = await SentimentJournal.findOneAndUpdate(
      { user: req.userId, date },
      {
        $set: {
          mood,
          note,
          tags,
          articles: selectedArticles,
          daySentiment,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save journal entry' });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const date = normalizeDate(req.params.date);
    if (!date) return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    const deleted = await SentimentJournal.findOneAndDelete({ user: req.userId, date });
    if (!deleted) return res.status(404).json({ error: 'Journal entry not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to delete entry' });
  }
};

exports.monthSummary = async (req, res) => {
  try {
    const ym = String(req.params.ym || '');
    if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM' });

    const entries = await SentimentJournal.find({
      user: req.userId,
      date: { $regex: `^${ym}-` },
    }).sort({ date: 1 }).lean();

    const summary = entries.reduce((acc, item) => {
      acc.total += 1;
      if (item.daySentiment?.label === 'Positive') acc.positive += 1;
      else if (item.daySentiment?.label === 'Negative') acc.negative += 1;
      else if (item.daySentiment?.label === 'Mixed') acc.mixed += 1;
      else acc.neutral += 1;
      acc.avgMood += Number(item.mood || 0);
      return acc;
    }, { total: 0, positive: 0, negative: 0, neutral: 0, mixed: 0, avgMood: 0 });

    if (summary.total) summary.avgMood = Number((summary.avgMood / summary.total).toFixed(2));

    res.json({ month: ym, summary, entries });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load month summary' });
  }
};
