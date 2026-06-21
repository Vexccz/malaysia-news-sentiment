import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SentimentDonutChart = ({ distribution = {}, onSegmentClick, activeFilter }) => {
  const data = [
    { name: 'Positive', value: distribution.positive || 0, color: '#059669' },
    { name: 'Negative', value: distribution.negative || 0, color: '#dc2626' },
    { name: 'Neutral', value: distribution.neutral || 0, color: '#d97706' },
  ].filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      return (
        <div className="bg-paper dark:bg-ink border border-ink/15 dark:border-paper/15 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-1" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-xs text-ink/60 dark:text-paper/60">
            {item.value} articles ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-5 mt-4">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted dark:text-ink-faint font-sans">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Center label showing total
  const renderCenterLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <tspan
          x="50%"
          dy="-0.5em"
          className="fill-ink dark:fill-paper"
          style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700 }}
        >
          {total}
        </tspan>
        <tspan
          x="50%"
          dy="1.8em"
          className="fill-ink/40 dark:fill-paper/40"
          style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.15em' }}
        >
          Total
        </tspan>
      </text>
    );
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-ink/30 dark:text-paper/30">
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="78%"
            paddingAngle={1}
            dataKey="value"
            onClick={(data) => onSegmentClick && onSegmentClick(data.name)}
            cursor="pointer"
            strokeWidth={1}
            stroke="var(--color-paper, #ffffff)"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                opacity={activeFilter && activeFilter !== 'all' && activeFilter !== entry.name ? 0.25 : 1}
                className="transition-opacity duration-200"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
          {renderCenterLabel()}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentDonutChart;
