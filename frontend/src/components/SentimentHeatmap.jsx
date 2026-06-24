import React from 'react';

const SentimentHeatmap = ({ data = [], loading = false }) => {
  const states = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah',
    'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan'
  ];

  const heatmapData = states.map(state => {
    const stateData = data.find(d => d.state === state) || {};
    const total = stateData.count || 0;
    const score = stateData.avgScore !== undefined ? (stateData.avgScore * 2 - 1) : 0;
    return { state, total, positive: stateData.positive || 0, negative: stateData.negative || 0, neutral: stateData.neutral || 0, score };
  }).sort((a, b) => b.total - a.total);

  const getColor = (score) => {
    if (score > 0.3) return { bg: '#059669', label: 'Very Positive' };
    if (score > 0.1) return { bg: '#10b981', label: 'Positive' };
    if (score > -0.1) return { bg: '#d97706', label: 'Neutral' };
    if (score > -0.3) return { bg: '#ef4444', label: 'Negative' };
    return { bg: '#dc2626', label: 'Very Negative' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Gradient color scale legend */}
      <div className="mb-5 pb-3 border-b border-[#e5e5e5] dark:border-[#222]">
        <div className="flex items-center gap-1">
          <span className="text-[9px] uppercase tracking-[0.12em] text-[#999] dark:text-[#666] font-sans mr-2 shrink-0">Neg</span>
          <div className="flex-1 flex gap-px">
            {['#dc2626', '#ef4444', '#d97706', '#10b981', '#059669'].map((c, i) => (
              <div key={i} className="flex-1 h-2" style={{ backgroundColor: c }}></div>
            ))}
          </div>
          <span className="text-[9px] uppercase tracking-[0.12em] text-[#999] dark:text-[#666] font-sans ml-2 shrink-0">Pos</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-[#e5e5e5] dark:bg-[#222] max-h-[260px] overflow-y-auto custom-scrollbar">
        {heatmapData.map((item) => {
          const color = getColor(item.score);
          return (
            <div
              key={item.state}
              className="p-3 transition-all duration-200 hover:brightness-110 cursor-pointer group relative"
              style={{ backgroundColor: color.bg }}
              title={`${item.state}: ${item.total} articles`}
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.08em] font-medium text-white/80 truncate" style={{ fontVariant: 'small-caps' }}>
                  {item.state}
                </span>
                <span className="font-['Playfair_Display'] text-base font-bold text-white mt-1">
                  {item.total}
                </span>
                <span className="text-[9px] uppercase tracking-[0.1em] font-medium text-white/70 mt-0.5">
                  {color.label}
                </span>
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48">
                <div className="bg-[#111] dark:bg-white text-white dark:text-black text-xs px-3 py-2 border border-[#222] dark:border-[#e5e5e5]">
                  <div className="font-bold mb-1 text-[11px] uppercase tracking-[0.08em]" style={{ fontVariant: 'small-caps' }}>{item.state}</div>
                  <div className="space-y-1 text-[11px] text-[#999] dark:text-[#666]">
                    <div>Sentiment: {color.label}</div>
                    <div>Articles: {item.total}</div>
                    <div>Pos: {item.positive} / Neg: {item.negative} / Neu: {item.neutral}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentimentHeatmap;
