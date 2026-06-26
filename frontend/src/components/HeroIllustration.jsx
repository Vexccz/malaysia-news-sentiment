import React from 'react';
import { motion } from 'framer-motion';

export default function HeroIllustration() {
  return (
    <motion.div
      className="mx-auto mt-10 mb-10 max-w-4xl"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="border border-ink/10 bg-paper p-4 dark:border-paper/10 dark:bg-paper-dark sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint">
          <span>Signal Desk</span>
          <span>Live Editorial Analysis</span>
        </div>

        <svg
          viewBox="0 0 920 420"
          className="h-auto w-full text-ink dark:text-paper"
          role="img"
          aria-label="Editorial illustration showing newspaper analysis, magnifying glass, sentiment signals, and AI insight network"
        >
          <rect x="22" y="22" width="876" height="376" fill="none" stroke="currentColor" strokeOpacity="0.12" />
          <line x1="40" y1="78" x2="880" y2="78" stroke="currentColor" strokeOpacity="0.12" />
          <line x1="40" y1="120" x2="880" y2="120" stroke="currentColor" strokeOpacity="0.08" />
          <line x1="40" y1="162" x2="880" y2="162" stroke="currentColor" strokeOpacity="0.08" />
          <line x1="40" y1="204" x2="880" y2="204" stroke="currentColor" strokeOpacity="0.08" />
          <line x1="40" y1="246" x2="880" y2="246" stroke="currentColor" strokeOpacity="0.08" />
          <line x1="40" y1="288" x2="880" y2="288" stroke="currentColor" strokeOpacity="0.08" />
          <line x1="40" y1="330" x2="880" y2="330" stroke="currentColor" strokeOpacity="0.08" />

          <g>
            <rect x="72" y="108" width="290" height="192" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.75" />
            <rect x="72" y="80" width="290" height="24" fill="currentColor" fillOpacity="0.08" />
            <text x="88" y="97" fontSize="11" letterSpacing="2.4" fill="currentColor" fillOpacity="0.72">MALAYSIA NEWS DESK</text>
            <rect x="92" y="128" width="116" height="62" fill="currentColor" fillOpacity="0.08" />
            <line x1="224" y1="136" x2="336" y2="136" stroke="currentColor" strokeWidth="4" strokeOpacity="0.7" />
            <line x1="224" y1="154" x2="324" y2="154" stroke="currentColor" strokeWidth="4" strokeOpacity="0.38" />
            <line x1="224" y1="172" x2="314" y2="172" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
            <line x1="92" y1="214" x2="336" y2="214" stroke="currentColor" strokeWidth="4" strokeOpacity="0.32" />
            <line x1="92" y1="232" x2="336" y2="232" stroke="currentColor" strokeWidth="4" strokeOpacity="0.24" />
            <line x1="92" y1="250" x2="336" y2="250" stroke="currentColor" strokeWidth="4" strokeOpacity="0.24" />
            <line x1="92" y1="268" x2="280" y2="268" stroke="currentColor" strokeWidth="4" strokeOpacity="0.24" />
          </g>

          <g>
            <circle cx="456" cy="196" r="76" fill="none" stroke="#c00000" strokeWidth="10" />
            <circle cx="456" cy="196" r="52" fill="#c00000" fillOpacity="0.06" stroke="#c00000" strokeOpacity="0.2" />
            <line x1="506" y1="248" x2="564" y2="306" stroke="#c00000" strokeWidth="12" strokeLinecap="square" />
            <line x1="430" y1="196" x2="482" y2="196" stroke="#c00000" strokeWidth="4" strokeLinecap="square" />
            <line x1="456" y1="170" x2="456" y2="222" stroke="#c00000" strokeWidth="4" strokeLinecap="square" />
          </g>

          <g>
            <rect x="628" y="102" width="214" height="200" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.75" />
            <rect x="628" y="80" width="214" height="18" fill="#c00000" fillOpacity="0.85" />
            <text x="646" y="95" fontSize="10" letterSpacing="2.2" fill="#ffffff">SENTIMENT ENGINE</text>

            <line x1="682" y1="152" x2="736" y2="132" stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" />
            <line x1="736" y1="132" x2="786" y2="160" stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" />
            <line x1="682" y1="152" x2="734" y2="194" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" />
            <line x1="734" y1="194" x2="786" y2="160" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" />
            <line x1="734" y1="194" x2="794" y2="228" stroke="currentColor" strokeWidth="2" strokeOpacity="0.35" />
            <line x1="786" y1="160" x2="794" y2="228" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />

            <circle cx="682" cy="152" r="13" fill="#c00000" fillOpacity="0.14" stroke="#c00000" strokeWidth="2" />
            <circle cx="736" cy="132" r="11" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" />
            <circle cx="786" cy="160" r="11" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" />
            <circle cx="734" cy="194" r="14" fill="#c00000" fillOpacity="0.14" stroke="#c00000" strokeWidth="2" />
            <circle cx="794" cy="228" r="10" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.35" />

            <rect x="654" y="256" width="34" height="18" fill="#22c55e" fillOpacity="0.18" stroke="#22c55e" strokeOpacity="0.7" />
            <rect x="694" y="246" width="34" height="28" fill="#f59e0b" fillOpacity="0.18" stroke="#f59e0b" strokeOpacity="0.7" />
            <rect x="734" y="232" width="34" height="42" fill="#c00000" fillOpacity="0.16" stroke="#c00000" strokeOpacity="0.9" />
            <rect x="774" y="252" width="34" height="22" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.22" />
          </g>

          <g>
            <text x="96" y="352" fontSize="10" letterSpacing="2.2" fill="currentColor" fillOpacity="0.5">COLLECT</text>
            <text x="412" y="352" fontSize="10" letterSpacing="2.2" fill="#c00000">ANALYZE</text>
            <text x="698" y="352" fontSize="10" letterSpacing="2.2" fill="currentColor" fillOpacity="0.5">INTERPRET</text>
          </g>
        </svg>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-ink/10 pt-4 text-left dark:border-paper/10 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint">Signal Capture</p>
            <p className="mt-1 text-sm text-ink/80 dark:text-paper/80">News streams, source diversity, and article freshness tracked in one desk.</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent">Sentiment Scan</p>
            <p className="mt-1 text-sm text-ink/80 dark:text-paper/80">Editorial-style analysis surface highlights positive, neutral, and negative shifts fast.</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint">Decision View</p>
            <p className="mt-1 text-sm text-ink/80 dark:text-paper/80">From raw article noise to cleaner signals for students, analysts, and demo reviewers.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
