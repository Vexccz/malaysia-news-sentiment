import React from 'react';

const TopSourcesHorizontal = ({ sourcesData = [] }) => {
  const topSources = sourcesData
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const maxCount = topSources.length > 0 ? topSources[0].total : 1;
  const totalArticles = topSources.reduce((sum, s) => sum + s.total, 0);

  if (topSources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#ccc] dark:text-[#444]">
        <p className="text-sm">No source data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-0 max-h-[320px] overflow-y-auto custom-scrollbar">
        {topSources.map((source, index) => {
          const percentage = ((source.total / totalArticles) * 100).toFixed(1);
          const barWidth = (source.total / maxCount) * 100;

          return (
            <div
              key={source.source || index}
              className={`flex items-center gap-4 px-3 py-3 group transition-colors ${
                index % 2 === 0 ? 'bg-[#f7f7f7] dark:bg-[#111]' : 'bg-transparent'
              }`}
            >
              {/* Rank number */}
              <span className="font-['Playfair_Display'] text-lg font-bold text-[#ccc] dark:text-[#444] w-6 text-right shrink-0">
                {index + 1}
              </span>

              {/* Source info + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[#666] dark:text-[#999] font-sans truncate">
                    {source.source || 'Unknown'}
                  </span>
                  <div className="flex items-baseline gap-2 flex-shrink-0 ml-3">
                    <span className="font-['Playfair_Display'] text-base font-bold text-black dark:text-white">
                      {source.total}
                    </span>
                    <span className="text-[10px] text-[#bbb] dark:text-[#555] font-sans">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="relative h-1 bg-[#e5e5e5] dark:bg-[#222] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#222] dark:bg-[#e5e5e5] transition-all duration-500 group-hover:bg-black dark:group-hover:bg-white"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-[#e5e5e5] dark:border-[#222]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#999] dark:text-[#666] font-sans">
            Total from top {topSources.length} sources
          </span>
          <span className="font-['Playfair_Display'] text-sm font-bold text-black dark:text-white">
            {totalArticles} articles
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopSourcesHorizontal;
