import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Newspaper, Sun, Moon, Brain, Globe,
  Users, GraduationCap, Building2, Calendar, ArrowRight
} from 'lucide-react';

// ── Animation Variants ──
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
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

// ── Scroll Progress Indicator ──
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-accent origin-left z-[60]"
      style={{ scaleX }}
    />
  );
};

// ── Double Rule Separator ──
const DoubleRule = ({ className = '' }) => (
  <div className={className}>
    <div className="h-[2px] bg-ink dark:bg-paper" />
    <div className="h-px bg-ink/10 dark:bg-paper/10 mt-[2px]" />
  </div>
);

// ── Navbar ──
const Navbar = ({ isDark, toggleTheme, navigate }) => (
  <motion.nav
    className="fixed top-0 left-0 right-0 z-50 bg-paper dark:bg-ink border-b border-ink/10 dark:border-paper/10"
    initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold text-ink dark:text-paper">
        <Newspaper className="w-5 h-5 text-accent" />
        <span>MY News <span className="text-accent">Sentiment</span></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">
        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
        <Link to="/about" className="hover:text-accent transition-colors">About</Link>
        <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors">
          {isDark ? <Sun className="w-4 h-4 text-ink-muted dark:text-ink-faint" /> : <Moon className="w-4 h-4 text-ink-muted dark:text-ink-faint" />}
        </button>
        <Link to="/login" className="hidden sm:inline-flex text-xs font-medium text-ink-muted dark:text-ink-faint hover:text-accent transition-colors uppercase tracking-wider">
          Log in
        </Link>
        <motion.button
          onClick={() => navigate('/register')}
          className="px-4 py-2 text-xs font-medium text-paper bg-accent uppercase tracking-wider"
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
  <footer className="border-t border-ink/10 dark:border-paper/10">
    <div className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 text-lg font-bold text-ink dark:text-paper mb-3">
            <Newspaper className="w-5 h-5 text-accent" />
            <span>MY News Sentiment</span>
          </div>
          <p className="text-sm text-ink-muted dark:text-ink-faint">AI-powered sentiment analysis for Malaysian news.</p>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Product</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/api" className="hover:text-accent transition-colors">API</Link>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
            <Link to="/jobs" className="hover:text-accent transition-colors">Careers</Link>
          </div>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Legal</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
      <DoubleRule className="mt-12" />
      <div className="pt-6 text-center text-xs text-ink/40 dark:text-paper/40 uppercase tracking-widest">
        © 2026 MY News Sentiment. All rights reserved.
      </div>
    </div>
  </footer>
);

// ── Timeline with animated line ──
const AnimatedTimeline = ({ milestones }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const currentMilestoneIndex = 4;

  return (
    <div ref={ref} className="relative">
      <motion.div
        className="absolute left-6 top-0 bottom-0 w-0.5 bg-accent/30"
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ originY: 0 }}
      />
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-ink/10 dark:bg-paper/10" />

      <div className="space-y-8">
        {milestones.map((ms, i) => (
          <motion.div
            key={i}
            className="relative pl-16"
            initial={{ opacity: 0, y: 28 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 }}
          >
            <div className="absolute left-4 top-1 w-4 h-4 bg-accent border-2 border-paper dark:border-ink" />
            {i === currentMilestoneIndex && (
              <motion.div
                className="absolute left-3 top-0 w-6 h-6 border-2 border-accent"
                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-[0.2em]">{ms.date}</span>
            <h3 className="text-lg font-['Playfair_Display'] font-semibold text-ink dark:text-paper mt-1">{ms.title}</h3>
            <p className="text-sm text-ink-muted dark:text-ink-faint mt-1">{ms.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AboutPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const prefersReducedMotion = useReducedMotion();

  // Animated counters
  const [statsVisible, setStatsVisible] = useState(false);
  const [counters, setCounters] = useState({ articles: 0, accuracy: 0, sources: 0 });
  const statsRef = useRef(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!statsVisible) return;
    const targets = { articles: 10000, accuracy: 95, sources: 50 };
    const duration = 2000, steps = 60, interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - Math.min(step / steps, 1), 3);
      setCounters({
        articles: Math.round(targets.articles * eased),
        accuracy: Math.round(targets.accuracy * eased),
        sources: Math.round(targets.sources * eased),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [statsVisible]);

  const techStack = [
    { name: 'React', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', desc: 'Frontend UI framework' },
    { name: 'Node.js', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg', desc: 'Backend runtime' },
    { name: 'MongoDB', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg', desc: 'NoSQL database' },
    { name: 'Express', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg', desc: 'Backend framework' },
    { name: 'Tailwind CSS', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg', desc: 'Utility-first CSS' },
    { name: 'Python', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg', desc: 'AI & data processing' },
  ];

  const team = [
    { name: 'Muhammad Zafran', role: 'Lead Developer', initials: 'MZ' },
    { name: 'Dr. Supervisor', role: 'Project Advisor', initials: 'DS' },
    { name: 'UMPSA FSKKP', role: 'Faculty Support', initials: 'UF' },
  ];

  const milestones = [
    { date: 'Sep 2025', title: 'Project Kickoff', desc: 'FYP proposal approved at UMPSA FSKKP.' },
    { date: 'Nov 2025', title: 'Core Architecture', desc: 'Backend API, MongoDB schema, and React frontend scaffolded.' },
    { date: 'Jan 2026', title: 'AI Pipeline Live', desc: 'Multi-tier sentiment analysis with GPT-4o + Malaya NLP integrated.' },
    { date: 'Mar 2026', title: 'Beta Launch', desc: 'Dashboard, forecasting, and real-time analysis features deployed.' },
    { date: 'May 2026', title: 'FYP Presentation', desc: 'Final demonstration and thesis submission.' },
  ];

  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-paper dark:bg-ink transition-colors">
      <ScrollProgress />
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header className="pt-32 pb-16 px-6 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
        <div className="max-w-4xl mx-auto">
          <motion.p variants={staggerItem} className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-6">
            About Us
          </motion.p>
          <motion.h1 variants={staggerItem} className="font-['Playfair_Display'] text-4xl sm:text-5xl font-bold text-ink dark:text-paper leading-tight mb-6">
            About MY News Sentiment
          </motion.h1>
          <DoubleRule className="max-w-xs mx-auto mb-6" />
          <motion.p variants={staggerItem} className="text-lg text-ink-muted dark:text-ink-faint max-w-2xl mx-auto">
            We're building the infrastructure to monitor, analyze, and predict news sentiment across Malaysia's multilingual media landscape.
          </motion.p>
        </div>
      </motion.header>

      {/* ─── STATS ─── */}
      <AnimatedSection className="py-12 px-6" variants={staggerContainer}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3" ref={statsRef}>
          {[
            { num: `${counters.articles.toLocaleString()}+`, label: 'Articles Analyzed', icon: Newspaper },
            { num: `${counters.accuracy}%`, label: 'AI Accuracy', icon: Brain },
            { num: `${counters.sources}+`, label: 'News Sources', icon: Globe },
          ].map((s, i) => (
            <motion.div
              key={i}
              className={`text-center p-6 border border-ink/10 dark:border-paper/10 ${i > 0 ? 'border-l-0' : ''}`}
              variants={staggerItem}
            >
              <s.icon className="w-6 h-6 text-accent mx-auto mb-3" />
              <div className="text-3xl font-['Playfair_Display'] font-bold text-ink dark:text-paper">{s.num}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mt-1">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </AnimatedSection>

      {/* ─── MISSION ─── */}
      <AnimatedSection className="py-16 px-6" variants={fadeInUp}>
        <div className="max-w-3xl mx-auto">
          <div className="border border-ink/10 dark:border-paper/10 p-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Our Mission</p>
            <h2 className="font-['Playfair_Display'] text-2xl font-bold text-ink dark:text-paper mb-4">Our Mission</h2>
            <p className="text-ink-muted dark:text-ink-faint leading-relaxed">
              To provide transparent, unbiased, and accessible news sentiment analysis for Malaysia. We believe that understanding media narratives is essential for informed decision-making in a democratic society.
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* ─── 3-TIER NLP METHODOLOGY ─── */}
      <section className="py-16 px-6 border-t border-b border-ink/10 dark:border-paper/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Methodology</p>
          <h2 className="text-center font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-3">3-Tier Sentiment Pipeline</h2>
          <DoubleRule className="max-w-xs mx-auto mb-4" />
          <p className="text-center text-ink-muted dark:text-ink-faint max-w-2xl mx-auto mb-12">
            We classify each article through three independent models, then reconcile their verdicts with confidence-weighted voting.
            This makes the system robust to single-model bias and gracefully degrades when one tier is unavailable.
          </p>

          <AnimatedSection className="grid grid-cols-1 md:grid-cols-3 gap-0" variants={staggerContainer}>
            {[
              {
                tier: '01',
                title: 'Malaya NLP',
                tag: 'Primary · Local',
                desc: 'Malaysian-trained BERT model via HuggingFace. Understands Malay slang, bahasa pasar, and code-switched headlines.',
                meta: 'FastAPI microservice · ~120ms per article',
              },
              {
                tier: '02',
                title: 'Ollama Cloud',
                tag: 'Reasoning · gpt-oss:120b',
                desc: 'Large-context reasoning for nuanced framing and political tone. Catches sarcasm and editorial bias that BERT misses.',
                meta: 'Async batch · ~800ms per article',
              },
              {
                tier: '03',
                title: 'Google Gemini',
                tag: 'Fallback · 2.0 Flash',
                desc: 'Independent second opinion. Triggered when tiers 1 and 2 disagree by more than 30%, or as standby if Ollama times out.',
                meta: 'On-demand · ~400ms per article',
              },
            ].map((row, i) => (
              <motion.div
                key={row.tier}
                className={`p-8 border border-ink/10 dark:border-paper/10 ${i > 0 ? 'md:border-l-0' : ''}`}
                variants={staggerItem}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <span className="font-['Playfair_Display'] text-4xl font-bold text-accent">{row.tier}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans">{row.tag}</span>
                </div>
                <h3 className="font-['Playfair_Display'] text-xl font-bold text-ink dark:text-paper mb-2">{row.title}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint leading-relaxed mb-4">{row.desc}</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-ink-faint dark:text-ink-faint/70 font-mono border-t border-ink/10 dark:border-paper/10 pt-3">{row.meta}</p>
              </motion.div>
            ))}
          </AnimatedSection>

          <div className="mt-10 max-w-3xl mx-auto border-l-2 border-accent pl-6 py-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent font-sans mb-2">Reconciliation Logic</p>
            <p className="text-ink-muted dark:text-ink-faint leading-relaxed text-sm">
              Each tier returns <span className="font-mono text-ink dark:text-paper">{`{label, confidence}`}</span>.
              Final verdict = weighted majority vote (Malaya 0.4, Ollama 0.4, Gemini 0.2), with confidence as the harmonic mean.
              All three verdicts are stored — the Source Credibility page lets analysts see where models disagreed.
            </p>
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section className="py-16 px-6 border-b border-ink/10 dark:border-paper/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Technology</p>
          <h2 className="text-center font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-3">Built with modern tools</h2>
          <DoubleRule className="max-w-xs mx-auto mb-4" />
          <p className="text-center text-ink-muted dark:text-ink-faint max-w-xl mx-auto mb-10">A full-stack architecture designed for real-time sentiment analysis at scale.</p>

          <AnimatedSection className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" variants={staggerContainer}>
            {techStack.map((tech, i) => (
              <motion.div
                key={tech.name}
                className={`p-6 border border-ink/10 dark:border-paper/10 ${i % 3 !== 0 ? 'border-l-0' : ''} ${i >= 3 ? 'border-t-0' : ''}`}
                variants={staggerItem}
              >
                <img src={tech.icon} alt={tech.name} className="w-8 h-8 mb-3" />
                <h3 className="font-['Playfair_Display'] text-lg font-semibold text-ink dark:text-paper">{tech.name}</h3>
                <p className="text-sm text-ink-muted dark:text-ink-faint mt-1">{tech.desc}</p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── TEAM ─── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Team</p>
          <h2 className="text-center font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-3">The people behind the platform</h2>
          <DoubleRule className="max-w-xs mx-auto mb-4" />
          <p className="text-center text-ink-muted dark:text-ink-faint max-w-xl mx-auto mb-10">A dedicated team building the future of Malaysian media intelligence.</p>

          <AnimatedSection className="grid grid-cols-1 sm:grid-cols-3" variants={staggerContainer}>
            {team.map((member, i) => (
              <motion.div
                key={member.name}
                className={`text-center p-8 border border-ink/10 dark:border-paper/10 ${i > 0 ? 'border-l-0' : ''}`}
                variants={staggerItem}
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-ink/20 dark:border-paper/20 text-accent font-['Playfair_Display'] font-bold text-xl">
                  {member.initials}
                </div>
                <h3 className="font-['Playfair_Display'] text-lg font-semibold text-ink dark:text-paper">{member.name}</h3>
                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mt-1">{member.role}</p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── TIMELINE ─── */}
      <section className="py-16 px-6 border-t border-b border-ink/10 dark:border-paper/10">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-2">Milestones</p>
          <h2 className="text-center font-['Playfair_Display'] text-3xl font-bold text-ink dark:text-paper mb-10">Our journey so far</h2>

          <AnimatedTimeline milestones={milestones} />
        </div>
      </section>

      {/* ─── UMPSA Banner ─── */}
      <AnimatedSection className="py-16 px-6" variants={fadeInUp}>
        <div className="max-w-3xl mx-auto text-center p-10 border-2 border-ink/20 dark:border-paper/20">
          <GraduationCap className="w-10 h-10 text-accent mx-auto mb-4" />
          <h3 className="font-['Playfair_Display'] text-2xl font-bold text-ink dark:text-paper mb-3">Built at UMPSA</h3>
          <p className="text-ink-muted dark:text-ink-faint mb-4">
            This platform is developed as a Final Year Project (FYP) at Universiti Malaysia Pahang Al-Sultan Abdullah (UMPSA), Faculty of Computing (FSKKP).
          </p>
          <span className="inline-flex items-center gap-2 px-4 py-2 border border-ink/10 dark:border-paper/10 text-xs text-ink-muted dark:text-ink-faint uppercase tracking-[0.2em] font-sans">
            <Building2 className="w-4 h-4" /> UMPSA · Gambang, Pahang
          </span>
        </div>
      </AnimatedSection>

      <Footer />
    </div>
  );
};

export default AboutPage;
