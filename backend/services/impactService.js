// ─────────────────────────────────────────────────────────
// Impact Service — recomputes Article.impactScore from REAL
// engagement data (views + comments + bookmarks + shares).
//
// Formula:
//   engagement = views×0.5 + comments×3 + bookmarks×2 + shares×5
//   score = min(100, round(log2(engagement + 1) × 7))
//
// Cold-start (engagement = 0): fall back to small source seed
// (1-25) so new articles still get ranked sensibly.
//
// Strategy: aggregate engagement in 4 single queries (one per
// signal), then bulk-update articles. Much faster than per-
// article queries.
// ─────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Share = require('../models/Share');
const User = require('../models/User');

const SOURCE_SEED = (name) => {
  const n = (name || '').toLowerCase();
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = ((hash << 5) - hash + n.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  if (['bernama', 'the star', 'astro awani', 'fmt', 'malay mail', 'malaysiakini'].some(s => n.includes(s)))
    return 15 + (h % 11);
  if (['edge', 'new straits times', 'utusan', 'kosmo'].some(s => n.includes(s)))
    return 8 + (h % 10);
  return 1 + (h % 5);
};

/**
 * Recompute impactScore for ALL articles using real engagement data.
 * Should run as a scheduled job (every 15-30 min).
 *
 * Returns { updated, skipped, durationMs }.
 */
async function recomputeAllImpactScores() {
  const startedAt = Date.now();
  if (mongoose.connection.readyState !== 1) {
    console.warn('[impactService] DB not connected, skipping recompute');
    return { updated: 0, skipped: 0, durationMs: 0 };
  }

  // 1. Pull engagement counts in parallel via aggregate
  const [commentAgg, shareAgg, bookmarkAgg, articles] = await Promise.all([
    Comment.aggregate([
      { $group: { _id: '$articleId', n: { $sum: 1 } } },
    ]),
    Share.aggregate([
      { $group: { _id: '$articleId', n: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $unwind: '$bookmarks' },
      { $group: { _id: '$bookmarks', n: { $sum: 1 } } },
    ]),
    Article.find({}, { _id: 1, viewCount: 1, source: 1 }).lean(),
  ]);

  // 2. Build O(1) lookups
  const commentMap = new Map(commentAgg.map(r => [String(r._id), r.n]));
  const shareMap = new Map(shareAgg.map(r => [String(r._id), r.n]));
  const bookmarkMap = new Map(bookmarkAgg.map(r => [String(r._id), r.n]));

  // 3. Compute new score for each article + queue bulk writes
  const ops = [];
  for (const a of articles) {
    const id = String(a._id);
    const views = a.viewCount || 0;
    const comments = commentMap.get(id) || 0;
    const shares = shareMap.get(id) || 0;
    const bookmarks = bookmarkMap.get(id) || 0;

    const engagement =
      (views * 0.5) + (comments * 3) + (bookmarks * 2) + (shares * 5);

    let score;
    if (engagement === 0) {
      score = SOURCE_SEED(a.source || '');
    } else {
      score = Math.min(100, Math.round(Math.log2(engagement + 1) * 7));
    }

    ops.push({
      updateOne: {
        filter: { _id: a._id },
        update: { $set: { impactScore: score } },
      },
    });
  }

  // 4. Bulk write in chunks of 500
  let updated = 0;
  const CHUNK = 500;
  for (let i = 0; i < ops.length; i += CHUNK) {
    const slice = ops.slice(i, i + CHUNK);
    if (slice.length === 0) continue;
    const res = await Article.bulkWrite(slice, { ordered: false });
    updated += res.modifiedCount || 0;
  }

  const durationMs = Date.now() - startedAt;
  console.log(`[impactService] Recomputed ${articles.length} articles, ${updated} updated, ${durationMs}ms`);
  return { updated, total: articles.length, durationMs };
}

/**
 * Recompute impact for a single article — used after interactions
 * (comment posted, bookmark added, share clicked) for instant feedback.
 */
async function recomputeOneImpactScore(articleId) {
  if (!articleId) return null;
  const [article, comments, shares, bookmarks] = await Promise.all([
    Article.findById(articleId).select('viewCount source').lean(),
    Comment.countDocuments({ articleId }),
    Share.countDocuments({ articleId }),
    User.countDocuments({ bookmarks: articleId }),
  ]);
  if (!article) return null;

  const views = article.viewCount || 0;
  const engagement =
    (views * 0.5) + (comments * 3) + (bookmarks * 2) + (shares * 5);

  const score = engagement === 0
    ? SOURCE_SEED(article.source || '')
    : Math.min(100, Math.round(Math.log2(engagement + 1) * 7));

  await Article.updateOne({ _id: articleId }, { $set: { impactScore: score } });
  return score;
}

module.exports = {
  recomputeAllImpactScores,
  recomputeOneImpactScore,
};
