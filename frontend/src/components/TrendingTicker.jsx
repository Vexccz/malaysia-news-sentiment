import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { getTrendingEntities } from '../services/api';
import { useNavigate } from 'react-router-dom';

/**
 * O — Trending entities ticker
 * Bloomberg-style horizontal scrolling bar showing top mentioned entities last 24h
 * with sentiment-colored dots. Click → navigate to entity graph filtered by name.
 */
const TrendingTicker = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getTrendingEntities(24, 12)
      .then(data => { if (mounted) setEntities(data.entities || []); })
      .catch(() => { /* silently fail — ticker is non-critical */ })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading || entities.length === 0) return null;

  // duplicate list once so the marquee loops smoothly
  const stream = [...entities, ...entities];

  const sentColor = (s) =>
    s === 'Positive' ? '#22c55e' : s === 'Negative' ? '#ef4444' : '#eab308';

  return (
    <div className="border-y border-[#e5e5e5] dark:border-[#222] bg-white dark:bg-[#0a0a0a] overflow-hidden mb-4">
      <div className="flex items-center">
        {/* Label */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border-r border-[#e5e5e5] dark:border-[#222] bg-[#fafafa] dark:bg-[#111]">
          <TrendingUp size={13} className="text-black dark:text-white" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-black dark:text-white whitespace-nowrap">
            Trending · 24h
          </span>
        </div>

        {/* Marquee */}
        <div className="flex-1 overflow-hidden relative">
          <div
            className="flex items-center gap-6 py-2 whitespace-nowrap"
            style={{
              animation: 'tickerSlide 60s linear infinite',
            }}
          >
            {stream.map((e, i) => (
              <button
                key={`${e.name}-${i}`}
                onClick={() => navigate(`/entities?focus=${encodeURIComponent(e.name)}`)}
                className="flex items-center gap-1.5 text-xs hover:opacity-100 opacity-90 transition-opacity"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: sentColor(e.dominant) }}
                />
                <span className="font-medium text-black dark:text-white">{e.name}</span>
                <span className="text-[10px] tabular-nums text-gray-400 dark:text-[#666]">
                  ({e.count})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tickerSlide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default TrendingTicker;
