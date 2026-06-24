import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SentimentAreaChart = ({ trendsData = [] }) => {
  const chartData = trendsData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Positive: item.Positive || item.positive || 0,
    Negative: item.Negative || item.negative || 0,
    Neutral: item.Neutral || item.neutral || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, item) => sum + item.value, 0);
      return (
        <div className="bg-white dark:bg-[#0a0a0a] border border-[#e5e5e5] dark:border-[#222] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-black dark:text-white mb-2">{label}</p>
          {payload.reverse().map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-[#666] dark:text-[#999] font-sans">{item.name}</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: item.color }}>
                {item.value} ({total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
          <div className="border-t border-[#e5e5e5] dark:border-[#222] mt-2 pt-2">
            <span className="text-[10px] text-[#999] dark:text-[#666] uppercase tracking-wider">Total: </span>
            <span className="text-xs font-bold text-black dark:text-white">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-6 mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#222]">
        {payload.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#999] dark:text-[#666] font-sans">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#ccc] dark:text-[#444]">
        <p className="text-sm">No trend data available</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#059669" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.02}/>
            </linearGradient>
            <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#d97706" stopOpacity={0.02}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="1 3" stroke="currentColor" opacity={0.06} />
          <XAxis
            dataKey="date"
            stroke="currentColor"
            opacity={0.3}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.1em' }}
            tickMargin={10}
            axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
            tickLine={false}
          />
          <YAxis
            stroke="currentColor"
            opacity={0.3}
            style={{ fontSize: '10px', fontFamily: "'Inter', sans-serif" }}
            axisLine={{ stroke: 'currentColor', opacity: 0.1 }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey="Positive"
            stackId="1"
            stroke="#059669"
            strokeWidth={1.5}
            fill="url(#colorPositive)"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="Negative"
            stackId="1"
            stroke="#dc2626"
            strokeWidth={1.5}
            fill="url(#colorNegative)"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="Neutral"
            stackId="1"
            stroke="#d97706"
            strokeWidth={1.5}
            fill="url(#colorNeutral)"
            isAnimationActive={true}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentAreaChart;
