const mongoose = require('mongoose');
const isValidObjectId = (id) => id && mongoose.Types.ObjectId.isValid(id) && id !== 'guest';
const Article = require('../models/Article');

// Malaysian entity extraction patterns
const entityPatterns = {
  politicians: [
    'Anwar Ibrahim', 'Muhyiddin Yassin', 'Ismail Sabri', 'Najib Razak',
    'Mahathir', 'Ahmad Zahid', 'Hadi Awang', 'Lim Guan Eng',
    'Rafizi Ramli', 'Khairy Jamaluddin', 'Syed Saddiq', 'Wan Azizah',
    'Tengku Zafrul', 'Fadillah Yusof', 'Johari Abdul Ghani',
    'Anthony Loke', 'Nik Abduh', 'Mat Sabu', 'Azmin Ali',
    'Hamzah Zainudin', 'Wee Ka Siong', 'Hannah Yeoh', 'Nurul Izzah',
    'Saifuddin Nasution', 'Fahmi Fadzil', 'Gobind Singh',
  ],
  parties: [
    'UMNO', 'PKR', 'DAP', 'PAS', 'Bersatu', 'GPS', 'MCA', 'MIC',
    'Pakatan Harapan', 'Perikatan Nasional', 'Barisan Nasional',
    'Gabungan Parti Sarawak', 'Warisan', 'MUDA', 'Pejuang',
  ],
  organizations: [
    'MACC', 'SPR', 'Bank Negara', 'Petronas', 'Khazanah',
    'EPF', 'KWSP', 'Bursa Malaysia', 'TNB', 'Proton', 'Maybank',
    'PDRM', 'ATM', 'KKM', 'MOH', 'MOF', 'AGC',
    'Suhakam', 'Election Commission', 'Parliament',
    'IMF', 'World Bank', 'ASEAN', 'UN', 'WHO',
  ],
  locations: [
    'Putrajaya', 'Kuala Lumpur', 'Sabah', 'Sarawak', 'Johor',
    'Penang', 'Selangor', 'Perak', 'Kedah', 'Kelantan',
    'Terengganu', 'Pahang', 'Melaka', 'Negeri Sembilan', 'Perlis',
  ],
};

const getTimeFilter = (timeframe) => {
  if (!timeframe) return {};
  const now = new Date();
  let since;
  switch (timeframe) {
    case '24h': since = new Date(now - 24 * 60 * 60 * 1000); break;
    case '7d': since = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case '30d': since = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    default: return {};
  }
  return { createdAt: { $gte: since } };
};

const extractEntities = (text, typeFilter) => {
  const found = [];
  const patterns = typeFilter ? { [typeFilter]: entityPatterns[typeFilter] } : entityPatterns;
  for (const [category, entities] of Object.entries(patterns)) {
    if (!entities) continue;
    for (const entity of entities) {
      if (text.toLowerCase().includes(entity.toLowerCase())) {
        found.push({ name: entity, category });
      }
    }
  }
  return found;
};

/**
 * GET /api/entities/graph?query=&timeframe=24h|7d|30d&type=politicians|parties|organizations|locations
 */
const getEntityGraph = async (req, res) => {
  try {
    const { query, timeframe, type } = req.query;
    const userId = req.user?.id;

    const filter = { ...getTimeFilter(timeframe) };
    if (isValidObjectId(userId)) filter.userId = userId;
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
      ];
    }

    const articles = await Article.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select('title description sentiment source content createdAt')
      .lean();

    if (!articles.length) return res.json({ nodes: [], edges: [], totalArticles: 0 });

    const entityMentions = {};
    const coOccurrences = {};
    const edgeSentiments = {}; // Track sentiment for each edge

    for (const article of articles) {
      const text = `${article.title} ${article.description || ''} ${article.content || ''}`;
      const foundEntities = extractEntities(text, type);

      for (const entity of foundEntities) {
        if (!entityMentions[entity.name]) {
          entityMentions[entity.name] = { count: 0, sentiments: [], category: entity.category, articles: [] };
        }
        entityMentions[entity.name].count++;
        entityMentions[entity.name].sentiments.push(article.sentiment || 'Neutral');
        if (entityMentions[entity.name].articles.length < 10) {
          entityMentions[entity.name].articles.push({
            title: article.title, sentiment: article.sentiment,
            source: article.source, date: article.createdAt,
          });
        }
      }

      // Track co-occurrences with sentiment
      for (let i = 0; i < foundEntities.length; i++) {
        for (let j = i + 1; j < foundEntities.length; j++) {
          const key = [foundEntities[i].name, foundEntities[j].name].sort().join('|||');
          coOccurrences[key] = (coOccurrences[key] || 0) + 1;
          
          // Store sentiment score for this co-occurrence
          if (!edgeSentiments[key]) {
            edgeSentiments[key] = [];
          }
          // Convert sentiment label to numeric score
          const sentimentScore = article.sentiment === 'Positive' ? 1 : 
                                  article.sentiment === 'Negative' ? -1 : 0;
          edgeSentiments[key].push(sentimentScore);
        }
      }
    }

    const significantEntities = Object.entries(entityMentions)
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 40);

    const entityNames = new Set(significantEntities.map(([name]) => name));

    const nodes = significantEntities.map(([name, data]) => {
      const sc = { Positive: 0, Negative: 0, Neutral: 0 };
      data.sentiments.forEach(s => sc[s]++);
      const dominant = Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
      
      // Map category to type (PERSON/ORGANIZATION/LOCATION)
      let type = 'ORGANIZATION'; // Default
      if (data.category === 'politicians') type = 'PERSON';
      else if (data.category === 'parties' || data.category === 'organizations') type = 'ORGANIZATION';
      else if (data.category === 'locations') type = 'LOCATION';
      
      return { 
        id: name, 
        label: name, 
        category: data.category, 
        type: type, // Add type field for filtering
        mentions: data.count, 
        sentiment: dominant, 
        sentimentBreakdown: sc 
      };
    });

    const edges = Object.entries(coOccurrences)
      .filter(([key]) => { const [a, b] = key.split('|||'); return entityNames.has(a) && entityNames.has(b); })
      .map(([key, count]) => { 
        const [source, target] = key.split('|||');
        // Calculate average sentiment for this edge
        const sentiments = edgeSentiments[key] || [];
        const avgSentiment = sentiments.length > 0 
          ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length 
          : 0;
        return { 
          source, 
          target, 
          weight: count,
          sentiment: parseFloat(avgSentiment.toFixed(2)) // Round to 2 decimals
        };
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 60);

    res.json({ nodes, edges, totalArticles: articles.length });
  } catch (error) {
    console.error('Entity graph error:', error);
    res.status(500).json({ error: 'Failed to generate entity graph' });
  }
};

/**
 * GET /api/entities/search?q=term
 */
const searchEntities = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const allEntities = [];
    for (const [category, entities] of Object.entries(entityPatterns)) {
      for (const name of entities) {
        if (name.toLowerCase().includes(q.toLowerCase())) {
          allEntities.push({ name, category });
        }
      }
    }
    res.json(allEntities.slice(0, 20));
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

/**
 * GET /api/entities/:name
 */
const getEntityDetail = async (req, res) => {
  try {
    const { name } = req.params;
    const userId = req.user?.id;

    const filter = {};
    if (isValidObjectId(userId)) filter.userId = userId;
    filter.$or = [
      { title: { $regex: name, $options: 'i' } },
      { description: { $regex: name, $options: 'i' } },
      { content: { $regex: name, $options: 'i' } },
    ];

    const articles = await Article.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select('title description sentiment source createdAt url')
      .lean();

    const sentimentBreakdown = { Positive: 0, Negative: 0, Neutral: 0 };
    articles.forEach(a => sentimentBreakdown[a.sentiment || 'Neutral']++);

    // Trend: group by day
    const trend = {};
    articles.forEach(a => {
      const day = new Date(a.createdAt).toISOString().split('T')[0];
      if (!trend[day]) trend[day] = { Positive: 0, Negative: 0, Neutral: 0 };
      trend[day][a.sentiment || 'Neutral']++;
    });
    const trendArray = Object.entries(trend).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => ({ date, ...counts }));

    // Find category
    let category = 'other';
    for (const [cat, entities] of Object.entries(entityPatterns)) {
      if (entities.some(e => e.toLowerCase() === name.toLowerCase())) { category = cat; break; }
    }

    // Connected entities
    const connected = {};
    for (const article of articles) {
      const text = `${article.title} ${article.description || ''}`;
      const found = extractEntities(text, null);
      for (const e of found) {
        if (e.name.toLowerCase() !== name.toLowerCase()) {
          connected[e.name] = (connected[e.name] || 0) + 1;
        }
      }
    }
    const connectedList = Object.entries(connected)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([n, count]) => ({ name: n, coOccurrences: count }));

    res.json({
      name,
      category,
      totalMentions: articles.length,
      sentimentBreakdown,
      trend: trendArray,
      connectedEntities: connectedList,
      articles: articles.slice(0, 15).map(a => ({
        title: a.title, sentiment: a.sentiment, source: a.source, date: a.createdAt, url: a.url,
      })),
    });
  } catch (error) {
    console.error('Entity detail error:', error);
    res.status(500).json({ error: 'Failed to get entity details' });
  }
};

/**
 * GET /api/entities/trending?hours=24
 * Returns top mentioned entities in the last N hours with sentiment breakdown.
 * Used by the Dashboard ticker (O).
 */
const getTrendingEntities = async (req, res) => {
  try {
    const hours = Math.min(parseInt(req.query.hours) || 24, 168);
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const articles = await Article.find({ createdAt: { $gte: since } })
      .select('title description content sentiment')
      .limit(500)
      .lean();

    const counts = {}; // name -> { count, pos, neg, neu, category }
    for (const art of articles) {
      const text = `${art.title || ''} ${art.description || ''} ${art.content || ''}`;
      const entities = extractEntities(text);
      const sentKey = art.sentiment === 'Positive' ? 'pos' : art.sentiment === 'Negative' ? 'neg' : 'neu';
      for (const e of entities) {
        if (!counts[e.name]) counts[e.name] = { name: e.name, category: e.category, count: 0, pos: 0, neg: 0, neu: 0 };
        counts[e.name].count++;
        counts[e.name][sentKey]++;
      }
    }

    const top = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(e => {
        const dominant = e.pos > e.neg && e.pos > e.neu ? 'Positive'
          : e.neg > e.pos && e.neg > e.neu ? 'Negative' : 'Neutral';
        return { ...e, dominant };
      });

    res.json({ hours, entities: top, total: Object.keys(counts).length });
  } catch (err) {
    console.error('[trending entities]', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getEntityGraph, searchEntities, getEntityDetail, getTrendingEntities };
