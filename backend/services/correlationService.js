/**
 * Sentiment Correlation Matrix Service
 * Uses entityExtraction to find entities in article text
 */
const Article = require('../models/Article');
const { extractEntities } = require('./entityExtraction');
const CustomEntity = require('../models/CustomEntity');
async function getCustomEntities() { try { return await CustomEntity.find({ isActive: true }).select('name synonyms category').lean(); } catch(e) { return []; } }

async function getCorrelationMatrix(days = 30, minMentions = 2) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const articles = await Article.find({ publishedAt: { $gte: startDate } }).lean();

  // Extract entities per article
  const entityArticleMap = {}; // entity -> [{date, sentiment}]
  const customEnts = await getCustomEntities();
  articles.forEach(art => {
    const text = (art.title || '') + ' ' + (art.description || '');
    const entities = extractEntities(text, null, customEnts);
    const unique = [...new Set(entities.map(e => e.name))];
    unique.forEach(name => {
      if (!entityArticleMap[name]) entityArticleMap[name] = [];
      const score = art.sentiment === 'Positive' ? 1 : art.sentiment === 'Negative' ? -1 : 0;
      entityArticleMap[name].push({ date: art.publishedAt, sentiment: score });
    });
  });

  // Filter by minMentions
  const qualifiedEntities = Object.entries(entityArticleMap)
    .filter(([_, data]) => data.length >= minMentions)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20)
    .map(([name]) => name);

  if (qualifiedEntities.length < 2) {
    return { entities: qualifiedEntities, correlations: [], days, minMentions };
  }

  // Build daily average sentiment per entity
  const dailyAvg = {};
  qualifiedEntities.forEach(name => {
    const dayMap = {};
    entityArticleMap[name].forEach(({ date, sentiment }) => {
      const day = new Date(date).toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(sentiment);
    });
    dailyAvg[name] = {};
    Object.entries(dayMap).forEach(([day, scores]) => {
      dailyAvg[name][day] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });
  });

  // Calculate Pearson correlation between each entity pair
  const correlations = [];
  const allDays = [...new Set(Object.values(dailyAvg).flatMap(d => Object.keys(d)))].sort();

  for (let i = 0; i < qualifiedEntities.length; i++) {
    for (let j = i + 1; j < qualifiedEntities.length; j++) {
      const a = qualifiedEntities[i];
      const b = qualifiedEntities[j];
      
      const xVals = [], yVals = [];
      allDays.forEach(day => {
        if (dailyAvg[a][day] !== undefined && dailyAvg[b][day] !== undefined) {
          xVals.push(dailyAvg[a][day]);
          yVals.push(dailyAvg[b][day]);
        }
      });

      if (xVals.length < 3) continue;

      const meanX = xVals.reduce((s, v) => s + v, 0) / xVals.length;
      const meanY = yVals.reduce((s, v) => s + v, 0) / yVals.length;
      
      let num = 0, denX = 0, denY = 0;
      for (let k = 0; k < xVals.length; k++) {
        const dx = xVals[k] - meanX;
        const dy = yVals[k] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
      }

      const corr = denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
      
      if (Math.abs(corr) > 0.1) {
        correlations.push({
          entityA: a,
          entityB: b,
          correlation: parseFloat(corr.toFixed(3)),
          coOccurrence: xVals.length
        });
      }
    }
  }

  correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    entities: qualifiedEntities,
    correlations: correlations.slice(0, 50),
    days,
    minMentions
  };
}

module.exports = { getCorrelationMatrix };
