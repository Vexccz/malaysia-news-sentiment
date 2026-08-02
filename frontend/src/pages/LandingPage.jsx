import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  BarChart3, Network, TrendingUp, ShieldCheck, Brain, FileDown,
  Search, Zap, LineChart, Sun, Moon, ArrowRight, Play, Newspaper,
  ChevronRight, Star, Globe, Clock, X, Plus, Check
} from 'lucide-react';

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
            className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
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
      {/* Scroll progress indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-accent origin-left z-[60]"
        style={{ scaleX }}
      />

      <div className="relative z-10">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header ref={heroRef} className="relative pt-32 pb-20 px-6 min-h-[90vh] flex items-center" style={{ y: heroY, opacity: heroOpacity }}>
        <motion.div className="relative max-w-5xl mx-auto text-center w-full" initial="hidden" animate="visible" variants={staggerContainer}>
          {/* Masthead bar */}
          <motion.div variants={staggerItem} className="flex items-center justify-center gap-4 mb-8">
            <span className="flex-1 max-w-[80px] h-px bg-ink/20 dark:bg-paper/20"/>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">Vol. I · No. 01 · Kuala Lumpur</span>
            <span className="flex-1 max-w-[80px] h-px bg-ink/20 dark:bg-paper/20"/>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={staggerItem} className="font-['Playfair_Display'] text-5xl sm:text-6xl md:text-7xl font-bold text-ink dark:text-paper leading-[1.05] mb-6 tracking-tight">
            Malaysia's News Sentiment,{' '}
            <span className="italic text-accent">
              Decoded in Real-Time.
            </span>
            <br />
            <span className="block mt-4 text-2xl sm:text-3xl md:text-4xl font-normal italic text-ink-muted dark:text-ink-faint">
              Tracking <span className="not-italic text-accent font-semibold">{typingText}</span>
              <span className="animate-pulse text-accent">|</span>
            </span>
          </motion.h1>

          {/* Double rule */}
          <motion.div variants={staggerItem} className="max-w-md mx-auto mb-8 flex flex-col items-center gap-1">
            <div className="w-full h-[2px] bg-ink dark:bg-paper" />
            <div className="w-full h-px bg-ink/40 dark:bg-paper/40" />
          </motion.div>

          {/* Subtitle */}
          <motion.p variants={staggerItem} className="text-lg text-ink-muted dark:text-ink-faint max-w-2xl mx-auto mb-10 font-serif italic">
            Real-time AI sentiment analysis tracking Malaysia's media landscape. From breaking news to trending narratives—understand public sentiment as it unfolds.
          </motion.p>

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
            {['Malaysiakini', 'Astro Awani', 'FMT', 'Bernama', 'The Star'].map((s, i) => (
              <motion.span
                key={s}
                className="px-3 py-1 text-xs font-medium text-ink-muted dark:text-ink-faint border border-ink/10 dark:border-paper/10 font-sans"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 + i * 0.1, duration: 0.4 }}
              >
                {s}
              </motion.span>
            ))}
          </motion.div>

          {/* Live Sentiment Demo */}
          <LiveSentimentDemo />
        </motion.div>
      </motion.header>

      {/* ─── STATS ─── */}
      <AnimatedSection className="py-10 px-6" variants={staggerContainer}>
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

      {/* ─── FEATURES ─── */}
      <AnimatedSection className="py-16 px-6" id="features" variants={staggerContainer}>
        <div className="max-w-6xl mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-14">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Features</p>
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper mb-4">Everything you need to understand Malaysian news</h2>
            <div className="max-w-xs mx-auto flex flex-col items-center gap-1 mb-4">
              <div className="w-full h-[2px] bg-ink/20 dark:bg-paper/20" />
              <div className="w-full h-px bg-ink/10 dark:bg-paper/10" />
            </div>
            <p className="text-ink-muted dark:text-ink-faint max-w-2xl mx-auto font-sans text-sm">Powerful AI tools designed for researchers, analysts, and anyone tracking Malaysian media sentiment.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-ink/10 dark:border-paper/10">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="relative p-7 border-r border-b border-ink/10 dark:border-paper/10 group hover:bg-ink/[0.02] dark:hover:bg-paper/[0.02] transition-colors"
                variants={staggerItem}
              >
                <span className="block font-['Playfair_Display'] text-5xl font-bold text-ink/[0.06] dark:text-paper/[0.06] leading-none mb-2 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <f.icon className="w-6 h-6 text-accent mb-3 -mt-2" strokeWidth={1.5} />
                <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-sans mb-2">{f.title}</p>
                <h3 className="text-base font-bold text-ink dark:text-paper font-sans mb-2">{f.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── HOW IT WORKS ─── */}
      <AnimatedSection className="py-20 px-6 border-t border-ink/10 dark:border-paper/10" variants={staggerContainer}>
        <div className="max-w-5xl mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-16">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">How it works</p>
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl font-bold text-ink dark:text-paper mb-4">From search to insight in seconds</h2>
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

      {/* ─── USE CASES ─── */}
      <AnimatedSection className="py-16 px-6 border-t border-ink/10 dark:border-paper/10" variants={staggerContainer}>
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
              { icon: '🎓', title: 'Researchers', desc: 'Track media sentiment trends for academic papers and thesis research on Malaysian politics, economy, and social issues.' },
              { icon: '📰', title: 'Journalists', desc: 'Monitor how different outlets cover the same story. Identify bias patterns and verify source credibility.' },
              { icon: '📊', title: 'Analysts', desc: 'Real-time sentiment tracking for market analysis, brand monitoring, and public opinion research.' },
              { icon: '🏛️', title: 'Policy Makers', desc: 'Understand public sentiment on policies, track media coverage of government initiatives.' },
              { icon: '🎯', title: 'PR & Communications', desc: 'Monitor brand mentions, track crisis sentiment, measure campaign effectiveness across Malaysian media.' },
              { icon: '🧑‍🎓', title: 'Students', desc: 'Learn NLP concepts through real Malaysian news data. Perfect for FYP and coursework projects.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="p-7 border-r border-b border-ink/10 dark:border-paper/10 cursor-pointer hover:bg-ink/[0.02] dark:hover:bg-paper/[0.02] transition-colors"
                variants={staggerItem}
              >
                <span className="text-2xl block mb-4">{item.icon}</span>
                <h3 className="text-base font-bold text-ink dark:text-paper font-sans mb-2">{item.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed font-sans">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── FAQ ─── */}
      <AnimatedSection className="py-12 px-6" variants={staggerContainer}>
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
