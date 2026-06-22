import React from 'react';

// Generic skeleton shimmer animation
const shimmer = `relative overflow-hidden before:content-[''] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent`;

// Table skeleton for credibility/history pages
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4 pb-3 border-b border-ink/10 dark:border-paper/10">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={`h-3 bg-ink/5 dark:bg-paper/5 ${shimmer} ${i === 0 ? 'w-32' : 'w-20'}`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} className="flex gap-4 py-3 border-b border-ink/5 dark:border-paper/5">
        {Array.from({ length: cols }).map((_, col) => (
          <div key={col} className={`h-3 bg-ink/5 dark:bg-paper/5 ${shimmer} ${col === 0 ? 'w-32' : 'w-20'}`} />
        ))}
      </div>
    ))}
  </div>
);

// Card skeleton for entity/credibility cards
export const CardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-ink/10 dark:border-paper/10 p-5 space-y-3">
        <div className={`h-4 w-24 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        <div className={`h-3 w-full bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        <div className={`h-3 w-2/3 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        <div className="flex gap-2 mt-4">
          <div className={`h-6 w-16 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
          <div className={`h-6 w-16 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        </div>
      </div>
    ))}
  </div>
);

// Graph skeleton for entity graph
export const GraphSkeleton = () => (
  <div className="border border-ink/10 dark:border-paper/10 p-5 space-y-4">
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-full bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
      <div className={`h-4 w-32 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    </div>
    <div className="flex gap-4 justify-center">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className={`w-10 h-10 rounded-full bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
          <div className={`h-3 w-12 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        </div>
      ))}
    </div>
    <div className="flex justify-center gap-8 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`h-2 w-24 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
      ))}
    </div>
  </div>
);

// Chart skeleton for dashboard charts
export const ChartSkeleton = ({ height = 'h-48' }) => (
  <div className={`border border-ink/10 dark:border-paper/10 p-5 ${height}`}>
    <div className="flex items-center gap-2 mb-4">
      <div className={`h-3 w-3 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
      <div className={`h-3 w-28 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    </div>
    <div className="flex items-end gap-3 h-32 pt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 bg-ink/5 dark:bg-paper/5 ${shimmer}`}
          style={{ height: `${40 + Math.random() * 60}%`, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  </div>
);

// Form skeleton for settings/reports
export const FormSkeleton = ({ fields = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <div className={`h-3 w-20 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        <div className={`h-10 w-full bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
      </div>
    ))}
    <div className={`h-10 w-32 bg-ink/5 dark:bg-paper/5 ${shimmer} mt-6`} />
  </div>
);

// Detail skeleton for article detail
export const DetailSkeleton = () => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className={`h-4 w-24 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    <div className={`h-3 w-48 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    <div className={`h-8 w-3/4 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    <div className="border-t border-ink/10 dark:border-paper/10 my-6" />
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`h-4 w-full bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
    ))}
    <div className="grid grid-cols-2 gap-4 mt-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-ink/10 dark:border-paper/10 p-4 space-y-2">
          <div className={`h-3 w-16 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
          <div className={`h-6 w-24 bg-ink/5 dark:bg-paper/5 ${shimmer}`} />
        </div>
      ))}
    </div>
  </div>
);

export default {
  TableSkeleton,
  CardSkeleton,
  GraphSkeleton,
  ChartSkeleton,
  FormSkeleton,
  DetailSkeleton,
};
