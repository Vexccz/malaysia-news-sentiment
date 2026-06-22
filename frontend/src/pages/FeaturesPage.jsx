import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Newspaper, Sun, Moon, BarChart3, Network, TrendingUp, ShieldCheck,
  Brain, FileDown, Globe, AlertTriangle, Lock, ArrowRight
} from 'lucide-react';

// ── Animation Variants ──
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const AnimatedSection = ({ children, className, variants = fadeInUp }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section ref={ref} className={className} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={variants}>
      {children}
    </motion.section>
  );
};

// ── Navbar ──
const Navbar = ({ isDark, toggleTheme, navigate }) => (
  <motion.nav
    className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-[#eee] dark:border-[#2a2a2a]"
    initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
        <Newspaper className="w-5 h-5 text-accent" />
        <span>MY News <span className="text-accent">Sentiment</span></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-gray-600 dark:text-gray-400">
        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
        <Link to="/about" className="hover:text-accent transition-colors">About</Link>
        <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors">
          {isDark ? <Sun className="w-4 h-4 text-gray-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
        </button>
        <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-accent transition-colors">
          Log in
        </Link>
        <motion.button
          onClick={() => navigate('/register')}
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-lg hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
        >
          Get Started
        </motion.button>
      </div>
    </div>
  </motion.nav>
);

// ── Footer ──
const Footer = () => (
  <footer className="border-t border-[#eee] dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f]">
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-3">
            <Newspaper className="w-5 h-5 text-accent" />
            <span>MY News Sentiment</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered sentiment analysis for Malaysian news.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/api" className="hover:text-accent transition-colors">API</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
            <Link to="/jobs" className="hover:text-accent transition-colors">Careers</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-[#eee] dark:border-[#2a2a2a] text-center text-sm text-gray-400">
        © 2026 MY News Sentiment. All rights reserved.
      </div>
    </div>
  </footer>
);

const FeaturesPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const features = [
    { icon: Globe, title: 'Multi-Source Aggregation', desc: 'Real-time RSS feeds from Astro Awani, FMT, Malaysiakini and other major Malaysian news outlets — all in one dashboard.', color: 'text-blue-500' },
    { icon: Brain, title: 'AI Sentiment Analysis', desc: 'Triple-layer AI: GPT-4o-mini for accuracy, Malaya NLP for Bahasa Malaysia, and rule-based fallback for 100% uptime.', color: 'text-green-500' },
    { icon: BarChart3, title: 'Interactive Dashboard', desc: 'Pie charts, bar charts, trend lines, word clouds, and regional heatmaps — all updating in real-time.', color: 'text-orange-500' },
    { icon: Network, title: 'Entity Recognition', desc: 'Automatically extract and track public figures, organizations, and locations mentioned across all articles.', color: 'text-purple-500' },
    { icon: TrendingUp, title: '7-Day AI Forecast', desc: 'Predict sentiment trends for the next week based on current news patterns and historical data.', color: 'text-red-500' },
    { icon: FileDown, title: 'Export & Reports', desc: 'One-click CSV export, PowerPoint presentations, printable reports, and bookmarking for articles that matter most.', color: 'text-teal-500' },
    { icon: ShieldCheck, title: 'Source Credibility', desc: 'Evaluate source reliability and detect bias patterns across multiple outlets with credibility scoring.', color: 'text-indigo-500' },
    { icon: AlertTriangle, title: 'Crisis Alerts', desc: 'Automatic detection of crisis keywords (banjir, rasuah, kemalangan) with real-time alert badges.', color: 'text-amber-500' },
    { icon: Lock, title: 'Secure Authentication', desc: 'Firebase Auth + Google OAuth + JWT tokens. Email verification and password reset included.', color: 'text-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0f0f0f] transition-colors">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header className="relative pt-32 pb-16 px-6 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
        <div className="absolute inset-0 bg-blue-50/30 dark:bg-blue-950/10" />
        <div className="relative max-w-4xl mx-auto">
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Platform Capabilities
          </motion.div>
          <motion.h1 variants={staggerItem} className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
            Everything you need to{' '}
            <span className="text-accent">decode the news</span>
          </motion.h1>
          <motion.p variants={staggerItem} className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Built for researchers, analysts, and anyone who wants to understand Malaysian media sentiment at scale.
          </motion.p>
        </div>
      </motion.header>

      {/* ─── FEATURES GRID ─── */}
      <AnimatedSection className="py-16 px-6" variants={staggerContainer}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm hover:border-accent/50 transition-all group"
              variants={staggerItem}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
            >
              <f.icon className={`w-10 h-10 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── CTA ─── */}
      <AnimatedSection className="py-20 px-6" variants={fadeInUp}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            className="p-12 bg-accent/5 border border-accent/20 rounded-sm"
            whileInView={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.95 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ready to get started?</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Start analyzing Malaysian news sentiment for free. No credit card required.</p>
            <motion.button
              onClick={() => navigate('/register')}
              className="px-8 py-3.5 text-base font-semibold text-white bg-accent rounded-sm transition-all"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            >
              Start Free <ArrowRight className="inline w-4 h-4 ml-1" />
            </motion.button>
          </motion.div>
        </div>
      </AnimatedSection>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
