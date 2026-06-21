import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SentimentHorizontalBar = ({ distribution = {} }) => {
  const data = [
    { name: 'Positive', value: distribution.positive || 0, color: '#059669' },
    { name: 'Negative', value: distribution.negative || 0, color: '#dc2626' },
    { name: 'Neutral', value: distribution.neutral || 0, color: '#d97706' },
  ].sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...data.map(d => d.value));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const total = distribution.positive + distribution.negative + distribution.neutral;
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-paper dark:bg-ink border border-ink/15 dark:border-paper/15 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: item.payload.color }}>
            {item.payload.name}
          </p>
          <p className="font-['Playfair_Display'] text-lg font-bold text-ink dark:text-paper">
            {item.value}
          </p>
          <p className="text-[10px] text-ink/40 dark:text-paper/40 mt-0.5">
            {percent}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
          Sentiment Distribution
        </h3>
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink/30 dark:text-paper/30 border border-ink/10 dark:border-paper/10 px-2 py-0.5 font-sans">
          Horizontal
        </span>
      </div>
      
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="1 3" stroke="currentColor" opacity={0.08} />
          <XAxis 
            type="number" 
            stroke="currentColor" 
            opacity={0.3}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif" }}
            axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
          />
          <YAxis 
            type="category" 
            dataKey="name" 
            stroke="currentColor" 
            opacity={0.4}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}
            width={75}
            axisLine={{ stroke: 'currentColor', opacity: 0.15 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }} />
          <Bar 
            dataKey="value" 
            radius={[0, 0, 0, 0]}
            maxBarSize={40}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                opacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentHorizontalBar;
