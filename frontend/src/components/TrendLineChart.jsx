import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter,sans-serif', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-400)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 12.5, color: p.stroke, marginTop: 2 }}>
          {p.name}: <strong style={{ color: 'var(--text-900)' }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const TrendLineChart = ({ trendsData = [] }) => (
  <div className="chart-panel" style={{ gridColumn: '1 / -1' }}>
    <div className="chart-panel-hdr">
      <h3 className="chart-panel-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        Sentiment Trend Timeline
      </h3>
      <span className="chart-panel-pill">Historical</span>
    </div>
    {!trendsData || trendsData.length === 0 ? (
      <div className="chart-empty-msg">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span>Trends build as you analyze news over multiple days</span>
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={220} debounce={200}>
        <AreaChart data={trendsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#30CF79" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#30CF79" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#F54E4E" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#F54E4E" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="gNeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#F7A501" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#F7A501" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'var(--text-400)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-400)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={v => <span style={{ color: 'var(--text-500)', fontSize: 12, fontFamily: 'Inter' }}>{v}</span>} />
          <Area isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" type="monotone" dataKey="Positive" stroke="#30CF79" strokeWidth={2.5} fill="url(#gPos)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg)', fill: '#30CF79' }} />
          <Area isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" type="monotone" dataKey="Negative" stroke="#F54E4E" strokeWidth={2.5} fill="url(#gNeg)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg)', fill: '#F54E4E' }} />
          <Area isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" type="monotone" dataKey="Neutral"  stroke="#F7A501" strokeWidth={2.5} fill="url(#gNeu)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--bg)', fill: '#F7A501' }} />
        </AreaChart>
      </ResponsiveContainer>
    )}
  </div>
);

export default TrendLineChart;
