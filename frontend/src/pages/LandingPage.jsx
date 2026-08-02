import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
const Motion = motion;
import {
  ArrowRight, BarChart3, Brain, Check, ChevronRight, CircleDot,
  FileDown, Globe2, LineChart, Menu, Moon, Network, Newspaper,
  Play, Search, ShieldCheck, Sparkles, Sun, TrendingDown, TrendingUp, X, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import malaysiaStates from '../data/malaysiaMap';

const EASE = [0.16, 1, 0.3, 1];
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const pulseTopics = [
  { topic: 'Ringgit', score: 32, direction: 'up', spark: [24, 31, 28, 38, 42, 48, 56] },
  { topic: 'Cost of Living', score: -21, direction: 'down', spark: [55, 48, 51, 39, 33, 36, 27] },
  { topic: 'AI Malaysia', score: 46, direction: 'up', spark: [18, 24, 31, 29, 44, 52, 68] },
  { topic: 'Public Transport', score: 14, direction: 'up', spark: [31, 35, 32, 39, 42, 46, 49] },
];

const sourceStories = [
  { source: 'BERNAMA', tone: 'POSITIVE', score: '+72', headline: 'New measures strengthen Malaysia’s economic outlook', mark: 'strengthen', color: '#16855b' },
  { source: 'THE STAR', tone: 'NEUTRAL', score: '+08', headline: 'Government announces revised economic measures', mark: 'revised', color: '#a36b13' },
  { source: 'MALAYSIAKINI', tone: 'NEGATIVE', score: '−41', headline: 'Fresh concerns emerge over economic policy impact', mark: 'concerns', color: '#c72f35' },
];

const tickerItems = [
  ['RINGGIT', '+32', 'up'], ['COST OF LIVING', '−21', 'down'],
  ['AI MALAYSIA', '+46', 'up'], ['PUBLIC TRANSPORT', '+14', 'up'],
  ['ECONOMY', '+18', 'up'], ['POLICY', '−06', 'down'],
];

const SignalTicker = () => (
  <div className="relative overflow-hidden border-y border-ink/15 dark:border-paper/15 bg-paper-card dark:bg-paper-dark-card" aria-label="Live sentiment signals">
    <div className="absolute left-0 inset-y-0 z-10 flex items-center px-4 sm:px-6 bg-accent text-white text-[9px] font-bold tracking-[.2em]">LIVE</div>
    <Motion.div className="flex w-max py-3 pl-24" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
      {[...tickerItems, ...tickerItems].map(([topic, score, direction], i) => (
        <span key={`${topic}-${i}`} className="flex items-center gap-3 px-6 sm:px-10 border-r border-ink/15 dark:border-paper/15 text-[10px] tracking-[.16em] whitespace-nowrap">
          <span className="font-bold">{topic}</span>
          <span className={direction === 'up' ? 'text-[#16855b]' : 'text-accent'}>{score} {direction === 'up' ? '↑' : '↓'}</span>
        </span>
      ))}
    </Motion.div>
  </div>
);

const sectionHead = (eyebrow, title, copy) => (
  <div className="mb-10 md:mb-14">
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px w-10 bg-accent" />
      <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-semibold">{eyebrow}</p>
    </div>
    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink dark:text-paper leading-tight max-w-3xl">{title}</h2>
    {copy && <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-ink-muted dark:text-ink-faint">{copy}</p>}
  </div>
);

const AnimatedSection = ({ children, className = '', id }) => (
  <Motion.section id={id} className={className} initial="visible" animate="visible" variants={stagger}>
    {children}
  </Motion.section>
);

const Sparkline = ({ values, positive = true, className = '' }) => {
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - Math.min(...values)) / Math.max(1, Math.max(...values) - Math.min(...values))) * 30}`).join(' ');
  return (
    <svg viewBox="0 0 100 40" className={className} preserveAspectRatio="none" aria-hidden="true">
      <Motion.polyline points={points} fill="none" stroke={positive ? '#16855b' : '#c72f35'} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, ease: EASE }} />
    </svg>
  );
};

const MalaysiaSignalMap = () => {
  const project = ([longitude, latitude]) => [
    (longitude - 99) * 23.2,
    (7.6 - latitude) * 22.5,
  ];
  const statePath = (polygons) => polygons.map((polygon) => {
    const points = polygon.map(project);
    return `M${points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}Z`;
  }).join(' ');
  const peninsulaStates = malaysiaStates.filter((state) => !['Sabah', 'Sarawak', 'W.P. Labuan'].includes(state.name));
  const eastStates = malaysiaStates.filter((state) => ['Sabah', 'Sarawak', 'W.P. Labuan'].includes(state.name));
  const nodes = [
    { name: 'Kuala Lumpur', x: 87, y: 89, signal: '+24', color: '#16855b' },
    { name: 'Penang', x: 43, y: 37, signal: '+11', color: '#16855b' },
    { name: 'Johor', x: 154, y: 139, signal: '−08', color: '#c72f35' },
    { name: 'Kuching', x: 282, y: 126, signal: '+17', color: '#16855b' },
    { name: 'Kota Kinabalu', x: 428, y: 59, signal: '+06', color: '#b8862b' },
  ];
  return (
    <div className="relative mt-5 border-t border-ink/10 dark:border-paper/10 pt-4">
      <div className="flex justify-between items-center mb-1 text-[8px] uppercase tracking-[.18em] text-ink-faint">
        <span>Regional signal map</span><span>5 live nodes</span>
      </div>
      <svg viewBox="0 0 500 160" className="w-full h-[130px] sm:h-[145px] overflow-visible" role="img" aria-label="Animated Malaysia regional sentiment map">
        <defs>
          <linearGradient id="malaysia-map-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#16855b" stopOpacity=".17" />
            <stop offset=".55" stopColor="#b8862b" stopOpacity=".11" />
            <stop offset="1" stopColor="#c72f35" stopOpacity=".15" />
          </linearGradient>
          <filter id="node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <g transform="translate(0,-22) scale(1.4)">
          {peninsulaStates.map((state, i) => <Motion.path key={state.name} d={statePath(state.polygons)} fill={i % 5 === 0 ? '#c72f3524' : i % 3 === 0 ? '#b8862b20' : '#16855b20'} stroke="currentColor" strokeOpacity=".55" strokeWidth=".65" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.1, delay: i * .035, ease: EASE }} />)}
        </g>
        <g transform="translate(0,-7) scale(1.04)">
          {eastStates.map((state, i) => <Motion.path key={state.name} d={statePath(state.polygons)} fill={i % 2 ? '#16855b20' : '#b8862b20'} stroke="currentColor" strokeOpacity=".55" strokeWidth=".85" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, delay: .25 + i * .06, ease: EASE }} />)}
        </g>
        <path d="M87 89 Q180 35 282 126 M87 89 Q270 138 428 59" fill="none" stroke="#c72f35" strokeOpacity=".22" strokeWidth="1" strokeDasharray="4 5" />
        <Motion.path d="M87 89 Q180 35 282 126" fill="none" stroke="#c72f35" strokeOpacity=".65" strokeWidth="1.4" strokeDasharray="7 80" animate={{ strokeDashoffset: [0, -87] }} transition={{ duration: 2.7, repeat: Infinity, ease: 'linear' }} />
        <Motion.path d="M87 89 Q270 138 428 59" fill="none" stroke="#16855b" strokeOpacity=".65" strokeWidth="1.4" strokeDasharray="7 100" animate={{ strokeDashoffset: [0, -107] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }} />
        {nodes.map((node, i) => (
          <g key={node.name} className="group cursor-default">
            <Motion.circle cx={node.x} cy={node.y} r="8" fill={node.color} opacity=".12" animate={{ r: [6, 13, 6], opacity: [.22, 0, .22] }} transition={{ duration: 2.4, delay: i * .35, repeat: Infinity }} />
            <circle cx={node.x} cy={node.y} r="3.3" fill={node.color} filter="url(#node-glow)" />
            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
              <rect x={node.x - 31} y={node.y - 25} width="62" height="16" rx="1" fill="#1A1A1A" />
              <text x={node.x} y={node.y - 14} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">{node.name} · {node.signal}</text>
            </g>
          </g>
        ))}
        <text x="45" y="157" fill="currentColor" opacity=".45" fontSize="7" letterSpacing="1.4">SEMENANJUNG</text>
        <text x="365" y="148" fill="currentColor" opacity=".45" fontSize="7" letterSpacing="1.4">SABAH · SARAWAK</text>
      </svg>
    </div>
  );
};

const Navbar = ({ isDark, toggleTheme, navigate }) => {
  const [open, setOpen] = useState(false);
  const links = [['Pulse', '#pulse'], ['Analyzer', '#analyzer'], ['Narratives', '#narratives'], ['Features', '#features']];
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-ink/15 dark:border-paper/15 bg-paper/90 dark:bg-paper-dark/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto h-16 px-5 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-display font-bold text-lg text-ink dark:text-paper">MY News <i className="text-accent">Sentiment</i></span>
          <span className="hidden lg:inline text-[9px] tracking-[.2em] text-ink-faint">EST. 2026</span>
        </Link>
        <div className="hidden md:flex items-center gap-7">
          {links.map(([label, href]) => <a key={href} href={href} className="text-[11px] tracking-[.16em] uppercase text-ink-muted dark:text-ink-faint hover:text-accent">{label}</a>)}
          <Link to="/about" className="text-[11px] tracking-[.16em] uppercase text-ink-muted dark:text-ink-faint hover:text-accent">About</Link>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-2 hover:bg-ink/5 dark:hover:bg-paper/10" aria-label="Toggle theme">{isDark ? <Sun className="w-4 h-4 text-paper" /> : <Moon className="w-4 h-4" />}</button>
          <Link to="/login" className="hidden sm:block text-xs font-semibold px-3">Log in</Link>
          <button onClick={() => navigate('/dashboard')} className="hidden sm:flex items-center gap-2 bg-ink dark:bg-paper text-paper dark:text-ink px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-accent dark:hover:bg-accent dark:hover:text-paper">Open dashboard <ArrowRight className="w-3.5 h-3.5" /></button>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>
      <AnimatePresence>{open && <Motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="md:hidden overflow-hidden border-t border-ink/10 dark:border-paper/10 bg-paper dark:bg-paper-dark"><div className="px-6 py-4 flex flex-col">{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="py-3 text-sm uppercase tracking-wider">{label}</a>)}<button onClick={() => navigate('/dashboard')} className="mt-3 py-3 bg-ink text-paper dark:bg-paper dark:text-ink font-bold text-xs uppercase">Open dashboard</button></div></Motion.div>}</AnimatePresence>
    </nav>
  );
};

const MalaysiaPulse = ({ articleCount }) => {
  const [active, setActive] = useState(0);
  useEffect(() => { const timer = setInterval(() => setActive(v => (v + 1) % pulseTopics.length), 2600); return () => clearInterval(timer); }, []);
  return (
    <Motion.div id="pulse" variants={fadeUp} whileHover={{ y: -4 }} transition={{ duration: .35, ease: EASE }} className="relative text-left border border-ink/20 dark:border-paper/20 bg-paper-card dark:bg-paper-dark-card shadow-[10px_10px_0_rgba(199,47,53,.12)] overflow-hidden">
      <Motion.div className="absolute inset-x-0 h-16 pointer-events-none z-10 bg-gradient-to-b from-transparent via-accent/[.08] to-transparent" animate={{ y: [-70, 470] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }} />
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink/15 dark:border-paper/15 bg-ink/[.025] dark:bg-paper/[.025]">
        <div className="flex items-center gap-2"><Motion.span animate={{ opacity: [1,.3,1] }} transition={{ repeat: Infinity, duration: 1.4 }} className="w-2 h-2 rounded-full bg-accent"/><span className="text-[10px] font-bold tracking-[.22em]">MALAYSIA PULSE · LIVE PREVIEW</span></div>
        <span className="text-[9px] text-ink-faint uppercase tracking-widest">KUL · MYT</span>
      </div>
      <div className="grid md:grid-cols-[.9fr_1.1fr]">
        <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-ink/15 dark:border-paper/15">
          <p className="text-[10px] tracking-[.2em] text-ink-muted dark:text-ink-faint uppercase">Overall media signal</p>
          <div className="flex items-end gap-3 mt-3"><span className="font-display text-6xl font-bold text-ink dark:text-paper">+18</span><span className="mb-2 px-2 py-1 bg-[#16855b] text-white text-[10px] font-bold tracking-wider">POSITIVE</span></div>
          <div className="h-2 mt-6 flex overflow-hidden"><Motion.div initial={{ width: 0 }} whileInView={{ width: '46%' }} className="bg-[#16855b]"/><Motion.div initial={{ width: 0 }} whileInView={{ width: '34%' }} className="bg-[#b8862b]"/><Motion.div initial={{ width: 0 }} whileInView={{ width: '20%' }} className="bg-accent"/></div>
          <div className="flex justify-between mt-2 text-[9px] tracking-wider text-ink-faint"><span>46% POS</span><span>34% NEU</span><span>20% NEG</span></div>
          <MalaysiaSignalMap />
        </div>
        <div>
          <div className="px-5 py-3 border-b border-ink/10 dark:border-paper/10 flex justify-between text-[9px] uppercase tracking-[.18em] text-ink-faint"><span>Trending now</span><span>Signal</span></div>
          {pulseTopics.map((item, i) => (
            <Motion.button layout key={item.topic} onClick={() => setActive(i)} animate={{ x: active === i ? 4 : 0 }} className={`relative w-full grid grid-cols-[30px_1fr_70px_50px] items-center gap-2 px-5 py-3.5 text-left border-b border-ink/[.07] dark:border-paper/[.07] transition-colors ${active === i ? 'bg-accent/[.06]' : 'hover:bg-ink/[.025] dark:hover:bg-paper/[.025]'}`}>
              {active === i && <Motion.span layoutId="pulse-active" className="absolute left-0 inset-y-0 w-0.5 bg-accent" />}
              <span className="font-display text-xs text-ink-faint">{String(i+1).padStart(2,'0')}</span><span className="text-sm font-semibold">{item.topic}</span><Sparkline values={item.spark} positive={item.score > 0} className="w-full h-7"/><span className={`text-right text-xs font-bold ${item.score > 0 ? 'text-[#16855b]' : 'text-accent'}`}>{item.score > 0 ? '+' : ''}{item.score}</span>
            </Motion.button>
          ))}
          <div className="px-5 py-3 text-[9px] uppercase tracking-widest text-ink-faint flex justify-between"><span>{articleCount.toLocaleString()} indexed articles</span><span>15 sources</span></div>
        </div>
      </div>
    </Motion.div>
  );
};

const analyzeHeadline = (text) => {
  const positive = ['growth','grows','gain','gains','strong','strengthen','record','improve','success','surge','boost','rise','rises','win','wins','recovery','investment','stable','advance'];
  const negative = ['fall','falls','weak','weakens','crisis','concern','concerns','risk','risks','flood','loss','losses','decline','pressure','uncertainty','unemployment','displace','cut','cuts','drop'];
  const entities = ['Malaysia','Ringgit','Anwar','BNM','Petronas','Parliament','ASEAN','Kuala Lumpur','Sabah','Sarawak','Johor','Selangor'].filter(e => text.toLowerCase().includes(e.toLowerCase()));
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const pos = words.filter(w => positive.includes(w)); const neg = words.filter(w => negative.includes(w));
  const raw = pos.length - neg.length;
  const sentiment = raw > 0 ? 'POSITIVE' : raw < 0 ? 'NEGATIVE' : 'NEUTRAL';
  const confidence = Math.min(94, 58 + Math.abs(raw) * 11 + Math.min(text.length, 70) / 8);
  return { sentiment, confidence: Math.round(confidence), entities: entities.length ? entities : ['Malaysia News'], cues: [...pos, ...neg], raw };
};

const HeadlineAnalyzer = () => {
  const examples = ["Ringgit gains as Malaysia records stronger investment growth", "Floods displace residents amid worsening weather concerns", "BNM holds overnight policy rate steady"];
  const [text, setText] = useState(examples[0]); const [loading, setLoading] = useState(false); const [result, setResult] = useState(() => analyzeHeadline(examples[0]));
  const run = () => { if (!text.trim()) return; setLoading(true); setResult(null); setTimeout(() => { setResult(analyzeHeadline(text)); setLoading(false); }, 700); };
  const color = result?.sentiment === 'POSITIVE' ? '#16855b' : result?.sentiment === 'NEGATIVE' ? '#c72f35' : '#a36b13';
  return (
    <div className="grid lg:grid-cols-[1.1fr_.9fr] border border-ink/20 dark:border-paper/20 bg-paper-card dark:bg-paper-dark-card">
      <div className="p-6 sm:p-9 lg:border-r border-ink/15 dark:border-paper/15">
        <label className="text-[10px] uppercase tracking-[.22em] font-bold">Paste a Malaysian news headline</label>
        <textarea value={text} maxLength={180} onChange={e => setText(e.target.value)} className="mt-4 w-full min-h-32 resize-none bg-transparent border-b-2 border-ink dark:border-paper p-0 pb-4 font-display text-2xl sm:text-3xl leading-snug outline-none focus:border-accent" />
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5"><span className="text-[10px] text-ink-faint">{text.length}/180 · INSTANT LEXICAL PREVIEW</span><button onClick={run} disabled={!text.trim() || loading} className="px-6 py-3 bg-ink dark:bg-paper text-paper dark:text-ink text-xs font-bold tracking-[.15em] uppercase disabled:opacity-40 hover:bg-accent dark:hover:bg-accent dark:hover:text-paper">{loading ? 'Analyzing…' : 'Analyze now'} <Zap className="inline w-3.5 h-3.5 ml-1" /></button></div>
        <div className="flex gap-2 flex-wrap mt-6">{examples.map((e,i)=><button key={e} onClick={()=>{setText(e);setResult(analyzeHeadline(e));}} className="text-[9px] uppercase tracking-wider border border-ink/15 dark:border-paper/15 px-2.5 py-1.5 hover:border-accent">Example {i+1}</button>)}</div>
      </div>
      <div className="p-6 sm:p-9 min-h-72 flex flex-col justify-center">
        <AnimatePresence mode="wait">{loading ? <Motion.div key="load" exit={{opacity:0}} className="space-y-4"><Motion.div animate={{x:['-100%','250%']}} transition={{repeat:Infinity,duration:1}} className="h-1 w-1/3 bg-accent"/><p className="font-display text-2xl italic">Reading narrative signals…</p></Motion.div> : result && <Motion.div key={text+result.sentiment} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}}>
          <p className="text-[10px] uppercase tracking-[.22em] text-ink-faint">Analysis result</p><div className="flex items-end gap-3 mt-3"><span className="font-display text-4xl font-bold" style={{color}}>{result.sentiment}</span><span className="mb-1 text-xs font-bold">{result.confidence}% confidence</span></div>
          <div className="h-2 bg-ink/5 dark:bg-paper/10 mt-5"><Motion.div initial={{width:0}} animate={{width:`${result.confidence}%`}} className="h-full" style={{backgroundColor:color}}/></div>
          <div className="mt-7 grid grid-cols-2 gap-5"><div><p className="text-[9px] uppercase tracking-widest text-ink-faint">Detected entities</p><p className="mt-2 text-sm font-semibold">{result.entities.join(' · ')}</p></div><div><p className="text-[9px] uppercase tracking-widest text-ink-faint">Tone cues</p><p className="mt-2 text-sm font-semibold">{result.cues.length ? result.cues.join(' · ') : 'Factual · balanced'}</p></div></div>
        </Motion.div>}</AnimatePresence>
      </div>
    </div>
  );
};

const FeaturePreview = ({ type }) => {
  if (type === 0) return <div className="space-y-2">{[['Positive',64,'bg-[#16855b]'],['Neutral',23,'bg-[#b8862b]'],['Negative',13,'bg-accent']].map(x=><div key={x[0]} className="grid grid-cols-[55px_1fr_25px] items-center gap-2 text-[9px]"><span>{x[0]}</span><div className="h-1.5 bg-ink/5 dark:bg-paper/10"><Motion.div whileInView={{width:`${x[1]}%`}} initial={{width:0}} className={`h-full ${x[2]}`}/></div><b>{x[1]}</b></div>)}</div>;
  if (type === 1) return <div className="relative h-16"><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-accent text-white text-[9px]">ANWAR</span>{['BNM','RINGGIT','ASEAN'].map((x,i)=><Motion.span key={x} animate={{y:[0,-3,0]}} transition={{delay:i*.2,repeat:Infinity,duration:2}} className={`absolute px-2 py-1 border border-ink/20 dark:border-paper/20 text-[8px] ${i===0?'left-0 top-0':i===1?'right-0 top-1':'left-5 bottom-0'}`}>{x}</Motion.span>)}</div>;
  if (type === 2) return <div>{['Ringgit','SST','AI Malaysia'].map((x,i)=><div key={x} className="flex justify-between py-1.5 border-b border-ink/10 dark:border-paper/10 text-[10px]"><span>0{i+1} · {x}</span><b className="text-[#16855b]">+{46-i*9}% ↑</b></div>)}</div>;
  if (type === 3) return <div className="space-y-2">{[['BERNAMA',91],['THE STAR',83],['FMT',72]].map(([label,score])=><div key={label} className="grid grid-cols-[55px_1fr_20px] items-center gap-2 text-[8px]"><span>{label}</span><div className="h-1.5 bg-ink/5 dark:bg-paper/10"><Motion.div initial={{width:0}} whileInView={{width:`${score}%`}} className="h-full bg-accent"/></div><b>{score}</b></div>)}</div>;
  if (type === 4) return <p className="font-display italic text-sm leading-6">“Economic coverage is improving, led by investment narratives while cost-of-living risk remains elevated.”</p>;
  return <div className="relative h-16"><div className="absolute left-4 top-2 w-24 h-14 bg-paper dark:bg-paper-dark border border-ink/20 dark:border-paper/20 rotate-[-5deg]"/><div className="absolute left-9 top-0 w-24 h-14 bg-paper dark:bg-paper-dark border-2 border-ink dark:border-paper p-2"><span className="text-[8px] font-bold">MY REPORT.PDF</span><div className="h-1 bg-accent mt-3"/><div className="h-1 bg-ink/10 mt-1"/></div></div>;
};

const Footer = () => <footer className="border-t-2 border-ink dark:border-paper"><div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between gap-8"><div><p className="font-display text-xl font-bold">MY News <i className="text-accent">Sentiment</i></p><p className="text-xs text-ink-faint mt-2">Malaysia’s media intelligence layer.</p></div><div className="flex flex-wrap gap-6 text-xs uppercase tracking-wider"><Link to="/features">Features</Link><Link to="/api-docs">API</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/privacy">Privacy</Link></div></div></footer>;

const LandingPage = () => {
  const { user } = useAuth(); const navigate = useNavigate(); const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [articleCount,setArticleCount] = useState(11000); const [statsLive,setStatsLive] = useState(false);
  const { scrollYProgress } = useScroll(); const progress = useTransform(scrollYProgress,[0,1],[0,1]);
  useEffect(()=>{fetch('https://mynewsa-api.onrender.com/api/history/public-stats').then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(d.totalArticles){setArticleCount(d.totalArticles);setStatsLive(true)}}).catch(()=>{});},[]);
  if (user) return <Navigate to="/dashboard" replace />;
  const features = [
    [BarChart3,'Sentiment Analysis','See polarity, confidence and narrative momentum—not only a label.'],[Network,'Entity Graph','Reveal links between people, institutions, companies and places.'],[TrendingUp,'Trending Topics','Watch local narratives rise or fall before they dominate the cycle.'],[ShieldCheck,'Source Credibility','Compare reliability and framing patterns across Malaysian publishers.'],[Brain,'AI Insights','Turn thousands of articles into a concise strategic intelligence brief.'],[FileDown,'Export Reports','Ship board-ready PDF, PowerPoint and structured data reports.']
  ];
  const roles = [['01','Researchers','Track longitudinal sentiment','Compare political and economic narratives across time.'],['02','Journalists','Compare media framing','See how the same event changes between publishers.'],['03','Analysts','Detect momentum early','Monitor market, brand and policy signals in real time.'],['04','Policy Makers','Read the public narrative','Measure coverage around initiatives and announcements.'],['05','PR & Comms','Spot reputation risk','Track crisis tone before it escalates across outlets.'],['06','Students','Learn with local data','Explore practical NLP using Malaysian news context.']];
  return <div className="min-h-screen bg-paper dark:bg-paper-dark text-ink dark:text-paper overflow-x-hidden">
    <Motion.div className="fixed top-0 inset-x-0 h-[3px] bg-accent z-[60] origin-left" style={{scaleX:progress}}/>
    <Navbar isDark={isDark} toggleTheme={()=>setTheme(isDark?'light':'dark')} navigate={navigate}/>

    <header className="relative pt-28 sm:pt-32 pb-20 px-5 sm:px-6 overflow-hidden">
      <Motion.div className="absolute -top-48 -left-48 w-[34rem] h-[34rem] rounded-full bg-accent/[.08] blur-3xl pointer-events-none" animate={{ x: [0, 90, 0], y: [0, 55, 0], scale: [1, 1.16, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      <Motion.div className="absolute -bottom-64 right-[-8rem] w-[38rem] h-[38rem] rounded-full bg-[#16855b]/[.06] blur-3xl pointer-events-none" animate={{ x: [0, -70, 0], y: [0, -40, 0], scale: [1.1, .94, 1.1] }} transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }} />
      <Motion.div className="absolute inset-0 pointer-events-none opacity-[.045] dark:opacity-[.07]" animate={{ backgroundPosition: ['0px 0px', '38px 38px'] }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }} style={{backgroundImage:'linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)',backgroundSize:'38px 38px'}}/>
      <Motion.div initial="hidden" animate="visible" variants={stagger} className="relative max-w-7xl mx-auto">
        <Motion.div variants={fadeUp} className="flex items-center justify-between border-y border-ink/20 dark:border-paper/20 py-2 mb-10 text-[9px] sm:text-[10px] tracking-[.2em] text-ink-muted dark:text-ink-faint"><span>VOL. I · NO. 01</span><span>KUALA LUMPUR · MALAYSIA</span><span className="hidden sm:block">AI MEDIA INTELLIGENCE</span></Motion.div>
        <div className="grid lg:grid-cols-[.86fr_1.14fr] gap-12 lg:gap-16 items-center">
          <div>
            <Motion.p variants={fadeUp} className="text-[10px] uppercase tracking-[.24em] text-accent font-bold mb-5">The national narrative, decoded</Motion.p>
            <Motion.h1 variants={fadeUp} className="font-display text-5xl sm:text-6xl xl:text-7xl font-bold leading-[.98] tracking-tight">Know what Malaysia is <i className="text-accent">feeling.</i><br/>Before it shifts.</Motion.h1>
            <Motion.p variants={fadeUp} className="mt-7 max-w-xl text-base sm:text-lg leading-8 text-ink-muted dark:text-ink-faint font-serif">Real-time AI intelligence across Malaysian news—sentiment, source framing, entities and emerging narratives in one editorial command centre.</Motion.p>
            <Motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3"><Motion.button whileHover="hover" whileTap={{scale:.97}} onClick={()=>navigate('/dashboard')} className="group whitespace-nowrap px-5 py-3.5 bg-ink dark:bg-paper text-paper dark:text-ink text-[11px] font-bold tracking-[.1em] uppercase hover:bg-accent dark:hover:bg-accent dark:hover:text-paper">Explore live dashboard <Motion.span variants={{hover:{x:5}}} className="inline-block"><ArrowRight className="inline w-4 h-4 ml-1"/></Motion.span></Motion.button><Motion.a whileHover={{y:-2}} href="#analyzer" className="whitespace-nowrap px-5 py-3.5 border-2 border-ink dark:border-paper text-[11px] font-bold tracking-[.1em] uppercase text-center hover:border-accent hover:text-accent">Analyze a headline <Motion.span animate={{rotate:[0,8,-8,0]}} transition={{duration:2.5,repeat:Infinity,repeatDelay:1.5}} className="inline-block"><Sparkles className="inline w-4 h-4 ml-1"/></Motion.span></Motion.a></Motion.div>
            <Motion.p variants={fadeUp} className="mt-4 text-[10px] uppercase tracking-widest text-ink-faint"><Check className="inline w-3 h-3 text-[#16855b] mr-1"/> No account required to explore</Motion.p>
          </div>
          <MalaysiaPulse articleCount={articleCount}/>
        </div>
      </Motion.div>
    </header>

    <SignalTicker />

    <section className="border-y border-ink/15 dark:border-paper/15 bg-ink dark:bg-paper text-paper dark:text-ink"><div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 divide-x divide-paper/15 dark:divide-ink/15">
      {[[articleCount,'ARTICLES INDEXED'],[15,'NEWS SOURCES'],[92,'MODEL ACCURACY'],['24/7','MEDIA MONITORING']].map(([n,l],i)=><Motion.div whileHover={{y:-4,backgroundColor:'rgba(199,47,53,.12)'}} transition={{duration:.25}} key={l} className="p-5 sm:p-7"><p className="font-display text-2xl sm:text-4xl font-bold">{typeof n==='number'?n.toLocaleString():n}{i===0?'+':i===2?'%':''}</p><p className="text-[8px] sm:text-[9px] tracking-[.18em] opacity-60 mt-1">{l}</p>{i===0&&<p className="text-[8px] mt-2 text-[#75d6ad]">● {statsLive?'LIVE DATABASE':'VERIFIED BASELINE'}</p>}</Motion.div>)}
    </div></section>

    <AnimatedSection id="analyzer" className="max-w-7xl mx-auto px-5 sm:px-6 py-20 sm:py-28"><Motion.div variants={fadeUp}>{sectionHead('01 / Try the intelligence','Put any headline under the lens.','Test how language changes a story’s emotional signal. The full dashboard adds transformer analysis, summaries and entity context.')}</Motion.div><Motion.div variants={fadeUp}><HeadlineAnalyzer/></Motion.div></AnimatedSection>

    <AnimatedSection id="narratives" className="border-y border-ink/15 dark:border-paper/15 py-20 sm:py-28 px-5 sm:px-6 bg-ink/[.025] dark:bg-paper/[.025]"><div className="max-w-7xl mx-auto"><Motion.div variants={fadeUp}>{sectionHead('02 / Narrative comparison','One story. Three narratives.','Sentiment is not only what happened—it is how each newsroom frames what happened.')}</Motion.div><div className="grid lg:grid-cols-3 border-t border-l border-ink/20 dark:border-paper/20">{sourceStories.map((s)=><Motion.article variants={fadeUp} whileHover={{y:-7,boxShadow:'0 14px 0 rgba(199,47,53,.10)'}} transition={{duration:.3,ease:EASE}} key={s.source} className="p-6 sm:p-8 min-h-72 border-r border-b border-ink/20 dark:border-paper/20 group hover:bg-paper dark:hover:bg-paper-dark transition-colors"><div className="flex justify-between items-center"><span className="text-[10px] font-bold tracking-[.2em]">{s.source}</span><span className="text-[10px] font-bold" style={{color:s.color}}>{s.score} · {s.tone}</span></div><p className="font-display text-2xl sm:text-3xl font-bold leading-tight mt-12">{s.headline.split(new RegExp(`(${s.mark})`,'i')).map((part,k)=>part.toLowerCase()===s.mark.toLowerCase()?<Motion.mark key={k} initial={{opacity:.2}} whileInView={{opacity:1}} transition={{duration:.7}} className="px-1" style={{color:s.color,backgroundColor:`${s.color}20`}}>{part}</Motion.mark>:part)}</p><div className="mt-10 flex items-center gap-2 text-[9px] uppercase tracking-widest text-ink-faint"><CircleDot className="w-3 h-3"/> Framing cue detected</div></Motion.article>)}</div><Motion.div variants={fadeUp} className="mt-5 text-xs text-ink-faint flex items-center gap-2"><Brain className="w-4 h-4 text-accent"/> Same event. Different lexical choices → different audience perception.</Motion.div></div></AnimatedSection>

    <AnimatedSection id="features" className="max-w-7xl mx-auto px-5 sm:px-6 py-20 sm:py-28"><Motion.div variants={fadeUp}>{sectionHead('03 / Intelligence modules','Not feature cards. Working instruments.','Every module surfaces a different layer of Malaysia’s media narrative.')}</Motion.div><div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-ink/15 dark:border-paper/15">{features.map(([Icon,title,desc],i)=><Motion.div variants={fadeUp} whileHover={{y:-6,scale:1.012}} transition={{duration:.28,ease:EASE}} key={title} className="group border-r border-b border-ink/15 dark:border-paper/15 p-6 sm:p-7 hover:bg-ink/[.025] dark:hover:bg-paper/[.025]"><Motion.div whileHover={{scale:1.035}} className="h-24 mb-6 p-4 bg-ink/[.025] dark:bg-paper/[.04] overflow-hidden"><FeaturePreview type={i}/></Motion.div><div className="flex items-center justify-between"><span className="text-[9px] text-accent font-bold tracking-widest">0{i+1}</span>{React.createElement(Icon, { className: 'w-5 h-5 text-accent transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110', strokeWidth: 1.5 })}</div><h3 className="font-display text-xl font-bold mt-3">{title}</h3><p className="text-sm leading-6 text-ink-muted dark:text-ink-faint mt-2">{desc}</p></Motion.div>)}</div></AnimatedSection>

    <AnimatedSection className="border-y border-ink/15 dark:border-paper/15 py-20 sm:py-28 px-5 sm:px-6"><div className="max-w-7xl mx-auto"><Motion.div variants={fadeUp}>{sectionHead('04 / Intelligence pipeline','From news cycle to decision signal.','A transparent path from multi-source ingestion to evidence you can inspect and export.')}</Motion.div><div className="grid md:grid-cols-4">{[[Globe2,'Ingest','Malaysian publishers'],[Brain,'Understand','Tone + entities'],[LineChart,'Compare','Trends + framing'],[FileDown,'Act','Briefs + reports']].map(([Icon,t,d],i)=><Motion.div variants={fadeUp} key={t} className="relative border border-ink/15 dark:border-paper/15 p-7 md:-ml-px first:ml-0"><span className="font-display text-5xl text-ink/[.07] dark:text-paper/[.07] font-bold">0{i+1}</span>{React.createElement(Icon, { className: 'w-6 h-6 text-accent mt-5' })}<h3 className="font-display text-xl font-bold mt-4">{t}</h3><p className="text-xs text-ink-faint mt-2 uppercase tracking-wider">{d}</p>{i<3&&<ChevronRight className="hidden md:block absolute -right-3 top-1/2 z-10 w-6 h-6 p-1 bg-paper dark:bg-paper-dark border border-ink/15 dark:border-paper/15 text-accent"/>}</Motion.div>)}</div></div></AnimatedSection>

    <AnimatedSection className="max-w-7xl mx-auto px-5 sm:px-6 py-20 sm:py-28"><Motion.div variants={fadeUp}>{sectionHead('05 / Built for decisions','Different roles. One shared source of truth.')}</Motion.div><div className="divide-y divide-ink/15 dark:divide-paper/15 border-y border-ink/15 dark:border-paper/15">{roles.map(([n,t,hook,desc])=><Motion.div variants={fadeUp} key={n} className="grid md:grid-cols-[70px_1fr_1fr] gap-3 md:gap-8 py-6 group"><span className="font-display text-2xl text-accent">{n}</span><div><h3 className="font-display text-2xl font-bold group-hover:text-accent transition-colors">{t}</h3><p className="text-[10px] mt-1 uppercase tracking-widest text-ink-faint">{hook}</p></div><p className="text-sm leading-6 text-ink-muted dark:text-ink-faint md:self-center">{desc}</p></Motion.div>)}</div></AnimatedSection>

    <section className="px-5 sm:px-6 pb-24"><div className="max-w-7xl mx-auto bg-accent text-white p-8 sm:p-12 md:p-16 grid md:grid-cols-[1fr_auto] gap-8 items-center"><div><p className="text-[10px] tracking-[.2em] uppercase opacity-75">Malaysia is talking. Are you listening?</p><h2 className="font-display text-3xl sm:text-5xl font-bold mt-3 max-w-3xl">Turn today’s headlines into tomorrow’s decisions.</h2></div><button onClick={()=>navigate('/dashboard')} className="bg-white text-ink px-7 py-4 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-white whitespace-nowrap">Open live dashboard <ArrowRight className="inline w-4 h-4 ml-1"/></button></div></section>
    <Footer/>
  </div>;
};

export default LandingPage;
