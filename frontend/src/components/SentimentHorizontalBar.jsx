import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SentimentHorizontalBar = ({ distribution = {} }) => {
  const data = [
    { name: 'Positive', value: distribution.positive || 0, color: '#059669' },
    { name: 'Negative', value: distribution.negative || 0, color: '#dc2626' },
    { name: 'Neutral', value: distribution.neutral || 0, color: '#d97706' },
  ].sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const total = distribution.positive + distribution.negative + distribution.neutral;
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: item.payload.color }}>
            {item.payload.name}
          </p>
          <p className="font-['Playfair_Display'] text-lg font-bold text-black dark:text-white">
            {item.value}
          </p>
          <p className="text-[10px] text-[#999] dark:text-[#666] mt-0.5">
            {percent}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="1 3" stroke="currentColor" opacity={0.06} horizontal={false} />
          <XAxis
            type="number"
            stroke="currentColor"
            opacity={0.25}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="currentColor"
            opacity={0.5}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}
            width={75}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
          <Bar
            dataKey="value"
            radius={[0, 0, 0, 0]}
            maxBarSize={32}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Alternating row labels beneath for editorial feel */}
      <div className="mt-2 space-y-0">
        {data.map((entry, index) => {
          const total = distribution.positive + distribution.negative + distribution.neutral;
          const percent = total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0;
          return (
            <div
              key={entry.name}
              className={`flex items-center justify-between px-3 py-2 ${
                index % 2 === 0 ? 'bg-[#f7f7f7] dark:bg-[#111]' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 inline-block" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#999] dark:text-[#666] font-sans">
                  {entry.name}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-['Playfair_Display'] text-sm font-bold text-black dark:text-white">
                  {entry.value}
                </span>
                <span className="text-[10px] text-[#bbb] dark:text-[#555]">{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentimentHorizontalBar;
