import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = { Positive: '#30CF79', Negative: '#F54E4E', Neutral: '#F7A501' };
const RADIAN = Math.PI / 180;

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'Inter,sans-serif' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'Inter,sans-serif', boxShadow: 'var(--shadow-lg)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: COLORS[name], marginBottom: 2 }}>{name}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-900)' }}>{value} articles</p>
    </div>
  );
};

const SentimentPieChart = ({ distribution, onSegmentClick, activeFilter }) => {
  const data = Object.entries(distribution || {}).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  return (
    <div className="chart-panel">
      <div className="chart-panel-hdr">
        <h3 className="chart-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/><path d="M2 12h10"/>
          </svg>
          Share of Voice
        </h3>
        <span className="chart-panel-pill">Donut</span>
      </div>
      {data.length === 0 ? (
        <div className="chart-empty-msg">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
          <span>No data — search for news</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <defs>
              <linearGradient id="piePos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6DDFA3" />
                <stop offset="100%" stopColor="#30CF79" />
              </linearGradient>
              <linearGradient id="pieNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8080" />
                <stop offset="100%" stopColor="#F54E4E" />
              </linearGradient>
              <linearGradient id="pieNeu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD166" />
                <stop offset="100%" stopColor="#F7A501" />
              </linearGradient>
            </defs>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85}
              paddingAngle={5} dataKey="value" labelLine={false} label={renderLabel}
              isAnimationActive={true} animationDuration={1400} animationEasing="ease-out" animationBegin={200}
              stroke="none">
              {data.map(e => {
                const isActive = activeFilter === e.name;
                return (
                  <Cell 
                    key={e.name} 
                    fill={`url(#pie${e.name.substring(0,3)})`} 
                    style={{ 
                      filter: isActive ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.25))' : 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                      cursor: onSegmentClick ? 'pointer' : 'default',
                      opacity: activeFilter && !isActive ? 0.4 : 1,
                      transition: 'opacity 0.3s ease, filter 0.3s ease'
                    }} 
                    onClick={() => onSegmentClick && onSegmentClick(e.name)} 
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v => <span style={{ color: 'var(--text-500)', fontSize: 12, fontFamily: 'Inter,sans-serif' }}>{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// Changed from Pie to Donut chart (Activity 2: Chart Visualization Enhancement)
export default SentimentPieChart;
