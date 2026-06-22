import React, { useMemo } from 'react';

/**
 * SentimentSparkline — a tiny trend indicator (≈60×20px) using raw SVG.
 *
 * Props
 * ─────
 * sentiment: 'Positive' | 'Negative' | 'Neutral'   (from article.sentiment)
 * score:     number 0‑1  (from article.sentiment.score, optional — falls back to label heuristic)
 *
 * The component generates a small sparkline that trends up / down / flat
 * based on the sentiment, plus a tiny direction arrow.
 * No Recharts dependency — pure SVG polyline.
 */

const COLORS = {
  Positive: '#059669', // green
  Negative: '#dc2626', // red
  Neutral:  '#6b7280', // gray
};

const ARROWS = {
  up:     '\u2191', // ↑
  down:   '\u2193', // ↓
  stable: '\u2192', // →
};

/**
 * Build 6 data points that visually trend in the correct direction.
 *   trend='up'   → points generally rise left→right
 *   trend='down' → points generally fall
 *   trend='stable'→ points hover around the middle
 */
function generatePoints(trend) {
  const w = 52; // SVG inner width
  const h = 14; // SVG inner height
  const pad = 1;

  const patterns = {
    up:     [10, 9, 11, 7, 5, 3],
    down:   [3, 5, 6, 8, 10, 11],
    stable: [7, 8, 7, 8, 7, 8],
  };

  const ys = patterns[trend] || patterns.stable;
  return ys
    .map((y, i) => {
      const x = pad + (i / (ys.length - 1)) * (w - pad * 2);
      const clampedY = pad + (y / 14) * (h - pad * 2);
      return `${x},${clampedY}`;
    })
    .join(' ');
}

const SentimentSparkline = ({ sentiment, score }) => {
  const { trend, color, arrow } = useMemo(() => {
    const label = (sentiment || 'Neutral').toLowerCase();

    let t = 'stable';
    if (label === 'positive') t = 'up';
    else if (label === 'negative') t = 'down';
    // score‑based refinement when available
    if (typeof score === 'number') {
      if (score > 0.6) t = 'up';
      else if (score < 0.4) t = 'down';
    }

    const c = COLORS[sentiment] || COLORS.Neutral;
    return { trend: t, color: c, arrow: ARROWS[t] };
  }, [sentiment, score]);

  const points = useMemo(() => generatePoints(trend), [trend]);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        verticalAlign: 'middle',
        lineHeight: 1,
        flexShrink: 0,
      }}
      title={`Trend: ${trend}`}
    >
      <svg
        width="52"
        height="14"
        viewBox="0 0 52 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        <polyline
          points={points}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {arrow}
      </span>
    </span>
  );
};

export default React.memo(SentimentSparkline);
