/**
 * Neo4j Aura connection wrapper.
 *
 * Lazy singleton driver — only initialised if NEO4J_URI is present.
 * Safe degradation: if Neo4j is unreachable, callers get null and
 * the rest of the app keeps working (MongoDB stays source of truth).
 *
 * Cypher 5 syntax (Aura kernel 5.27).
 * Source: https://neo4j.com/docs/cypher-manual/5/queries/concepts/
 */
const neo4j = require('neo4j-driver');

let driver = null;
let initPromise = null;
let lastError = null;

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

const isConfigured = () => Boolean(NEO4J_URI && NEO4J_USERNAME && NEO4J_PASSWORD);

const initDriver = async () => {
  if (driver) return driver;
  if (initPromise) return initPromise;
  if (!isConfigured()) {
    lastError = 'Neo4j env vars missing (NEO4J_URI/NEO4J_USERNAME/NEO4J_PASSWORD)';
    return null;
  }

  initPromise = (async () => {
    try {
      const d = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
        {
          maxConnectionPoolSize: 20,
          connectionAcquisitionTimeout: 30 * 1000,
          maxTransactionRetryTime: 15 * 1000,
          logging: { level: 'warn', logger: (level, msg) => console.warn(`[neo4j ${level}]`, msg) },
        }
      );
      // Verify connectivity (Aura insists on this before first query).
      await d.verifyConnectivity({ database: NEO4J_DATABASE });
      driver = d;
      lastError = null;
      console.log(`[neo4j] Connected to ${NEO4J_URI} (db=${NEO4J_DATABASE})`);
      return d;
    } catch (err) {
      lastError = err.message;
      console.error('[neo4j] Connect failed:', err.message);
      driver = null;
      return null;
    } finally {
      initPromise = null;
    }
  })();
  return initPromise;
};

const getSession = async (mode = 'READ') => {
  const d = await initDriver();
  if (!d) return null;
  return d.session({
    database: NEO4J_DATABASE,
    defaultAccessMode: mode === 'WRITE' ? neo4j.session.WRITE : neo4j.session.READ,
  });
};

/**
 * Run a write transaction with auto-retry on transient errors.
 * Source: https://neo4j.com/docs/javascript-manual/current/transactions/#_transaction_functions
 */
const runWrite = async (cypher, params = {}) => {
  const session = await getSession('WRITE');
  if (!session) return null;
  try {
    return await session.executeWrite((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
};

const runRead = async (cypher, params = {}) => {
  const session = await getSession('READ');
  if (!session) return null;
  try {
    return await session.executeRead((tx) => tx.run(cypher, params));
  } finally {
    await session.close();
  }
};

/**
 * Idempotent schema bootstrap. Indexes + uniqueness constraints.
 * Aura uses CREATE … IF NOT EXISTS so this is safe to re-run.
 */
const ensureSchema = async () => {
  const stmts = [
    'CREATE CONSTRAINT article_id IF NOT EXISTS FOR (a:Article) REQUIRE a.id IS UNIQUE',
    'CREATE CONSTRAINT entity_name IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE',
    'CREATE CONSTRAINT source_name IF NOT EXISTS FOR (s:Source) REQUIRE s.name IS UNIQUE',
    'CREATE INDEX article_published IF NOT EXISTS FOR (a:Article) ON (a.publishedAt)',
    'CREATE INDEX article_sentiment IF NOT EXISTS FOR (a:Article) ON (a.sentiment)',
    'CREATE INDEX entity_category IF NOT EXISTS FOR (e:Entity) ON (e.category)',
  ];
  const session = await getSession('WRITE');
  if (!session) return { ok: false, error: lastError };
  try {
    for (const cypher of stmts) {
      await session.run(cypher);
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    await session.close();
  }
};

const close = async () => {
  if (driver) {
    await driver.close();
    driver = null;
  }
};

const status = async () => ({
  configured: isConfigured(),
  connected: Boolean(driver) || Boolean(await initDriver()),
  database: NEO4J_DATABASE,
  uri: NEO4J_URI ? NEO4J_URI.replace(/\/\/.*@/, '//***@') : null,
  lastError,
});

module.exports = {
  isConfigured,
  initDriver,
  getSession,
  runWrite,
  runRead,
  ensureSchema,
  close,
  status,
  // re-export for callers that need types
  neo4j,
};
