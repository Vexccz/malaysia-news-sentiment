import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const DAY_OPTIONS = [7, 14, 30, 60];
const MENTION_OPTIONS = [3, 5, 10];

const getColor = (v) => {
  if (v >= 0.7) return '#059669';
  if (v >= 0.3) return '#10b981';
  if (v > -0.3) return '#6b7280';
  if (v > -0.7) return '#ef4444';
  return '#dc2626';
};
const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2);

const btnStyle = (active, textColor, borderColor, isDark) => ({
  fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', padding: '0.25rem 0.6rem',
  border: `1px solid ${active ? textColor : borderColor}`, borderRadius: 0, cursor: 'pointer',
  background: active ? textColor : 'transparent',
  color: active ? (isDark ? '#111' : '#fff') : textColor,
});
const labelStyle = {
  fontFamily: "'Inter', sans-serif", fontSize: '0.75rem',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const CorrelationMatrix = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [days, setDays] = useState(30);
  const [minMentions, setMinMentions] = useState(5);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const maxE = expanded ? 30 : 15;
  const bg = isDark ? '#0a0a0a' : '#ffffff';
  const card = isDark ? '#111' : '#fafafa';
  const brd = isDark ? '#222' : '#e5e5e5';
  const txt = isDark ? '#e5e5e5' : '#1a1a1a';
  const muted = isDark ? '#888' : '#666';

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.get('/correlation/matrix', { params: { days, minMentions } });
      setData(res.data);
    } catch (err) { setError(err.friendlyMessage || 'Failed to load correlation matrix'); }
    finally { setLoading(false); }
  }, [days, minMentions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const entities = useMemo(() => data?.entities?.slice(0, maxE) || [], [data, maxE]);

  const lookup = useMemo(() => {
    if (!data?.correlations) return {};
    const m = {};
    data.correlations.forEach((c) => { m[`${c.entity1}||${c.entity2}`] = c; m[`${c.entity2}||${c.entity1}`] = c; });
    return m;
  }, [data]);

  const getCell = (a, b) => a === b ? { correlation: 1, days: data?.days || 0, self: true } : lookup[`${a}||${b}`] || null;

  const handleClick = (a, b) => {
    if (a === b) return;
    const k = `${a}||${b}`;
    setSelectedCell(selectedCell === k ? null : k);
  };

  const handleHover = (ev, a, b) => {
    if (a === b) return;
    const c = getCell(a, b);
    if (!c) return;
    const r = ev.currentTarget.getBoundingClientRect();
    setTooltip({ x: r.left + r.width / 2, y: r.top - 8, e1: a, e2: b, val: c.correlation, days: c.days });
  };

  const isHL = (a, b) => {
    if (!selectedCell) return false;
    const [s1, s2] = selectedCell.split('||');
    return a === s1 || a === s2 || b === s1 || b === s2;
  };

  const totalE = data?.entities?.length || 0;
  const accent = isDark ? '#fff' : '#111';

  return (
    <div style={{ background: bg, minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', background: card, border: `1px solid ${brd}`, borderLeftWidth: 3, borderLeftColor: accent, padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: txt, margin: 0 }}>
            Sentiment Correlation Matrix
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: muted, margin: '0.5rem 0 0' }}>
            Cross-entity sentiment movement analysis
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderBottom: `1px solid ${brd}`, paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ ...labelStyle, color: muted }}>Days</span>
            {DAY_OPTIONS.map((d) => <button key={d} onClick={() => setDays(d)} style={btnStyle(days === d, txt, brd, isDark)}>{d}</button>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ ...labelStyle, color: muted }}>Min Mentions</span>
            {MENTION_OPTIONS.map((m) => <button key={m} onClick={() => setMinMentions(m)} style={btnStyle(minMentions === m, txt, brd, isDark)}>{m}</button>)}
          </div>
          {totalE > 15 && (
            <button onClick={() => setExpanded(!expanded)} style={{ ...btnStyle(false, txt, brd, isDark), ...labelStyle, marginLeft: 'auto' }}>
              {expanded ? 'Show 15' : `Show All (${totalE})`}
            </button>
          )}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: muted }}>Loading correlation data...</div>}
        {error && <div style={{ padding: '1rem', border: '1px solid #dc2626', color: '#dc2626', fontFamily: "'Inter', sans-serif", fontSize: '0.85rem' }}>{error}</div>}

        {!loading && !error && entities.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: entities.length * 60 + 140 }}>
              <thead>
                <tr>
                  <th style={{ padding: '0.4rem', borderBottom: `1px solid ${brd}` }} />
                  {entities.map((e) => (
                    <th key={e} style={{ padding: '0.3rem 0.4rem', fontSize: '0.7rem', fontWeight: 500, fontFamily: "'Inter', sans-serif", color: txt, borderBottom: `1px solid ${brd}`, borderLeft: `1px solid ${brd}`, textAlign: 'left', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', transform: 'rotate(-35deg)', transformOrigin: 'bottom left', height: 60, verticalAlign: 'bottom' }}>
                      {e}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entities.map((row) => (
                  <tr key={row}>
                    <td style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, fontFamily: "'Inter', sans-serif", color: txt, borderBottom: `1px solid ${brd}`, borderRight: `1px solid ${brd}`, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row}
                    </td>
                    {entities.map((col) => {
                      const cell = getCell(row, col);
                      const hl = isHL(row, col);
                      const isSel = selectedCell === `${row}||${col}` || selectedCell === `${col}||${row}`;
                      const clr = cell ? getColor(cell.correlation) : brd;
                      const op = cell?.self ? 0.15 : (selectedCell && !hl ? 0.3 : 1);
                      return (
                        <td key={col} onClick={() => handleClick(row, col)} onMouseEnter={(ev) => handleHover(ev, row, col)} onMouseLeave={() => setTooltip(null)} style={{ width: 44, height: 44, textAlign: 'center', border: `1px solid ${brd}`, background: cell?.self ? 'transparent' : clr, opacity: op, cursor: cell?.self ? 'default' : 'pointer', fontSize: '0.65rem', fontFamily: "'Inter', sans-serif", color: '#fff', fontWeight: 500, outline: isSel ? `2px solid ${accent}` : 'none', outlineOffset: -2, transition: 'opacity 0.15s' }}>
                          {!cell?.self && cell ? fmt(cell.correlation) : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && entities.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${brd}` }}>
            {[
              { l: 'Strong +', c: '#059669', r: '+0.7 to +1.0' },
              { l: 'Moderate +', c: '#10b981', r: '+0.3 to +0.7' },
              { l: 'Neutral', c: '#6b7280', r: '-0.3 to +0.3' },
              { l: 'Moderate −', c: '#ef4444', r: '-0.7 to -0.3' },
              { l: 'Strong −', c: '#dc2626', r: '-1.0 to -0.7' },
            ].map((i) => (
              <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div style={{ width: 14, height: 14, background: i.c, border: `1px solid ${brd}` }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.7rem', color: muted }}>{i.l} ({i.r})</span>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && entities.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'Inter', sans-serif", color: muted }}>No correlation data available. Try adjusting filters.</div>
        )}
      </div>

      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)', zIndex: 9999, background: isDark ? '#222' : '#fff', border: `1px solid ${brd}`, padding: '0.5rem 0.75rem', pointerEvents: 'none', fontFamily: "'Inter', sans-serif", fontSize: '0.75rem', color: txt, whiteSpace: 'nowrap' }}>
          {tooltip.e1} ↔ {tooltip.e2}: {fmt(tooltip.val)} correlation ({tooltip.days} days)
        </div>
      )}
    </div>
  );
};

export default CorrelationMatrix;
