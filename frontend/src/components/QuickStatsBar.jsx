import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardInit, getStats } from '../services/api';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : '—');

const TrendArrow = ({ value }) => {
  const safe = typeof value === 'number' ? value : 0;
  if (safe === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-ink-muted dark:text-ink-faint">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
          <line x1="4" y1="12" x2="20" y2="12" />
        </svg>
        <span>flat</span>
      </span>
    );
  }
  const up = safe > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        up ? 'text-emerald-600 dark:text-emerald-400' : 'text-flag'
      }`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square">
        {up ? (
          <polyline points="4 16 11 9 15 13 20 6" />
        ) : (
          <polyline points="4 8 11 15 15 11 20 18" />
        )}
      </svg>
      <span>
        {up ? '+' : ''}
        {safe}%
      </span>
    </span>
  );
};

const Stat = ({ label, value, accent, sublabel }) => (
  <div className="flex items-center gap-3 border-l border-ink/10 pl-3 first:border-l-0 first:pl-0 dark:border-paper/10">
    <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted dark:text-ink-faint">
      {label}
    </span>
    <span className={`font-['Playfair_Display'] text-base font-black leading-none ${accent || 'text-ink dark:text-paper'}`}>
      {value}
    </span>
    {sublabel ? <span className="text-[10px] text-ink-muted dark:text-ink-faint">{sublabel}</span> : null}
  </div>
);

const QuickStatsBar = () => {
  const { user } = useAuth();
  const [today, setToday] = useState(null);
  const [trend, setTrend] = useState(0);
  const [contribution, setContribution] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const [dash, myStats] = await Promise.all([
          getDashboardInit({ timeframe: '24h', limit: 1, page: 1 }).catch(() => null),
          user ? getStats({ timeframe: '7d' }).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (dash?.stats?.total !== undefined) {
          setToday(dash.stats.total);
        } else if (dash?.history?.articles?.length !== undefined) {
          setToday(dash.history.articles.length);
        }

        if (dash?.periodComparison?.total !== undefined) {
          setTrend(dash.periodComparison.total);
        }

        if (myStats?.total !== undefined) {
          setContribution(myStats.total);
        } else if (myStats?.totalAnalyses !== undefined) {
          setContribution(myStats.totalAnalyses);
        }
      } catch {
        /* swallow — stats are non-critical */
      }
    };

    loadStats();
    const id = setInterval(loadStats, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-ink/10 bg-paper/95 backdrop-blur lg:-mx-8 dark:border-paper/10 dark:bg-paper-dark/95">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 lg:px-8">
        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-flag">Newsroom Live</span>
        <Stat label="Today" value={fmt(today)} accent="text-flag" sublabel="articles" />
        <Stat label="Trend 24h" value={<TrendArrow value={trend} />} />
        {user ? (
          <Link
            to="/profile"
            className="ml-auto flex items-center gap-3 border-l border-ink/10 pl-3 transition-colors hover:text-accent dark:border-paper/10"
          >
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-muted dark:text-ink-faint">
              Your Reads
            </span>
            <span className="font-['Playfair_Display'] text-base font-black leading-none text-ink dark:text-paper">
              {fmt(contribution)}
            </span>
            <span className="text-[10px] text-ink-muted dark:text-ink-faint">7d</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default QuickStatsBar;
