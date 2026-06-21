import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter,sans-serif', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-900)', marginBottom: 5 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 12, color: p.fill || p.color, marginTop: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.fill || p.color }}></span>
          {p.name}: <strong style={{ color: 'var(--text-900)' }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const TopSourcesChart = ({ sourcesData = [] }) => {
  if (!sourcesData || sourcesData.length === 0) {
    return (
      <div className="chart-panel" style={{ gridColumn: '1 / -1' }}>
        <div className="chart-panel-hdr">
          <h3 className="chart-panel-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            </svg>
            Top News Sources
          </h3>
          <span className="chart-panel-pill">Sources</span>
        </div>
        <div className="chart-empty-msg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Analyze news to see top sources</span>
        </div>
      </div>
    );
  }

  const chartData = sourcesData.map(s => ({
    name: s.source.length > 22 ? s.source.slice(0, 20) + '…' : s.source,
    Positive: s.positive,
    Negative: s.negative,
    Neutral: s.neutral,
    Total: s.total,
  }));

  return (
    <div className="chart-panel" style={{ gridColumn: '1 / -1' }}>
      <div className="chart-panel-hdr">
        <h3 className="chart-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8"/><path d="M15 18h-5"/>
          </svg>
          Top News Sources &amp; Sentiment
        </h3>
        <span className="chart-panel-pill">Sources</span>
      </div>
      <ResponsiveContainer width="100%" height={260} debounce={200}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="topPos" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="topNeg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="topNeu" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <XAxis type="number" tick={{ fill: 'var(--text-400)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fill: 'var(--text-500)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)', opacity: 0.5 }} />
          <Legend formatter={v => <span style={{ color: 'var(--text-500)', fontSize: 12, fontFamily: 'Inter' }}>{v}</span>} />
          <Bar isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" dataKey="Positive" stackId="a" fill="url(#topPos)" />
          <Bar isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" dataKey="Negative" stackId="a" fill="url(#topNeg)" />
          <Bar isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" dataKey="Neutral"  stackId="a" fill="url(#topNeu)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopSourcesChart;
