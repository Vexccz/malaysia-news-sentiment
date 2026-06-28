/**
 * Article Similarity Detection
 * Uses cosine similarity on 384-dim embeddings to find related articles
 */

const Article = require('../models/Article');

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find similar articles based on embedding similarity
 * @param {string} articleId - Source article ID
 * @param {number} threshold - Minimum similarity (0-1), default 0.75
 * @param {number} limit - Max results, default 3
 * @returns {Array} - [{ _id, title, source, similarity, sentiment }]
 */
async function findSimilarArticles(articleId, threshold = 0.75, limit = 3) {
  const article = await Article.findById(articleId).select('embedding title').lean();
  if (!article || !article.embedding || article.embedding.length === 0) {
    return [];
  }
  
  // Find articles with embeddings (exclude self)
  const candidates = await Article.find({
    _id: { $ne: articleId },
    embedding: { $exists: true, $ne: [] },
    publishedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  })
  .select('title source sentiment publishedAt embedding')
  .lean()
  .limit(100); // Check top 100 candidates
  
  // Calculate similarity for each
  const similarities = candidates.map(cand => ({
    _id: cand._id,
    title: cand.title,
    source: cand.source,
    sentiment: cand.sentiment,
    publishedAt: cand.publishedAt,
    similarity: cosineSimilarity(article.embedding, cand.embedding)
  }))
  .filter(s => s.similarity >= threshold)
  .sort((a, b) => b.similarity - a.similarity)
  .slice(0, limit);
  
  return similarities;
}

module.exports = { findSimilarArticles, cosineSimilarity };
