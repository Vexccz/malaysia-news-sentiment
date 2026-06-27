const graphService = require('../services/graphService');

const intVal = (value) => Number(value?.low ?? value?.high ? value.toString?.() ?? value : value ?? 0);
const floatVal = (value) => Number(value ?? 0);

const getGraphOverview = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 40, 5), 100);
    const minWeight = Math.min(Math.max(parseInt(req.query.minWeight, 10) || 2, 1), 20);

    const result = await graphService.runRead(
      `
      MATCH (a:Article)-[:MENTIONS]->(e:Entity)
      WITH e, count(a) AS mentions,
           sum(CASE a.sentiment WHEN 'Positive' THEN 1 ELSE 0 END) AS positive,
           sum(CASE a.sentiment WHEN 'Negative' THEN 1 ELSE 0 END) AS negative,
           sum(CASE a.sentiment WHEN 'Neutral' THEN 1 ELSE 0 END) AS neutral
      ORDER BY mentions DESC
      LIMIT $limit
      WITH collect({
        id: e.name,
        label: e.name,
        category: e.category,
        type: e.type,
        mentions: mentions,
        sentiment: CASE
          WHEN positive >= negative AND positive >= neutral THEN 'Positive'
          WHEN negative >= positive AND negative >= neutral THEN 'Negative'
          ELSE 'Neutral'
        END,
        sentimentBreakdown: {
          Positive: positive,
          Negative: negative,
          Neutral: neutral
        }
      }) AS nodes
      UNWIND nodes AS n1
      MATCH (e1:Entity {name: n1.id})<-[:MENTIONS]-(a:Article)-[:MENTIONS]->(e2:Entity)
      WHERE e1.name < e2.name AND e2.name IN [n IN nodes | n.id]
      WITH nodes, e1, e2, count(a) AS weight,
           avg(CASE a.sentiment WHEN 'Positive' THEN 1.0 WHEN 'Negative' THEN -1.0 ELSE 0.0 END) AS avgSentiment
      WHERE weight >= $minWeight
      RETURN nodes,
             collect({
               source: e1.name,
               target: e2.name,
               weight: weight,
               sentiment: round(avgSentiment * 100.0) / 100.0
             }) AS edges
      `,
      { limit, minWeight }
    );

    const row = result?.records?.[0]?.toObject?.() || { nodes: [], edges: [] };
    const nodes = (row.nodes || []).map((n) => ({
      ...n,
      mentions: intVal(n.mentions),
      sentimentBreakdown: {
        Positive: intVal(n.sentimentBreakdown?.Positive),
        Negative: intVal(n.sentimentBreakdown?.Negative),
        Neutral: intVal(n.sentimentBreakdown?.Neutral),
      },
    }));
    const edges = (row.edges || []).map((e) => ({
      ...e,
      weight: intVal(e.weight),
      sentiment: floatVal(e.sentiment),
    }));

    return res.json({ nodes, edges, totalArticles: null, source: 'neo4j' });
  } catch (err) {
    console.error('Neo4j graph overview error:', err.message);
    return res.status(500).json({ error: 'Failed to build graph overview', details: err.message });
  }
};

const getEntityEgo = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Entity name required' });

    const result = await graphService.runRead(
      `
      MATCH (center:Entity {name: $name})
      OPTIONAL MATCH (center)<-[:MENTIONS]-(a:Article)
      WITH center,
           count(a) AS totalMentions,
           sum(CASE a.sentiment WHEN 'Positive' THEN 1 ELSE 0 END) AS positive,
           sum(CASE a.sentiment WHEN 'Negative' THEN 1 ELSE 0 END) AS negative,
           sum(CASE a.sentiment WHEN 'Neutral' THEN 1 ELSE 0 END) AS neutral
      OPTIONAL MATCH (center)<-[:MENTIONS]-(a2:Article)-[:MENTIONS]->(other:Entity)
      WHERE other.name <> center.name
      WITH center, totalMentions, positive, negative, neutral,
           collect(DISTINCT {
             name: other.name,
             category: other.category,
             type: other.type,
             coOccurrences: count { (center)<-[:MENTIONS]-(:Article)-[:MENTIONS]->(other) }
           }) AS connectedEntities
      RETURN {
        name: center.name,
        category: center.category,
        type: center.type,
        totalMentions: totalMentions,
        sentimentBreakdown: {
          Positive: positive,
          Negative: negative,
          Neutral: neutral
        },
        connectedEntities: connectedEntities
      } AS entity
      `,
      { name }
    );

    const row = result?.records?.[0]?.toObject?.();
    if (!row?.entity) return res.status(404).json({ error: 'Entity not found in graph' });

    const entity = row.entity;
    return res.json({
      ...entity,
      totalMentions: intVal(entity.totalMentions),
      sentimentBreakdown: {
        Positive: intVal(entity.sentimentBreakdown?.Positive),
        Negative: intVal(entity.sentimentBreakdown?.Negative),
        Neutral: intVal(entity.sentimentBreakdown?.Neutral),
      },
      connectedEntities: (entity.connectedEntities || [])
        .map((c) => ({ ...c, coOccurrences: intVal(c.coOccurrences) }))
        .sort((a, b) => b.coOccurrences - a.coOccurrences),
      source: 'neo4j',
    });
  } catch (err) {
    console.error('Neo4j entity ego error:', err.message);
    return res.status(500).json({ error: 'Failed to load entity ego network', details: err.message });
  }
};

module.exports = {
  getGraphOverview,
  getEntityEgo,
};
