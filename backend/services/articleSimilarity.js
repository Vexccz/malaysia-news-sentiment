/**
 * Article Similarity Detection
 * Uses keyword overlap + entity co-occurrence (no embedding dependency)
 */

const Article = require('../models/Article');
const { extractEntities } = require('./entityExtraction');

/**
 * Tokenize text into meaningful words
 */
function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !['that', 'this', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'which', 'would', 'could', 'about', 'after', 'before', 'into', 'over', 'also', 'more', 'than', 'other', 'some', 'very', 'just'].includes(w));
}

/**
 * Calculate Jaccard similarity between two word sets
 */
function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Find similar articles based on keyword overlap + entity co-occurrence
 * @param {string} articleId - Source article ID
 * @param {number} threshold - Minimum similarity (0-1), default 0.3
 * @param {number} limit - Max results, default 3
 * @returns {Array} - [{ _id, title, source, similarity, sentiment }]
 */
async function findSimilarArticles(articleId, threshold = 0.3, limit = 3) {
  const article = await Article.findById(articleId).select('title description source topic').lean();
  if (!article) return [];

  const sourceText = `${article.title || ''} ${article.description || ''}`;
  const sourceTokens = tokenize(sourceText);
  const sourceEntities = extractEntities(sourceText).map(e => e.name);
  
  if (sourceTokens.length < 3) return [];

  // Get recent articles (exclude self)
  const candidates = await Article.find({
    _id: { $ne: articleId },
    publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  })
  .select('title description source sentiment publishedAt topic')
  .lean()
  .limit(100);

  // Calculate similarity for each
  const similarities = candidates.map(cand => {
    const candText = `${cand.title || ''} ${cand.description || ''}`;
    const candTokens = tokenize(candText);
    const candEntities = extractEntities(candText).map(e => e.name);

    // Keyword overlap (70% weight)
    const keywordSim = jaccardSimilarity(sourceTokens, candTokens);
    
    // Entity overlap (30% weight)
    const sourceEntitySet = new Set(sourceEntities);
    const candEntitySet = new Set(candEntities);
    const entityIntersection = new Set([...sourceEntitySet].filter(x => candEntitySet.has(x)));
    const entityUnion = new Set([...sourceEntitySet, ...candEntitySet]);
    const entitySim = entityUnion.size > 0 ? entityIntersection.size / entityUnion.size : 0;

    // Combined score
    const similarity = (keywordSim * 0.7) + (entitySim * 0.3);

    return {
      _id: cand._id,
      title: cand.title,
      source: cand.source,
      sentiment: cand.sentiment,
      publishedAt: cand.publishedAt,
      similarity: parseFloat(similarity.toFixed(3)),
      sharedEntities: [...entityIntersection]
    };
  })
  .filter(s => s.similarity >= threshold)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, limit);

  return similarities;
}

module.exports = { findSimilarArticles, jaccardSimilarity };
