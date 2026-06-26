import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarDays, GitCommitHorizontal, Sparkles, ShieldCheck, Languages, MoonStar, Download, Bell, Share2 } from 'lucide-react';

const entries = [
  {
    version: 'v1.9.0',
    date: '26 Jun 2026',
    title: 'Editorial Polish Batch',
    type: 'Major',
    items: [
      { icon: Download, text: 'Export menu added across History, Live Feed, Trending, Heatmap, and Source Credibility pages.' },
      { icon: Languages, text: 'Bahasa Melayu translation coverage completed with 628/628 key parity.' },
      { icon: MoonStar, text: 'Dark mode refined with muted sentiment colors, card elevation tiers, and scrollbar polish.' },
      { icon: Bell, text: 'Notifications dropdown added with unread badge and reply event hooks.' },
      { icon: Share2, text: 'Dynamic social preview images now generated for shared article pages.' },
    ],
  },
  {
    version: 'v1.8.0',
    date: '24 Jun 2026',
    title: 'Community & Collaboration Upgrade',
    type: 'Feature',
    items: [
      { icon: Sparkles, text: 'Discussion of the Day, Hot Takes leaderboard, article discussions, reply threads, and anonymous commenting.' },
      { icon: ShieldCheck, text: 'User badges, comment sentiment tagging, and profile-linked participation metrics.' },
    ],
  },
  {
    version: 'v1.7.0',
    date: '22 Jun 2026',
    title: 'Editorial Redesign Rollout',
    type: 'UI',
    items: [
      { icon: Sparkles, text: '17 sidebar pages aligned to newspaper editorial design with sharp borders and serif hierarchy.' },
      { icon: GitCommitHorizontal, text: 'Landing page upgraded with ticker, map preview, clearer feature layout, and anti-generic cleanup.' },
    ],
  },
];

const typeClass = {
  Major: 'text-red-700 border-red-700/20 bg-red-50 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/20',
  Feature: 'text-emerald-700 border-emerald-700/20 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20',
  UI: 'text-amber-700 border-amber-700/20 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#f5f1e8]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#6b665e] dark:text-[#a8a29a] hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="mt-8 border-y border-[#1a1a1a]/10 dark:border-[#f5f1e8]/10 py-10">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#6b665e] dark:text-[#a8a29a] mb-3">Release Notes</p>
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl font-bold leading-tight">Product Changelog</h1>
          <p className="mt-4 max-w-2xl text-sm md:text-base text-[#5e5a54] dark:text-[#b8b2aa] leading-relaxed">
            Feature drops, UI polish, backend upgrades, and bug fixes for Malaysia News Sentiment.
            Clean log, no marketing fluff. Finally something useful.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {entries.map((entry, idx) => (
            <section key={entry.version} className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-6">
              <aside className="lg:sticky lg:top-24 h-fit border-l-[3px] border-accent pl-4">
                <p className="font-['Playfair_Display'] text-2xl font-bold">{entry.version}</p>
                <div className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#6b665e] dark:text-[#a8a29a]">
                  <CalendarDays className="w-3.5 h-3.5" /> {entry.date}
                </div>
                <span className={`mt-3 inline-flex px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] border ${typeClass[entry.type]}`}>
                  {entry.type}
                </span>
              </aside>

              <div className={`border border-[#1a1a1a]/10 dark:border-[#f5f1e8]/10 ${idx > 0 ? 'border-t-0 lg:border-t' : ''}`}>
                <div className="px-6 py-5 border-b border-[#1a1a1a]/10 dark:border-[#f5f1e8]/10 bg-[#faf8f3] dark:bg-[#111]">
                  <h2 className="font-['Playfair_Display'] text-2xl font-bold">{entry.title}</h2>
                </div>
                <div className="divide-y divide-[#1a1a1a]/10 dark:divide-[#f5f1e8]/10">
                  {entry.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="px-6 py-5 flex gap-4 items-start">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center border border-[#1a1a1a]/10 dark:border-[#f5f1e8]/10 bg-white dark:bg-[#151515] text-accent">
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-sm leading-relaxed text-[#4f4b45] dark:text-[#c2bdb5]">{item.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
