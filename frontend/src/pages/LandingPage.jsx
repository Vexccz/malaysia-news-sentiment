import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, Network, TrendingUp, ShieldCheck, Brain, FileDown,
  Search, Zap, LineChart, Sun, Moon, ArrowRight, Play, Newspaper,
  ChevronRight, Star, Globe, Clock, X, Plus, Check,
  GraduationCap, Building2, Target, BookOpen
} from 'lucide-react';
import HeroIllustration from '../components/HeroIllustration';

// Google Fonts: JetBrains Mono for data/numbers
const MONO_FONT_LINK = document.createElement('link');
MONO_FONT_LINK.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap';
MONO_FONT_LINK.rel = 'stylesheet';
if (!document.querySelector('link[href*="JetBrains+Mono"]')) document.head.appendChild(MONO_FONT_LINK);

// ── Animation Variants ──
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

// ── Live Sentiment Demo (Editorial Style) ──
const LiveSentimentDemo = () => {
  const headlines = [
    { text: "Malaysia's GDP grows 5.2% in Q1 2026", sentiment: 'Positive', score: 0.87, color: '#22c55e' },
    { text: "Ringgit weakens against USD amid global uncertainty", sentiment: 'Negative', score: 0.72, color: '#ef4444' },
    { text: "New MRT line construction on schedule", sentiment: 'Neutral', score: 0.51, color: '#f59e0b' },
    { text: "Tech sector sees record foreign investment", sentiment: 'Positive', score: 0.91, color: '#22c55e' },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('typing');
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    const headline = headlines[currentIndex];
    let timeout;

    if (phase === 'typing') {
      if (displayText.length < headline.text.length) {
        timeout = setTimeout(() => {
          setDisplayText(headline.text.substring(0, displayText.length + 1));
        }, 30);
      } else {
        timeout = setTimeout(() => setPhase('analyzing'), 500);
      }
    } else if (phase === 'analyzing') {
      timeout = setTimeout(() => setPhase('result'), 1500);
    } else if (phase === 'result') {
      timeout = setTimeout(() => {
        setPhase('typing');
        setDisplayText('');
        setCurrentIndex((prev) => (prev + 1) % headlines.length);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [phase, displayText, currentIndex]);

  const headline = headlines[currentIndex];

  return (
    <motion.div
      className="mt-12 max-w-xl mx-auto bg-paper dark:bg-paper-dark border border-ink/10 dark:border-paper/10 p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          className="w-2 h-2 rounded-full bg-green-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">Live Analysis</span>
      </div>
      <div className="min-h-[60px]">
        <p className="text-sm text-ink dark:text-paper font-medium">
          {displayText}
          <motion.span
            className="inline-block w-[2px] h-5 bg-accent ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        </p>
      </div>
      <AnimatePresence mode="wait">
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-center gap-2"
          >
            <motion.div
              className="w-4 h-4 border-2 border-accent border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-xs text-accent font-medium font-sans">Analyzing sentiment...</span>
          </motion.div>
        )}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-3 flex items-center gap-3"
          >
            <motion.span
              className="px-3 py-1 text-xs font-bold text-white font-sans"
              style={{ backgroundColor: headline.color }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {headline.sentiment}
            </motion.span>
            <motion.span
              className="text-sm font-bold text-ink dark:text-paper font-sans"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Score: {headline.score.toFixed(2)}
            </motion.span>
            <motion.div
              className="flex-1 h-2 bg-ink/5 dark:bg-paper/10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full"
                style={{ backgroundColor: headline.color }}
                initial={{ width: 0 }}
                animate={{ width: `${headline.score * 100}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Animated Counter ──
const AnimatedCounter = ({ target, suffix = '', prefix = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const duration = 2000, steps = 60, interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(target * eased));
      if (step >= steps) {
        clearInterval(timer);
        setDone(true);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return (
    <motion.span
      ref={ref}
      className="font-['Playfair_Display'] text-4xl font-bold text-ink dark:text-paper"
      animate={done ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
};

// ── Animated Section ──
const AnimatedSection = ({ children, className, id, variants = fadeInUp }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} id={id} className={className} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={variants}>
      {children}
    </motion.section>
  );
};

// ── FAQ Item ──
const FAQItem = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      className={`border overflow-hidden transition-colors ${isOpen ? 'border-accent border-l-4' : 'border-ink/10 dark:border-paper/10'}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors text-left"
      >
        {question}
        <motion.span
          className="text-accent flex-shrink-0 ml-4"
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Plus className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-4 text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Navbar ──
const Navbar = ({ isDark, toggleTheme, navigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-paper/90 dark:bg-paper-dark/90 border-b-2 border-ink dark:border-paper"
        initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2 no-underline">
            <span className="font-display font-bold text-lg text-ink dark:text-paper leading-none">MY News <span className="italic text-accent">Sentiment</span></span>
            <span className="hidden sm:inline text-[10px] tracking-[0.18em] text-ink-muted dark:text-ink-faint uppercase">· Est. 2026</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px] tracking-wider uppercase text-ink-muted dark:text-ink-faint">
            <a href="#features" className="hover:text-accent transition-colors">Features</a>
            <Link to="/api-docs" className="hover:text-accent transition-colors">Docs</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-sm hover:bg-ink/5 dark:hover:bg-paper/10 transition-colors">
              {isDark ? <Sun className="w-4 h-4 text-ink-faint" /> : <Moon className="w-4 h-4 text-ink-muted" />}
            </button>
            <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-ink dark:text-paper hover:text-accent transition-colors">
              Log in
            </Link>
            <motion.button
              onClick={() => navigate('/register')}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-paper bg-ink dark:bg-paper dark:text-ink hover:bg-accent dark:hover:bg-accent dark:hover:text-paper transition-colors"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              Subscribe
            </motion.button>
            {/* Hamburger button - mobile only */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-ink/5 dark:hover:bg-paper/10 transition-colors"
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-5 h-5 text-ink dark:text-paper" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <svg className="w-5 h-5 text-ink dark:text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/20"
              onClick={() => setMobileMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* Menu panel */}
            <motion.div
              className="absolute top-16 left-0 right-0 bg-paper dark:bg-paper-dark border-b border-ink/10 dark:border-paper/10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex flex-col px-6 py-4 space-y-1">
                {[
                  { label: 'Features', href: '#features', isAnchor: true },
                  { label: 'Docs', to: '/api-docs' },
                  { label: 'Pricing', to: '/pricing' },
                  { label: 'About', to: '/about' },
                  { label: 'Contact', to: '/contact' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    {item.isAnchor ? (
                      <a
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-3 text-sm font-medium text-ink dark:text-paper hover:text-accent transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-3 text-sm font-medium text-ink dark:text-paper hover:text-accent transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </motion.div>
                ))}
                <motion.div
                  className="pt-3 mt-2 border-t border-ink/10 dark:border-paper/10 flex flex-col gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                >
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm font-medium text-ink dark:text-paper hover:text-accent transition-colors"
                  >
                    Log in
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
                    className="w-full py-3 text-sm font-semibold text-paper bg-ink dark:bg-paper dark:text-ink hover:bg-accent dark:hover:bg-accent dark:hover:text-paper transition-colors"
                  >
                    Get Started
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── Footer ──
const Footer = () => (
  <footer className="border-t border-ink/10 dark:border-paper/10">
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-baseline gap-2 text-lg font-display font-bold text-ink dark:text-paper mb-3">
            <span>MY News <span className="italic text-accent">Sentiment</span></span>
          </div>
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">AI-powered sentiment analysis for Malaysian news.</p>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Product</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint font-sans">
            <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/api-docs" className="hover:text-accent transition-colors">API</Link>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint font-sans">
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/changelog" className="hover:text-accent transition-colors">Changelog</Link>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
            <Link to="/jobs" className="hover:text-accent transition-colors">Careers</Link>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Legal</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint font-sans">
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-ink/10 dark:border-paper/10 text-center text-xs text-ink-muted dark:text-ink-faint font-sans">
        © 2026 MY News Sentiment. All rights reserved.
      </div>
    </div>
  </footer>
);

// ── News Ticker (Bloomberg/CNN style) ──
const NewsTicker = () => {
  const tickerItems = [
    { text: "PM Anwar announces RM50 billion infrastructure package for East Malaysia", sentiment: "positive" },
    { text: "Ringgit hits 6-month low against Singapore dollar amid global uncertainty", sentiment: "negative" },
    { text: "Malaysia's tech sector attracts record RM12B in FDI for Q1 2026", sentiment: "positive" },
    { text: "BNM holds overnight rate steady at 3.0% amid inflation concerns", sentiment: "neutral" },
    { text: "Harimau Malaya qualifies for Asian Cup knockout stage after 2-1 win", sentiment: "positive" },
    { text: "Floods displace 15,000 residents in Kelantan and Terengganu", sentiment: "negative" },
    { text: "Malaysia ranks 3rd in ASEAN digital economy readiness index", sentiment: "positive" },
    { text: "Parliament debates new data protection amendments this week", sentiment: "neutral" },
    { text: "Petronas signs RM8B deepwater exploration deal with Petrobras", sentiment: "positive" },
    { text: "Youth unemployment rate rises to 12.3% in latest BNM quarterly report", sentiment: "negative" },
  ];

  const sentimentColor = {
    positive: 'bg-green-500',
    negative: 'bg-red-500',
    neutral: 'bg-amber-500',
  };

  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="relative overflow-hidden bg-ink dark:bg-[#1A1A1A] border-y border-ink/20 dark:border-paper/20">
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          animation: ticker-scroll 60s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 py-2.5 bg-accent flex items-center gap-2 z-10 border-r border-accent/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white font-sans">Live</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="ticker-track flex items-center whitespace-nowrap">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-2.5">
                <span className={`inline-block w-1.5 h-1.5 ${sentimentColor[item.sentiment]}`} />
                <span className="text-xs text-paper/90 font-sans">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Landing Heatmap (MapLibre GL) ──
const LandingHeatmap = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const dataRef = useRef({});

  const sampleData = [
    { state: 'Selangor', avgSentiment: 0.15, articleCount: 93 },
    { state: 'Kuala Lumpur', avgSentiment: 0.22, articleCount: 87 },
    { state: 'Johor', avgSentiment: -0.08, articleCount: 45 },
    { state: 'Penang', avgSentiment: 0.31, articleCount: 38 },
    { state: 'Pahang', avgSentiment: 0.00, articleCount: 9 },
    { state: 'Perak', avgSentiment: 0.12, articleCount: 28 },
    { state: 'Sabah', avgSentiment: -0.15, articleCount: 22 },
    { state: 'Sarawak', avgSentiment: 0.05, articleCount: 19 },
    { state: 'Kedah', avgSentiment: -0.22, articleCount: 15 },
    { state: 'Kelantan', avgSentiment: -0.18, articleCount: 12 },
    { state: 'Terengganu', avgSentiment: 0.08, articleCount: 11 },
    { state: 'Melaka', avgSentiment: 0.19, articleCount: 14 },
    { state: 'Negeri Sembilan', avgSentiment: 0.03, articleCount: 10 },
    { state: 'Perlis', avgSentiment: -0.05, articleCount: 6 },
    { state: 'Putrajaya', avgSentiment: 0.25, articleCount: 8 },
    { state: 'Labuan', avgSentiment: 0.00, articleCount: 3 },
  ];

  const getSentimentColor = (val) => {
    if (val === null || val === undefined) return '#6b7280';
    if (val > 0.1) return '#4ADE80';
    if (val > -0.1) return '#FBBF24';
    return '#FB7185';
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [109.5, 4.0],
      zoom: 5.2,
      attributionControl: false,
      interactive: true,
    });

    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    mapRef.current = map;

    // Build lookup from sample data
    const dataLookup = {};
    sampleData.forEach((d) => { dataLookup[d.state] = d; });
    dataRef.current = dataLookup;

    // Sentiment color match expression
    const colorExpr = [
      'case',
      ['>', ['coalesce', ['get', 'sentiment'], 0], 0.1], '#4ADE80',
      ['>', ['coalesce', ['get', 'sentiment'], 0], -0.1], '#FBBF24',
      ['==', ['get', 'sentiment'], null], '#6b7280',
      '#FB7185',
    ];

    const stateNameNormalize = {
      'W.P. Kuala Lumpur': 'Kuala Lumpur',
      'W.P. Putrajaya': 'Putrajaya',
      'W.P. Labuan': 'Labuan',
      'Pulau Pinang': 'Penang',
    };

    let hoveredId = null;
    let popup = null;

    map.on('load', async () => {
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/dosm-malaysia/data-open/main/datasets/geodata/administrative_1_state.geojson'
        );
        if (!res.ok) throw new Error('Failed to load GeoJSON');
        const geojson = await res.json();

        // Normalize state names and attach sentiment data
        geojson.features.forEach((f, i) => {
          const rawName = f.properties.state || f.properties.name || '';
          const normalizedName = stateNameNormalize[rawName] || rawName;
          f.properties.state = normalizedName;
          f.id = i;
          const d = dataLookup[normalizedName];
          f.properties.sentiment = d ? d.avgSentiment : null;
          f.properties.articleCount = d ? d.articleCount : 0;
        });

        map.addSource('states', { type: 'geojson', data: geojson });

        map.addLayer({
          id: 'state-fills',
          type: 'fill',
          source: 'states',
          paint: {
            'fill-color': [
              'case',
              ['==', ['get', 'sentiment'], null], '#6b7280',
              ['>', ['get', 'sentiment'], 0.1], '#4ADE80',
              ['>', ['get', 'sentiment'], -0.1], '#FBBF24',
              '#FB7185',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hovered'], false],
              0.85,
              0.55,
            ],
          },
        });

        map.addLayer({
          id: 'state-borders',
          type: 'line',
          source: 'states',
          paint: {
            'line-color': '#1A1A1A',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hovered'], false],
              2,
              0.8,
            ],
            'line-opacity': 0.4,
          },
        });

        // Hover interactions
        popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 10,
          className: 'landing-map-popup',
        });

        map.on('mousemove', 'state-fills', (e) => {
          if (e.features.length > 0) {
            if (hoveredId !== null) {
              map.setFeatureState({ source: 'states', id: hoveredId }, { hovered: false });
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({ source: 'states', id: hoveredId }, { hovered: true });

            const props = e.features[0].properties;
            const stateName = props.state;
            const lookup = dataRef.current[stateName];
            const sentiment = lookup ? lookup.avgSentiment : null;
            const articles = lookup ? lookup.articleCount : 0;

            let label = 'N/A';
            let labelColor = '#6b7280';
            if (sentiment !== null && sentiment !== undefined) {
              if (sentiment > 0.1) { label = 'Positive'; labelColor = '#4ADE80'; }
              else if (sentiment > -0.1) { label = 'Neutral'; labelColor = '#FBBF24'; }
              else { label = 'Negative'; labelColor = '#FB7185'; }
            }

            // Sentiment bar segments
            const barPos = sentiment !== null ? Math.max(0, Math.min(1, (sentiment + 1) / 2)) * 100 : 50;

            const html = `
              <div style="font-family:Inter,sans-serif;padding:0;min-width:160px">
                <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#1A1A1A;margin-bottom:6px;">${stateName}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;background:${labelColor};"></span>
                  <span style="font-size:12px;font-weight:600;color:#1A1A1A;">${label}</span>
                </div>
                <div style="font-size:11px;color:#6B6A65;margin-bottom:2px;">Sentiment: <strong style="color:#1A1A1A">${sentiment !== null ? sentiment.toFixed(2) : 'N/A'}</strong></div>
                <div style="font-size:11px;color:#6B6A65;margin-bottom:6px;">Articles: <strong style="color:#1A1A1A">${articles}</strong></div>
                <div style="height:4px;background:#E5E5E0;width:100%;overflow:hidden;">
                  <div style="height:100%;width:${barPos}%;background:${labelColor};"></div>
                </div>
              </div>
            `;

            popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
          }
        });

        map.on('mouseleave', 'state-fills', () => {
          if (hoveredId !== null) {
            map.setFeatureState({ source: 'states', id: hoveredId }, { hovered: false });
          }
          hoveredId = null;
          if (popup) popup.remove();
        });

      } catch (err) {
        console.error('LandingHeatmap: failed to load GeoJSON', err);
      }
    });

    return () => {
      if (popup) popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <AnimatedSection className="py-16 px-6 border-t border-ink/10 dark:border-paper/10 relative" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">05 / Geography</div>
      <div className="max-w-5xl mx-auto">
        <motion.div variants={staggerItem} className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Coverage</p>
          <div className="flex items-start gap-3 justify-center">
            <div className="w-[3px] h-12 bg-accent mt-1 flex-shrink-0" />
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper mb-4">Malaysia Sentiment Map</h2>
          </div>
          <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mb-4">
            <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
            <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
          </div>
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">Explore real-time sentiment across all 13 states</p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div
            ref={mapContainer}
            style={{ height: '400px', width: '100%', border: '1px solid rgba(26,26,26,0.1)' }}
          />
        </motion.div>

        <motion.div variants={staggerItem} className="mt-6 flex items-center justify-center gap-6">
          {[
            { label: 'Positive', color: '#4ADE80' },
            { label: 'Neutral', color: '#FBBF24' },
            { label: 'Negative', color: '#FB7185' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span style={{ width: 10, height: 10, backgroundColor: item.color, display: 'inline-block' }} />
              <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted dark:text-ink-faint font-sans">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <style>{`
        .landing-map-popup .maplibregl-popup-content {
          background: #FAF8F3;
          border: 1px solid rgba(26,26,26,0.15);
          border-radius: 0;
          box-shadow: none;
          padding: 10px 12px;
        }
        .landing-map-popup .maplibregl-popup-tip {
          border-top-color: #FAF8F3;
          border-bottom-color: #FAF8F3;
        }
      `}</style>
    </AnimatedSection>
  );
};

// ── Technology Stack Bar ──
const TechStackBar = () => {
  const tech = ['React', 'Node.js', 'MongoDB', 'FastAPI', 'Malaya NLP', 'Socket.IO', 'Tailwind CSS', 'Python'];

  return (
    <AnimatedSection className="py-12 px-6 border-t border-ink/10 dark:border-paper/10" variants={staggerContainer}>
      <div className="max-w-5xl mx-auto">
        <motion.div variants={staggerItem} className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Technology</p>
          <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-ink dark:text-paper mb-3">Built With</h2>
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">Powered by modern open-source technologies</p>
        </motion.div>
        <motion.div variants={staggerItem} className="border border-ink/10 dark:border-paper/10 p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {tech.map((t, i) => (
              <motion.span
                key={t}
                className="px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-ink dark:text-paper border border-ink/15 dark:border-paper/15 font-mono hover:border-accent hover:text-accent transition-colors cursor-default"
                variants={staggerItem}
              >
                {t}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatedSection>
  );
};

// ── Landing Page ──
const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const prefersReducedMotion = useReducedMotion();

  // Parallax
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.6]);
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // Real stats from API
  const [realArticleCount, setRealArticleCount] = useState(null);
  useEffect(() => {
    fetch('https://mynewsa-api.onrender.com/api/history/public-stats')
      .then(r => r.json())
      .then(data => { if (data.totalArticles > 0) setRealArticleCount(data.totalArticles); })
      .catch(() => {});
  }, []);

  // Sticky mobile CTA
  const [showMobileCTA, setShowMobileCTA] = useState(false);
  const [mobileCTADismissed, setMobileCTADismissed] = useState(false);
  const heroRef = useRef(null);
  useEffect(() => {
    if (mobileCTADismissed) return;
    const handleScroll = () => {
      setShowMobileCTA(window.scrollY > window.innerHeight);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileCTADismissed]);

  // Typing animation
  const typingWords = ['Politics', 'Economy', 'Markets', 'Rakyat', 'Tech'];
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = typingWords[typingIndex];
    let timeout;
    if (!isDeleting && typingText === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && typingText === '') {
      setIsDeleting(false);
      setTypingIndex((prev) => (prev + 1) % typingWords.length);
    } else {
      timeout = setTimeout(() => {
        setTypingText(isDeleting ? currentWord.substring(0, typingText.length - 1) : currentWord.substring(0, typingText.length + 1));
      }, isDeleting ? 60 : 120);
    }
    return () => clearTimeout(timeout);
  }, [typingText, isDeleting, typingIndex]);

  const features = [
    { icon: BarChart3, title: 'Sentiment Analysis', desc: 'Classify news articles into positive, negative, and neutral sentiment using fine-tuned transformer models.' },
    { icon: Network, title: 'Entity Graph', desc: 'Extract and visualize relationships between public figures, organizations, and locations.' },
    { icon: TrendingUp, title: 'Trending Topics', desc: 'Track emerging narratives and trending topics across Malaysian news in real-time.' },
    { icon: ShieldCheck, title: 'Source Credibility', desc: 'Evaluate source reliability and detect bias patterns across multiple outlets.' },
    { icon: Brain, title: 'AI Insights', desc: 'Get AI-powered summaries, predictions, and actionable intelligence from news data.' },
    { icon: FileDown, title: 'Export Reports', desc: 'Generate PowerPoint presentations and CSV exports with one click.' },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-paper-dark transition-colors overflow-x-hidden relative">
      {/* Global style enhancements */}
      <style>{`
        .noise-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }
        .pinstripe-bg {
          background-image: repeating-linear-gradient(
            -45deg, transparent, transparent 10px,
            rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 11px
          );
        }
        .dark .pinstripe-bg {
          background-image: repeating-linear-gradient(
            -45deg, transparent, transparent 10px,
            rgba(255,255,255,0.015) 10px, rgba(255,255,255,0.015) 11px
          );
        }
        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          height: 2px;
          background: linear-gradient(90deg, #0d9488, #06b6d4);
          z-index: 9999;
          transition: width 0.1s ease-out;
        }
        .section-number {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 9px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }
        /* Dark mode polish */
        .dark .dark\:bg-paper-dark {
          background-color: #0a0e1a !important;
        }
        .dark .text-accent {
          color: #2dd4bf !important;
        }
        .dark .bg-accent {
          background-color: #14b8a6 !important;
          box-shadow: 0 0 20px rgba(20, 184, 166, 0.3);
        }
        .dark .hover\:bg-accent:hover {
          background-color: #2dd4bf !important;
        }
      `}</style>
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-accent origin-left z-[60]"
        style={{ scaleX }}
      />

      <div className="relative z-10">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header ref={heroRef} className="relative pt-32 pb-20 px-6 min-h-[90vh] flex items-center noise-bg" style={{ y: heroY, opacity: heroOpacity }}>
        <motion.div className="relative max-w-5xl mx-auto text-center w-full" initial="hidden" animate="visible" variants={staggerContainer}>
          {/* Masthead bar */}
          <motion.div variants={staggerItem} className="flex items-center justify-center gap-4 mb-8">
            <span className="flex-1 max-w-[80px] h-px bg-ink/20 dark:bg-paper/20"/>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">Vol. I · No. 01 · Kuala Lumpur</span>
            <span className="flex-1 max-w-[80px] h-px bg-ink/20 dark:bg-paper/20"/>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={staggerItem} className="font-['Playfair_Display'] text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-ink dark:text-paper leading-[0.95] mb-8 tracking-tighter">
            <span className="block">Malaysia's News</span>
            <span className="block mt-2">
              <span className="italic font-light">Sentiment,</span>{' '}
              <span className="not-italic text-accent">Decoded.</span>
            </span>
            <span className="block mt-6 text-xl sm:text-2xl md:text-3xl font-light italic text-ink-muted dark:text-ink-faint tracking-normal leading-relaxed">
              Real-time tracking of{' '}
              <span className="not-italic text-accent font-semibold bg-accent/10 px-2 py-0.5">
                {typingText}
              </span>
              <span className="animate-pulse text-accent ml-1 text-3xl sm:text-4xl font-light">|</span>
            </span>
          </motion.h1>

          {/* Accent gradient rule */}
          <motion.div variants={staggerItem} className="max-w-sm mx-auto mb-10 flex flex-col items-center gap-2">
            <div className="w-4/5 h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent" />
            <div className="w-2/3 h-px bg-ink/20 dark:bg-paper/20" />
            <div className="w-1.5 h-1.5 rotate-45 bg-accent" />
          </motion.div>

          {/* Subtitle */}
          <motion.p variants={staggerItem} className="text-lg sm:text-xl text-ink-muted dark:text-ink-faint max-w-2xl mx-auto mb-10 font-light italic tracking-wide">
            Real-time AI sentiment analysis tracking Malaysia's media landscape. From breaking news to trending narratives—understand public sentiment as it unfolds.
          </motion.p>

          {/* Editorial Hero Illustration */}
          <motion.div variants={staggerItem}>
            <HeroIllustration />
          </motion.div>

          {/* CTA */}
          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 text-sm font-semibold tracking-wider uppercase text-paper bg-ink dark:bg-paper dark:text-ink hover:bg-accent dark:hover:bg-accent dark:hover:text-paper transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Start Reading · <ArrowRight className="inline w-4 h-4 ml-1" />
            </motion.button>
            <motion.button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3.5 text-sm font-semibold tracking-wider uppercase text-ink dark:text-paper border-2 border-ink dark:border-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-all"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <Play className="inline w-4 h-4 mr-2" /> View Demo
            </motion.button>
          </motion.div>

          {/* Source tags */}
          <motion.div variants={staggerItem} className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">Powered by</span>
            {['Malaysiakini', 'Astro Awani', 'FMT', 'Bernama', 'The Star'].map((s, i) => {
              const sentiments = ['border-emerald-500/40', 'border-rose-500/40', 'border-amber-500/40', 'border-emerald-500/40', 'border-rose-500/40'];
              const dots = ['bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
              return (
                <motion.span
                  key={s}
                  className={`px-3 py-1.5 text-xs font-medium text-ink-muted dark:text-ink-faint border ${sentiments[i]} bg-paper dark:bg-paper-dark font-sans flex items-center gap-1.5`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + i * 0.1, duration: 0.4 }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${dots[i]}`} />
                  {s}
                </motion.span>
              );
            })}
          </motion.div>

          {/* Performance Badge Row */}
          <motion.div
            variants={staggerItem}
            className="mt-8 flex flex-wrap items-center justify-center gap-0 max-w-3xl mx-auto"
          >
            {[
              { label: 'Lighthouse', value: '98', meta: 'PERFORMANCE' },
              { label: 'PWA', value: '✓', meta: 'INSTALLABLE' },
              { label: 'Uptime', value: '99.9', meta: 'PERCENT', suffix: '%' },
              { label: 'TTFB', value: '< 200', meta: 'MILLISECONDS', suffix: 'ms' },
            ].map((b, i) => (
              <motion.div
                key={b.label}
                className={`flex-1 min-w-[140px] px-4 py-3 border border-ink/10 dark:border-paper/10 ${i > 0 ? 'border-l-0' : ''} hover:bg-ink/[0.02] dark:hover:bg-paper/[0.02] transition-colors`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.0 + i * 0.08, duration: 0.4 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-['JetBrains_Mono'] text-2xl font-bold text-ink dark:text-paper tabular-nums">{b.value}</span>
                  {b.suffix && <span className="text-xs text-ink-muted dark:text-ink-faint font-sans">{b.suffix}</span>}
                </div>
                <p className="text-center text-[9px] uppercase tracking-[0.18em] text-ink-faint dark:text-ink-faint font-['JetBrains_Mono'] mt-1">{b.meta}</p>
                <p className="text-center text-[10px] uppercase tracking-[0.15em] text-accent font-sans mt-0.5 font-semibold">{b.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Live Sentiment Demo */}
          <LiveSentimentDemo />
        </motion.div>
      </motion.header>

      {/* ─── STATS ─── */}
      <AnimatedSection className="py-10 px-6 relative" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">02 / Metrics</div>
        <div className="max-w-4xl mx-auto">
          {/* Section label */}
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">By the Numbers</p>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1">
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-ink/10 dark:border-paper/10 divide-x divide-ink/10 dark:divide-paper/10">
            {[
              { target: realArticleCount || 1000, suffix: '+', label: 'Articles Analyzed' },
              { target: 15, suffix: '', label: 'News Sources' },
              { target: 92, suffix: '%', label: 'Classification Accuracy' },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="text-center p-8"
                variants={staggerItem}
              >
                <AnimatedCounter target={s.target} suffix={s.suffix} />
                <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mt-2">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── NEWS TICKER ─── */}
      <NewsTicker />

      {/* ─── FEATURES ─── */}
      <AnimatedSection className="py-16 px-6 relative" id="features" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">03 / Features</div>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-14">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Features</p>
            <div className="flex items-start gap-3">
              <div className="w-[3px] h-12 bg-accent mt-1 flex-shrink-0" />
              <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper mb-4">Everything you need to understand Malaysian news</h2>
            </div>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mb-4">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>
            <p className="text-ink-muted dark:text-ink-faint max-w-2xl mx-auto font-sans text-sm">Powerful AI tools designed for researchers, analysts, and anyone tracking Malaysian media sentiment.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-ink/10 dark:border-paper/10 [&>*:first-child]:lg:col-span-2 [&>*:first-child]:lg:row-span-1">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="relative p-7 border-r border-b border-ink/10 dark:border-paper/10 group hover:bg-ink/[0.02] dark:hover:bg-paper/[0.02] transition-all duration-300 border-l-[3px] border-l-transparent hover:border-l-accent"
                variants={staggerItem}
              >
                <span className="block font-['Playfair_Display'] text-5xl font-bold text-ink/[0.06] dark:text-paper/[0.06] leading-none mb-2 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <f.icon className="w-6 h-6 text-accent mb-3 -mt-2" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-sans mb-2">{f.title}</p>
                <h3 className="text-base font-bold text-ink dark:text-paper font-sans mb-2">{f.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{f.desc}</p>
                <div className="mt-3 overflow-hidden">
                  <div className="h-px w-0 group-hover:w-full bg-accent/40 transition-all duration-700 ease-out" />
                </div>
                <span className="block mt-2 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-sans">
                  Explore →
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── HOW IT WORKS ─── */}
      <AnimatedSection className="py-20 px-6 border-t border-ink/10 dark:border-paper/10 relative" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">04 / Process</div>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">How it works</p>
            <div className="flex items-start gap-3 justify-center">
              <div className="w-[3px] h-12 bg-accent mt-1 flex-shrink-0" />
              <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper mb-4">From search to insight in seconds</h2>
            </div>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mb-4">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>
            <p className="text-ink-muted dark:text-ink-faint max-w-lg mx-auto font-sans text-sm">Three simple steps to understand Malaysian news sentiment at scale.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
            {[
              { num: '01', title: 'Search', desc: 'Enter any topic or keyword. Our crawler fetches the latest articles from major Malaysian news outlets.', icon: Search },
              { num: '02', title: 'Analyze', desc: 'AI models classify sentiment, extract entities, and score relevance in real time.', icon: Zap },
              { num: '03', title: 'Insights', desc: 'Explore interactive dashboards with sentiment trends, entity networks, and heatmaps.', icon: LineChart },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                className="relative text-center p-8 border border-ink/10 dark:border-paper/10 -ml-px first:ml-0 group"
                variants={staggerItem}
              >
                <step.icon className="w-6 h-6 text-accent mx-auto mb-4" strokeWidth={1.5} />
                <span className="block text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2 font-sans">{step.num}</span>
                <h3 className="text-xl font-bold text-ink dark:text-paper mb-3 font-sans">{step.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 items-center justify-center bg-paper dark:bg-paper-dark border border-ink/10 dark:border-paper/10 z-10">
                    <ChevronRight className="w-3 h-3 text-accent" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── MALAYSIA MAP ─── */}
      <LandingHeatmap />

      {/* ─── TECHNOLOGY STACK ─── */}
      <TechStackBar />

      {/* ─── USE CASES ─── */}
      <AnimatedSection className="py-16 px-6 border-t border-ink/10 dark:border-paper/10 relative" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">05 / Use Cases</div>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <motion.p variants={staggerItem} className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Use Cases</motion.p>
            <motion.h2 variants={staggerItem} className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper">Who is this for?</motion.h2>
            <motion.div variants={staggerItem} className="max-w-xs mx-auto flex flex-col items-center gap-1 mt-4 mb-2">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </motion.div>
            <motion.p variants={staggerItem} className="text-ink-muted dark:text-ink-faint mt-3 max-w-lg mx-auto font-sans text-sm">Built for anyone who needs to understand Malaysian media narratives at scale.</motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-0 border-t border-l border-ink/10 dark:border-paper/10">
            {[
              { icon: GraduationCap, title: 'Researchers', desc: 'Track media sentiment trends for academic papers and thesis research on Malaysian politics, economy, and social issues.' },
              { icon: Newspaper, title: 'Journalists', desc: 'Monitor how different outlets cover the same story. Identify bias patterns and verify source credibility.' },
              { icon: BarChart3, title: 'Analysts', desc: 'Real-time sentiment tracking for market analysis, brand monitoring, and public opinion research.' },
              { icon: Building2, title: 'Policy Makers', desc: 'Understand public sentiment on policies, track media coverage of government initiatives.' },
              { icon: Target, title: 'PR & Communications', desc: 'Monitor brand mentions, track crisis sentiment, measure campaign effectiveness across Malaysian media.' },
              { icon: BookOpen, title: 'Students', desc: 'Learn NLP concepts through real Malaysian news data. Perfect for FYP and coursework projects.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-7 border-r border-b border-ink/10 dark:border-paper/10 cursor-pointer hover:bg-ink/[0.02] dark:hover:bg-paper/[0.02] transition-colors"
                variants={staggerItem}
              >
                <item.icon className="w-7 h-7 text-accent mb-4" strokeWidth={1.5} />
                <h3 className="text-base font-bold text-ink dark:text-paper font-sans mb-2">{item.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── FAQ ─── */}
      <AnimatedSection className="py-12 px-6 relative" variants={staggerContainer}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">06 / FAQ</div>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">FAQ</p>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper">Common questions</h2>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mt-4">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>
          </div>
          <div className="space-y-0 divide-y divide-ink/10 dark:divide-paper/10 border-t border-b border-ink/10 dark:border-paper/10">
            {[
              { q: 'What news sources are supported?', a: 'We analyze 50+ Malaysian news sources including The Star, NST, Malaysiakini, Bernama, Free Malaysia Today, and more.' },
              { q: 'How accurate is the sentiment analysis?', a: 'Our NLP models achieve 85%+ accuracy on Malaysian news text, trained specifically on local language patterns and context.' },
              { q: 'Is it free to use?', a: 'Yes! The basic features are completely free. This is a university research project (FYP) at UMPSA.' },
              { q: 'Can I export the results?', a: 'Yes, you can export analysis results as PowerPoint presentations, perfect for reports and presentations.' },
              { q: 'Does it support Bahasa Malaysia?', a: 'Currently optimized for English-language Malaysian news. BM support is on the roadmap.' },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} index={i} />
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── CTA ─── */}
      <AnimatedSection className="py-16 px-6 relative" variants={scaleIn}>
        <div className="absolute top-4 left-6 section-number text-ink-faint dark:text-ink-faint">07 / Get Started</div>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="relative border-2 border-ink dark:border-paper p-12 overflow-hidden"
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.95 }}
            viewport={{ once: true }}
          >
            {/* Animated decorative lines */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px bg-accent"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'left' }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px bg-accent"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              style={{ transformOrigin: 'right' }}
            />
            <motion.div
              className="absolute top-0 left-0 bottom-0 w-px bg-accent"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
              style={{ transformOrigin: 'top' }}
            />
            <motion.div
              className="absolute top-0 right-0 bottom-0 w-px bg-accent"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              style={{ transformOrigin: 'bottom' }}
            />

            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Get Started</p>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-4">Start analyzing Malaysian news today</h2>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mb-6">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>

            {/* Mini feature highlights */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              {['15+ News Sources', 'Real-Time Analysis', 'Free Forever'].map((item, i) => (
                <motion.div
                  key={item}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Check className="w-4 h-4 text-accent" />
                  <span className="text-sm text-ink dark:text-paper font-sans font-medium">{item}</span>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 text-sm font-semibold tracking-wider uppercase text-paper bg-ink dark:bg-paper dark:text-ink hover:bg-accent dark:hover:bg-accent dark:hover:text-paper transition-colors"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started Free <ArrowRight className="inline w-4 h-4 ml-1" />
            </motion.button>

            <Link
              to="/dashboard"
              className="block mt-5 text-sm text-ink-muted dark:text-ink-faint hover:text-accent dark:hover:text-accent transition-colors font-sans"
            >
              Or explore the dashboard →
            </Link>
          </motion.div>
        </div>
      </AnimatedSection>

      <Footer />
      </div>{/* end relative z-10 */}

      {/* Sticky mobile CTA */}
      <AnimatePresence>
        {showMobileCTA && !mobileCTADismissed && (
          <motion.div
            className="fixed bottom-6 left-4 right-4 z-50 md:hidden"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2 px-4 py-3 bg-ink dark:bg-paper">
              <button
                onClick={() => navigate('/register')}
                className="flex-1 text-sm font-semibold text-paper dark:text-ink text-center"
              >
                Get Started Free <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
              <button
                onClick={() => setMobileCTADismissed(true)}
                className="p-1.5 hover:bg-paper/20 dark:hover:bg-ink/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4 text-paper/80 dark:text-ink/80" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
