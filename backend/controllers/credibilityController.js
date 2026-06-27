const Source = require('../models/Source');
const Article = require('../models/Article');
const { calculateSourceBias, updateAllBiasScores } = require('../services/biasService');

// GET /api/credibility — list all sources with scores
exports.getSources = async (req, res) => {
  try {
    const { sort = 'credibilityScore', order = 'desc', bias } = req.query;
    const filter = {};
    if (bias && bias !== 'all') filter.bias = bias;

    const sources = await Source.find(filter)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .lean();

    // Count articles per source from Article collection
    const articleCounts = await Article.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    articleCounts.forEach(a => { countMap[a._id] = a.count; });

    // Attach real article counts and bias data
    sources.forEach(s => {
      s.totalArticles = countMap[s.name] || 0;
    });

    res.json({ sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/credibility/:sourceName — get specific source details
exports.getSourceByName = async (req, res) => {
  try {
    const escapedName = req.params.sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const source = await Source.findOne({
      name: new RegExp(`^${escapedName}$`, 'i'),
    }).lean();

    if (!source) return res.status(404).json({ error: 'Source not found.' });
    res.json({ source });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/credibility/analyze — AI-analyze a source's credibility (admin only)
exports.analyzeSource = async (req, res) => {
  try {
    const { sourceName } = req.body;
    if (!sourceName) return res.status(400).json({ error: 'sourceName is required.' });

    const escapedSourceName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let source = await Source.findOne({ name: new RegExp(`^${escapedSourceName}$`, 'i') });
    if (!source) {
      source = await Source.create({ name: sourceName });
    }

    // Placeholder AI analysis — in production, call OpenAI to evaluate
    source.lastChecked = new Date();
    await source.save();

    res.json({ source, message: 'Source analysis updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/credibility/bias/:sourceName — get bias analysis for specific source
exports.getSourceBias = async (req, res) => {
  try {
    const sourceName = req.params.sourceName;
    const days = parseInt(req.query.days) || 90;
    
    const bias = await calculateSourceBias(sourceName, days);
    
    res.json({
      source: sourceName,
      biasScore: bias.biasScore,
      sentimentSkew: bias.sentimentSkew,
      totalArticles: bias.total,
      distribution: bias.rates,
      daysAnalyzed: days,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/credibility/bias/recalculate — recalculate all source bias scores (admin only)
exports.recalculateAllBias = async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 90;
    const results = await updateAllBiasScores(days);
    
    res.json({
      message: `Bias scores updated for ${results.length} sources`,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Seed initial Malaysian sources
exports.seedSources = async (req, res) => {
  try {
    const seeds = [
      { name: 'The Star', url: 'https://www.thestar.com.my', credibilityScore: 72, bias: 'center', factCheckScore: 70, transparencyScore: 68 },
      { name: 'New Straits Times', url: 'https://www.nst.com.my', credibilityScore: 68, bias: 'center', factCheckScore: 65, transparencyScore: 64 },
      { name: 'Malaysiakini', url: 'https://www.malaysiakini.com', credibilityScore: 75, bias: 'center', factCheckScore: 78, transparencyScore: 80 },
      { name: 'Free Malaysia Today', url: 'https://www.freemalaysiatoday.com', credibilityScore: 70, bias: 'center', factCheckScore: 68, transparencyScore: 72 },
      { name: 'Bernama', url: 'https://www.bernama.com', credibilityScore: 80, bias: 'center', factCheckScore: 82, transparencyScore: 75 },
      { name: 'Astro Awani', url: 'https://www.astroawani.com', credibilityScore: 73, bias: 'center', factCheckScore: 71, transparencyScore: 70 },
      { name: 'Malay Mail', url: 'https://www.malaymail.com', credibilityScore: 71, bias: 'center', factCheckScore: 69, transparencyScore: 67 },
      { name: 'The Edge', url: 'https://www.theedgemarkets.com', credibilityScore: 78, bias: 'center', factCheckScore: 80, transparencyScore: 76 },
      { name: 'Utusan Malaysia', url: 'https://www.utusan.com.my', credibilityScore: 55, bias: 'right', factCheckScore: 50, transparencyScore: 48 },
      { name: 'Harakah Daily', url: 'https://harakahdaily.net', credibilityScore: 45, bias: 'right', factCheckScore: 42, transparencyScore: 40 },
    ];

    for (const seed of seeds) {
      await Source.findOneAndUpdate(
        { name: seed.name },
        seed,
        { upsert: true, new: true }
      );
    }

    res.json({ message: 'Sources seeded successfully.', count: seeds.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
