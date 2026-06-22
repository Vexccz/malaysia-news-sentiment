import React from 'react';

const TopSourcesHorizontal = ({ sourcesData = [] }) => {
  // Sort and take top 8 sources
  const topSources = sourcesData
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const maxCount = topSources.length > 0 ? topSources[0].total : 1;
  const totalArticles = topSources.reduce((sum, s) => sum + s.total, 0);

  if (topSources.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-ink/30 dark:text-paper/30">
        <p className="text-sm">No source data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
          Top News Sources
        </h3>
        <span className="text-[10px] uppercase tracking-[0.15em] text-ink/30 dark:text-paper/30 border border-ink/10 dark:border-paper/10 px-2 py-0.5 font-sans">
          Top 8
        </span>
      </div>

      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
        {topSources.map((source, index) => {
          const percentage = ((source.total / totalArticles) * 100).toFixed(1);
          const barWidth = (source.total / maxCount) * 100;

          return (
            <div 
              key={source.source || index} 
              className="group"
            >
              {/* Source name and count */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[11px] text-ink/60 dark:text-paper/60 font-sans truncate">
                    {source.source || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-shrink-0 ml-3">
                  <span className="font-['Playfair_Display'] text-lg font-bold text-ink dark:text-paper">
                    {source.total}
                  </span>
                  <span className="text-[10px] text-ink/40 dark:text-paper/40 font-sans">
                    ({percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress bar - editorial style */}
              <div className="relative h-1.5 bg-ink/5 dark:bg-paper/5 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-ink/40 dark:bg-paper/40 transition-all duration-500 group-hover:bg-ink/60 dark:group-hover:bg-paper/60"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-ink/10 dark:border-paper/10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink/40 dark:text-paper/40 font-sans">
            Total from top {topSources.length} sources
          </span>
          <span className="font-['Playfair_Display'] text-sm font-bold text-ink dark:text-paper">
            {totalArticles} articles
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopSourcesHorizontal;
