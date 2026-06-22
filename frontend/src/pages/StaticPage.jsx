import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Newspaper, Sun, Moon } from 'lucide-react';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const PAGES = {
  '/api': {
    title: 'API Documentation',
    emoji: '⚡',
    sections: [
      { heading: 'Getting Started', content: 'Our REST API allows you to integrate sentiment analysis into your own applications. All endpoints return JSON and require authentication via API key.' },
      { heading: 'Authentication', content: 'Include your API key in the Authorization header: Authorization: Bearer YOUR_API_KEY. Get your key from the Settings page after signing up.' },
      { heading: 'Endpoints', content: 'POST /api/analyze — Analyze text sentiment\nGET /api/articles — Fetch analyzed articles\nGET /api/entities — Get entity data\nGET /api/trends — Get sentiment trends' },
      { heading: 'Rate Limits', content: 'Free tier: 100 requests/day. Pro tier: 10,000 requests/day. Enterprise: Unlimited.' },
    ]
  },
  '/jobs': {
    title: 'Careers',
    emoji: '🚀',
    sections: [
      { heading: 'Join Our Team', content: 'We\'re building the future of news intelligence in Malaysia. Join us if you\'re passionate about AI, NLP, and making information accessible.' },
      { heading: 'Open Positions', content: '• Senior AI Engineer — Full-time, Kuantan\n• Rust Backend Developer — Contract, Remote\n• Media Analyst (BM/EN) — Full-time, Cyberjaya\n• Security Ops Architect — Full-time, Remote' },
      { heading: 'Benefits', content: '• Flexible remote work\n• Learning budget\n• Health insurance\n• Equipment allowance\n• Annual team retreats' },
    ]
  },
  '/privacy': {
    title: 'Privacy Policy',
    emoji: '🔒',
    sections: [
      { heading: 'Data Collection', content: 'We collect only the data necessary to provide our service: account information, usage analytics, and article analysis results.' },
      { heading: 'Data Usage', content: 'Your data is used solely to provide and improve our sentiment analysis service. We never sell personal data to third parties.' },
      { heading: 'Data Security', content: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We follow industry best practices for security.' },
      { heading: 'Your Rights', content: 'You can request data export or deletion at any time by contacting support@mynewssentiment.com.' },
    ]
  },
};

// ── Navbar ──
const Navbar = ({ isDark, toggleTheme, navigate }) => (
  <motion.nav
    className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f0f0f]/80 border-b border-[#eee] dark:border-[#2a2a2a]"
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

const StaticPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const page = PAGES[location.pathname] || PAGES['/api'];

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0f0f0f] transition-colors">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* Hero */}
      <motion.header className="pt-32 pb-12 px-6 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
        <motion.span variants={staggerItem} className="text-5xl mb-4 block">{page.emoji}</motion.span>
        <motion.h1 variants={staggerItem} className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
          {page.title}
        </motion.h1>
      </motion.header>

      {/* Content */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div className="space-y-8" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {page.sections.map((sec, i) => (
              <motion.div
                key={i}
                className="p-6 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-sm"
                variants={staggerItem}
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{sec.heading}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{sec.content}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StaticPage;
