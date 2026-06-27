// ─────────────────────────────────────────────────────────
// Health Service — tracks system component status for the
// admin "Backend Health" dashboard tab.
//
// In-memory store (resets on deploy, intentional — shows
// uptime since last deploy which is useful signal itself).
//
// Component status surface:
//   - DB connection (mongoose readyState)
//   - Last RSS ingestion run (per source)
//   - Last impactScore recompute
//   - Last trending alert evaluation
//   - Recent backend errors (last 20)
//   - Boot timestamp, Node version, uptime
// ─────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const state = {
  bootedAt: new Date().toISOString(),
  nodeVersion: process.version,
  jobs: {
    impactRecompute:  { lastRun: null, lastStatus: 'pending', lastDurationMs: null, lastDetails: null },
    trendingAlerts:   { lastRun: null, lastStatus: 'pending', lastDurationMs: null, lastDetails: null },
    rssIngestion:     { lastRun: null, lastStatus: 'pending', lastDurationMs: null, lastDetails: null },
    newsletterCron:   { lastRun: null, lastStatus: 'pending', lastDurationMs: null, lastDetails: null },
  },
  rssSources: {
    // each populated by rss services after fetch
  },
  recentErrors: [], // {timestamp, source, message} — capped at 20
};

const DB_STATE_NAMES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/** Mark a scheduled job as running, capture result, store timing. */
function recordJob(jobName, fn) {
  return async (...args) => {
    const startedAt = Date.now();
    try {
      const result = await fn(...args);
      state.jobs[jobName] = {
        lastRun: new Date(startedAt).toISOString(),
        lastStatus: 'success',
        lastDurationMs: Date.now() - startedAt,
        lastDetails: typeof result === 'object' ? result : null,
      };
      return result;
    } catch (err) {
      state.jobs[jobName] = {
        lastRun: new Date(startedAt).toISOString(),
        lastStatus: 'error',
        lastDurationMs: Date.now() - startedAt,
        lastDetails: { error: err.message },
      };
      logError(jobName, err);
      throw err;
    }
  };
}

/** Record RSS source fetch (sourceName = 'fmt', 'astroAwani', 'malaysiakini'). */
function recordRssFetch(sourceName, ok, count = 0, error = null) {
  state.rssSources[sourceName] = {
    lastFetch: new Date().toISOString(),
    lastStatus: ok ? 'success' : 'error',
    articlesFetched: count,
    error: error ? String(error).slice(0, 200) : null,
  };
}

/** Log a backend error for admin visibility. Cap at 20 entries. */
function logError(source, err) {
  state.recentErrors.unshift({
    timestamp: new Date().toISOString(),
    source: String(source).slice(0, 50),
    message: (err?.message || String(err)).slice(0, 300),
  });
  if (state.recentErrors.length > 20) {
    state.recentErrors = state.recentErrors.slice(0, 20);
  }
}

/** Build the full health snapshot for /admin/health. */
function getHealthSnapshot() {
  const uptimeMs = process.uptime() * 1000;
  const memUsage = process.memoryUsage();

  return {
    server: {
      bootedAt: state.bootedAt,
      uptimeMs,
      uptimeHuman: humanDuration(uptimeMs),
      nodeVersion: state.nodeVersion,
      env: process.env.NODE_ENV || 'development',
      memoryMb: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    },
    database: {
      state: DB_STATE_NAMES[mongoose.connection.readyState] || 'unknown',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
    },
    jobs: state.jobs,
    rssSources: state.rssSources,
    recentErrors: state.recentErrors,
  };
}

function humanDuration(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

module.exports = {
  recordJob,
  recordRssFetch,
  logError,
  getHealthSnapshot,
};
