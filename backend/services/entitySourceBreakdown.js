/**
 * Entity Sentiment Breakdown by Source
 * Aggregates sentiment for a specific entity across different news sources
 */

const Article = require('../models/Article');
const { extractEntities } = require('./entityExtraction');

/**
 * Get sentiment breakdown for an entity by source
 * @param {string} entityName - Entity to analyze
 * @returns {Array} - [{ source, positive, negative, neutral, total, avgSentiment }]
 */
async function getEntitySourceBreakdown(entityName) {
  // Get all articles from last 90 days
  const articles = await Article.find({
    publishedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
  }).select('source sentiment title description').lean();
  
  // Group by source, check if entity mentioned
  const sourceMap = {};
  
  articles.forEach(art => {
    const text = `${art.title || ''} ${art.description || ''}`;
    const entities = extractEntities(text);
    const hasEntity = entities.some(e => e.name.toLowerCase() === entityName.toLowerCase());
    
    if (!hasEntity) return;
    
    if (!sourceMap[art.source]) {
      sourceMap[art.source] = { positive: 0, negative: 0, neutral: 0, total: 0 };
    }
    
    sourceMap[art.source].total++;
    if (art.sentiment === 'Positive') sourceMap[art.source].positive++;
    else if (art.sentiment === 'Negative') sourceMap[art.source].negative++;
    else sourceMap[art.source].neutral++;
  });
  
  // Convert to array with avg sentiment
  const breakdown = Object.entries(sourceMap)
    .map(([source, data]) => {
      const sentimentScore = (data.positive - data.negative) / data.total;
      return {
        source,
        ...data,
        avgSentiment: parseFloat(sentimentScore.toFixed(2))
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10 sources
  
  return breakdown;
}

module.exports = { getEntitySourceBreakdown };
