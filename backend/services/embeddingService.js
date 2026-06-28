/**
 * Embedding Generation Service
 * Uses Ollama all-minilm-l6-v2 model (384 dimensions) for article similarity
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const EMBEDDING_MODEL = 'all-minilm-l6-v2';

/**
 * Generate embedding vector for text
 * @param {string} text - Article title + description
 * @returns {number[]|null} - 384-dim vector or null on failure
 */
async function generateEmbedding(text) {
  if (!text || text.trim().length < 5) return null;

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (OLLAMA_API_KEY) {
      headers['Authorization'] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const url = OLLAMA_API_KEY
      ? 'https://ollama.com/api/embeddings'
      : `${OLLAMA_URL}/api/embeddings`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text.slice(0, 1000)
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`[embedding] Ollama returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    const embedding = data.embedding || data.data?.[0]?.embedding;
    
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      console.error('[embedding] No embedding in response');
      return null;
    }

    return embedding;
  } catch (err) {
    console.error('[embedding] Error:', err.message);
    return null;
  }
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}


/**
 * Batch generate embeddings for articles that don't have them
 * @param {number} limit - Max articles to process (default 50)
 * @returns {object} - { processed, success, failed, skipped }
 */
async function generateBatchEmbeddings(limit = 50) {
  const Article = require('../models/Article');
  
  // Find articles without embeddings
  const articles = await Article.find({
    $or: [
      { embedding: { $exists: false } },
      { embedding: { $size: 0 } },
      { embedding: null }
    ]
  }).limit(limit).lean();

  let processed = 0, success = 0, failed = 0, skipped = 0;

  for (const article of articles) {
    const text = `${article.title || ''} ${article.description || ''}`.trim();
    if (!text || text.length < 10) {
      skipped++;
      continue;
    }

    const embedding = await generateEmbedding(text);
    if (embedding && embedding.length > 0) {
      await Article.updateOne(
        { _id: article._id },
        { $set: { embedding } }
      );
      success++;
    } else {
      failed++;
    }
    processed++;
  }

  return { processed, success, failed, skipped, total: articles.length };
}

module.exports = { generateEmbedding, generateBatchEmbeddings, cosineSimilarity };
