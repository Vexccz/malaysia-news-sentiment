import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter,sans-serif', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-500)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize: 12.5, color: p.payload?.color || '#0f172a', marginTop: 2, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: p.payload?.color || '#0f172a' }}></span>
          {p.name}: <strong style={{ color: 'var(--text-900)' }}>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const SentimentBarChart = ({ distribution }) => {
  const data = [
    { name: 'Positive', value: distribution.Positive || 0, color: '#30CF79' },
    { name: 'Negative', value: distribution.Negative || 0, color: '#F54E4E' },
    { name: 'Neutral',  value: distribution.Neutral  || 0, color: '#F7A501' },
  ];

  return (
    <div className="chart-panel">
      <div className="chart-panel-hdr">
        <h3 className="chart-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Sentiment Breakdown
        </h3>
        <span className="chart-panel-pill">Current</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="barPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6DDFA3" />
              <stop offset="100%" stopColor="#30CF79" />
            </linearGradient>
            <linearGradient id="barNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF8080" />
              <stop offset="100%" stopColor="#F54E4E" />
            </linearGradient>
            <linearGradient id="barNeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD166" />
              <stop offset="100%" stopColor="#F7A501" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: 'var(--text-400)', fontSize: 12, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-400)', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)', opacity: 0.5 }} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" barSize={50}>
            {data.map(d => <Cell key={d.name} fill={`url(#bar${d.name.substring(0,3)})`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentBarChart;
