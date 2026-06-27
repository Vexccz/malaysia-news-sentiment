const Article = require('../models/Article');
const graphService = require('./graphService');
const { extractEntities } = require('./entityExtraction');

const toIso = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const buildArticleText = (article = {}) => (
  `${article.title || ''} ${article.description || ''} ${article.content || ''}`.trim()
);

const dedupeEntities = (entities = []) => {
  const seen = new Set();
  return entities.filter((entity) => {
    const key = `${entity.name}:::${entity.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normaliseArticlePayload = (article = {}) => {
  const entities = dedupeEntities(extractEntities(buildArticleText(article)));
  return {
    articleId: String(article._id || article.id || article.url || ''),
    title: article.title || '',
    description: article.description || '',
    url: article.url || '',
    topic: article.topic || 'general',
    sentiment: article.sentiment || 'Neutral',
    source: article.source || 'Unknown',
    publishedAt: toIso(article.publishedAt || article.createdAt),
    createdAt: toIso(article.createdAt),
    updatedAt: toIso(article.updatedAt),
    stateLocation: article.stateLocation || 'General',
    confidence: typeof article.confidence === 'number' ? article.confidence : 0,
    isAlert: Boolean(article.isAlert),
    impactScore: typeof article.impactScore === 'number' ? article.impactScore : 0,
    userId: article.userId ? String(article.userId) : null,
    entities,
  };
};

/**
 * Idempotent article projection into Neo4j.
 * MongoDB remains source of truth; graph is derived cache.
 */
const syncArticleToGraph = async (article) => {
  if (!article) return { ok: false, skipped: true, reason: 'article_missing' };
  if (!graphService.isConfigured()) return { ok: false, skipped: true, reason: 'neo4j_not_configured' };

  const payload = normaliseArticlePayload(article);
  if (!payload.articleId || !payload.url) {
    return { ok: false, skipped: true, reason: 'article_missing_id_or_url' };
  }

  const result = await graphService.runWrite(
    `
    MERGE (a:Article {id: $article.articleId})
    SET a.title = $article.title,
        a.description = $article.description,
        a.url = $article.url,
        a.topic = $article.topic,
        a.sentiment = $article.sentiment,
        a.publishedAt = $article.publishedAt,
        a.createdAt = $article.createdAt,
        a.updatedAt = $article.updatedAt,
        a.stateLocation = $article.stateLocation,
        a.confidence = $article.confidence,
        a.isAlert = $article.isAlert,
        a.impactScore = $article.impactScore,
        a.userId = $article.userId
    WITH a
    OPTIONAL MATCH (oldSource:Source)-[oldPub:PUBLISHED]->(a)
    DELETE oldPub
    WITH a
    OPTIONAL MATCH (a)-[oldMention:MENTIONS]->(:Entity)
    DELETE oldMention
    WITH a
    MERGE (s:Source {name: $article.source})
    MERGE (s)-[:PUBLISHED]->(a)
    WITH a, $article.entities AS entities
    UNWIND entities AS entity
    MERGE (e:Entity {name: entity.name})
    SET e.category = entity.category,
        e.type = entity.type
    MERGE (a)-[:MENTIONS {
      category: entity.category,
      type: entity.type
    }]->(e)
    RETURN a.id AS articleId, size(entities) AS entityCount
    `,
    { article: payload }
  );

  if (!result) return { ok: false, skipped: true, reason: 'neo4j_unavailable' };
  const row = result.records?.[0]?.toObject?.() || {};
  return {
    ok: true,
    articleId: row.articleId || payload.articleId,
    entityCount: Number(row.entityCount?.low ?? row.entityCount ?? payload.entities.length),
  };
};

const syncArticlesByIds = async (articleIds = []) => {
  if (!Array.isArray(articleIds) || !articleIds.length) {
    return { ok: true, scanned: 0, synced: 0, failed: 0, results: [] };
  }
  const articles = await Article.find({ _id: { $in: articleIds } })
    .sort({ createdAt: -1 })
    .lean();
  const results = [];
  let synced = 0;
  let failed = 0;
  for (const article of articles) {
    try {
      const res = await syncArticleToGraph(article);
      results.push({ articleId: String(article._id), ...res });
      if (res.ok) synced += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      results.push({ articleId: String(article._id), ok: false, error: err.message });
    }
  }
  return { ok: failed === 0, scanned: articles.length, synced, failed, results };
};

const bulkSyncArticlesToGraph = async ({ limit = 100, sinceHours = null } = {}) => {
  if (!graphService.isConfigured()) {
    return { ok: false, skipped: true, reason: 'neo4j_not_configured' };
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 2000);
  const query = {};
  if (sinceHours && Number(sinceHours) > 0) {
    query.createdAt = { $gte: new Date(Date.now() - Number(sinceHours) * 60 * 60 * 1000) };
  }

  await graphService.ensureSchema();

  const articles = await Article.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  let synced = 0;
  let failed = 0;
  const errors = [];

  for (const article of articles) {
    try {
      const res = await syncArticleToGraph(article);
      if (res.ok) synced += 1;
      else {
        failed += 1;
        errors.push({ articleId: String(article._id), reason: res.reason || 'sync_failed' });
      }
    } catch (err) {
      failed += 1;
      errors.push({ articleId: String(article._id), reason: err.message });
    }
  }

  return {
    ok: failed === 0,
    scanned: articles.length,
    synced,
    failed,
    errors: errors.slice(0, 20),
  };
};

const getGraphHealth = async () => {
  const base = await graphService.status();
  if (!base.connected) return base;

  const result = await graphService.runRead(
    `
    CALL {
      MATCH (a:Article) RETURN count(a) AS articleCount
    }
    CALL {
      MATCH (e:Entity) RETURN count(e) AS entityCount
    }
    CALL {
      MATCH (s:Source) RETURN count(s) AS sourceCount
    }
    CALL {
      MATCH ()-[m:MENTIONS]->() RETURN count(m) AS mentionCount
    }
    RETURN articleCount, entityCount, sourceCount, mentionCount
    `
  );

  const row = result?.records?.[0]?.toObject?.() || {};
  const num = (v) => Number(v?.low ?? v ?? 0);
  return {
    ...base,
    counts: {
      articles: num(row.articleCount),
      entities: num(row.entityCount),
      sources: num(row.sourceCount),
      mentions: num(row.mentionCount),
    },
  };
};

module.exports = {
  normaliseArticlePayload,
  syncArticleToGraph,
  syncArticlesByIds,
  bulkSyncArticlesToGraph,
  getGraphHealth,
};
