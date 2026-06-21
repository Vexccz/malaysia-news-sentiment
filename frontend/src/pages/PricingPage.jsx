import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Newspaper, Sun, Moon, ChevronDown, ArrowRight
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
    className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-[#0f0f0f]/80 border-b border-ink/10 dark:border-paper/10"
    initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold font-['Playfair_Display'] text-ink dark:text-paper">
        <Newspaper className="w-5 h-5 text-accent" />
        <span>MY News <span className="text-accent">Sentiment</span></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-ink-muted dark:text-ink-faint font-sans">
        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
        <Link to="/about" className="hover:text-accent transition-colors">About</Link>
        <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors">
          {isDark ? <Sun className="w-4 h-4 text-ink-muted" /> : <Moon className="w-4 h-4 text-ink-muted" />}
        </button>
        <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-ink dark:text-paper hover:text-accent transition-colors font-sans">
          Log in
        </Link>
        <motion.button
          onClick={() => navigate('/register')}
          className="px-4 py-2 text-sm font-medium font-sans border border-ink dark:border-paper text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          Get Started
        </motion.button>
      </div>
    </div>
  </motion.nav>
);

// ── Footer ──
const Footer = () => (
  <footer className="border-t border-ink/10 dark:border-paper/10 bg-paper dark:bg-ink">
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 text-lg font-bold font-['Playfair_Display'] text-ink dark:text-paper mb-3">
            <Newspaper className="w-5 h-5 text-accent" />
            <span>MY News Sentiment</span>
          </div>
          <p className="text-sm text-ink-muted dark:text-ink-faint font-sans">AI-powered sentiment analysis for Malaysian news.</p>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Product</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint font-sans">
            <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/api" className="hover:text-accent transition-colors">API</Link>
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
      <div className="mt-12 pt-8 border-t border-ink/10 dark:border-paper/10 text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
        © 2026 MY News Sentiment. All rights reserved.
      </div>
    </div>
  </footer>
);

const PricingPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/mo',
      desc: 'For students and researchers exploring Malaysian news sentiment.',
      features: [
        'Unlimited articles',
        'AI sentiment analysis',
        'Entity recognition',
        'Trending topics',
        'Source credibility scores',
        'Interactive dashboard',
        '7-day AI forecast',
        'CSV & PowerPoint export',
        'Regional heatmaps',
        'Crisis alerts',
      ],
      cta: 'Get Started Free',
      highlighted: true,
    },
    {
      name: 'Pro',
      price: 'Coming Soon',
      period: '',
      desc: 'Advanced features for teams and organizations. Currently in development.',
      features: [
        'Everything in Free',
        'API access',
        'Custom alerts',
        'Priority support',
        'Team collaboration',
        'Advanced analytics',
      ],
      cta: 'Join Waitlist',
      highlighted: false,
      badge: 'Coming Soon',
    },
  ];

  const faqs = [
    { q: 'Is it really free?', a: 'Yes! This is a Final Year Project (FYP) at UMPSA. All features are free to use during the research period.' },
    { q: 'What news sources are covered?', a: 'We aggregate from Malaysiakini, Astro Awani, Free Malaysia Today, Bernama, The Star, and other major Malaysian outlets via RSS and API feeds.' },
    { q: 'How accurate is the sentiment analysis?', a: 'Our multi-tier AI pipeline (GPT-4o + Malaya NLP + rule-based fallback) achieves ~95% accuracy on Malaysian news content in both BM and English.' },
    { q: 'Will there be a paid plan?', a: 'We are exploring a Pro tier with API access and team features. Join the waitlist to be notified when it launches.' },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink transition-colors">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header className="pt-32 pb-16 px-6 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
        <div className="max-w-4xl mx-auto">
          <motion.div variants={staggerItem} className="inline-block border border-ink/40 dark:border-paper/40 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-8">
            Free for Everyone
          </motion.div>
          <motion.h1 variants={staggerItem} className="text-4xl sm:text-5xl font-['Playfair_Display'] font-bold text-ink dark:text-paper leading-tight mb-6">
            Pricing
          </motion.h1>
          <motion.div variants={staggerItem} className="max-w-xs mx-auto mb-6">
            <div className="h-px bg-ink/10 dark:bg-paper/10" />
            <div className="h-px bg-ink/10 dark:bg-paper/10 mt-0.5" />
          </motion.div>
          <motion.p variants={staggerItem} className="text-lg text-ink-muted dark:text-ink-faint max-w-2xl mx-auto font-sans">
            All features are free during our research period. No credit card required, no hidden fees.
          </motion.p>
        </div>
      </motion.header>

      {/* ─── PRICING CARDS ─── */}
      <AnimatedSection className="py-12 px-6" variants={staggerContainer}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              className={`relative p-5 border transition-colors ${
                plan.highlighted
                  ? 'border-2 border-accent'
                  : 'border border-ink/10 dark:border-paper/10'
              }`}
              variants={staggerItem}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-sans text-ink-muted dark:text-ink-faint border border-ink/20 dark:border-paper/20 bg-paper dark:bg-ink">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-['Playfair_Display'] font-bold text-ink dark:text-paper">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-['Playfair_Display'] font-bold text-ink dark:text-paper">{plan.price}</span>
                {plan.period && <span className="text-ink-muted dark:text-ink-faint font-sans">{plan.period}</span>}
              </div>
              <p className="mt-3 text-sm text-ink-muted dark:text-ink-faint font-sans">{plan.desc}</p>

              <div className="mt-6 h-px bg-ink/10 dark:bg-paper/10" />

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-ink dark:text-paper font-sans">
                    <span className="mt-1.5 w-1.5 h-1.5 border border-ink/40 dark:border-paper/40 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <motion.button
                onClick={() => navigate('/register')}
                className={`mt-8 w-full py-3 font-sans font-semibold text-sm transition-colors ${
                  plan.highlighted
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'border border-ink dark:border-paper text-ink dark:text-paper hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {plan.cta} <ArrowRight className="inline w-4 h-4 ml-1" />
              </motion.button>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── FAQ ─── */}
      <AnimatedSection className="py-20 px-6" variants={fadeInUp}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-ink dark:text-paper text-center mb-2">Frequently Asked Questions</h2>
          <p className="text-center text-ink-muted dark:text-ink-faint mb-10 font-sans">Everything you need to know.</p>

          <div className="divide-y divide-ink/10 dark:divide-paper/10">
            {faqs.map((faq, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className={`text-sm font-medium font-sans ${openFaq === i ? 'text-accent' : 'text-ink dark:text-paper'}`}>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-ink-muted dark:text-ink-faint transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="pb-5 pl-4 border-l-4 border-accent text-sm text-ink-muted dark:text-ink-faint font-sans">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* ─── CTA ─── */}
      <AnimatedSection className="py-20 px-6">
        <div className="max-w-2xl mx-auto border border-ink/10 dark:border-paper/10 p-10 text-center">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-ink dark:text-paper mb-4">
            Start analysing today
          </h2>
          <p className="text-ink-muted dark:text-ink-faint font-sans mb-8">
            No credit card required. Full access to every feature.
          </p>
          <motion.button
            onClick={() => navigate('/register')}
            className="px-8 py-3 border border-ink dark:border-paper text-ink dark:text-paper font-sans font-semibold text-sm hover:bg-ink hover:text-paper dark:hover:bg-paper dark:hover:text-ink transition-colors"
            whileTap={{ scale: 0.98 }}
          >
            Get Started Free <ArrowRight className="inline w-4 h-4 ml-1" />
          </motion.button>
        </div>
      </AnimatedSection>

      <Footer />
    </div>
  );
};

export default PricingPage;
