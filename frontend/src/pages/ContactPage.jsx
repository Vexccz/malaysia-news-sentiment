import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import {
  Newspaper, Sun, Moon, Mail, MapPin, Clock, Send, CheckCircle
} from 'lucide-react';

// ── Animation Variants ──
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ── Navbar ──
const Navbar = ({ isDark, toggleTheme, navigate }) => (
  <motion.nav
    className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0f0f0f]/80 border-b border-ink/10 dark:border-paper/10"
    initial={{ y: -80 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold text-ink dark:text-paper">
        <Newspaper className="w-5 h-5 text-accent" />
        <span>MY News <span className="text-accent">Sentiment</span></span>
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm text-ink-muted dark:text-ink-faint">
        <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
        <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
        <Link to="/about" className="hover:text-accent transition-colors">About</Link>
        <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 hover:bg-ink/5 dark:hover:bg-paper/5 transition-colors">
          {isDark ? <Sun className="w-4 h-4 text-ink-muted" /> : <Moon className="w-4 h-4 text-ink-muted" />}
        </button>
        <Link to="/login" className="hidden sm:inline-flex text-sm font-medium text-ink-muted dark:text-ink-faint hover:text-accent transition-colors">
          Log in
        </Link>
        <motion.button
          onClick={() => navigate('/register')}
          className="px-4 py-2 text-sm font-medium text-paper dark:text-ink bg-accent border border-accent transition-colors"
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
  <footer className="border-t border-ink/10 dark:border-paper/10 bg-paper dark:bg-ink">
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
          <h4 className="text-sm font-semibold text-ink dark:text-paper mb-4">Product</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/features" className="hover:text-accent transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link>
            <Link to="/api" className="hover:text-accent transition-colors">API</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink dark:text-paper mb-4">Company</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/contact" className="hover:text-accent transition-colors">Contact</Link>
            <Link to="/jobs" className="hover:text-accent transition-colors">Careers</Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-ink dark:text-paper mb-4">Legal</h4>
          <div className="flex flex-col gap-2 text-sm text-ink-muted dark:text-ink-faint">
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-ink/10 dark:border-paper/10 text-center text-sm text-ink/40 dark:text-paper/40">
        © 2026 MY News Sentiment. All rights reserved.
      </div>
    </div>
  </footer>
);

const ContactPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    }, 1200);
  };

  const contactInfo = [
    { icon: Mail, title: 'Email', detail: 'support@mynewssentiment.com', sub: 'We reply within 24 hours' },
    { icon: MapPin, title: 'Location', detail: 'Universiti Malaysia Pahang Al-Sultan Abdullah', sub: 'Pekan, Pahang, Malaysia' },
    { icon: Clock, title: 'Working Hours', detail: 'Mon - Fri, 9:00 AM - 6:00 PM', sub: 'Malaysia Time (GMT+8)' },
  ];

  return (
    <div className="min-h-screen bg-paper dark:bg-ink transition-colors">
      <Navbar isDark={isDark} toggleTheme={toggleTheme} navigate={navigate} />

      {/* ─── HERO ─── */}
      <motion.header className="pt-32 pb-8 px-6 text-center" initial="hidden" animate="visible" variants={staggerContainer}>
        <div className="max-w-3xl mx-auto">
          <motion.p variants={staggerItem} className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-4">Contact</motion.p>
          <motion.h1 variants={staggerItem} className="text-4xl sm:text-5xl font-['Playfair_Display'] font-bold text-ink dark:text-paper mb-4">Contact</motion.h1>
          <div className="w-24 h-px bg-ink/20 dark:bg-paper/20 mx-auto mb-3" />
          <div className="w-16 h-px bg-ink/20 dark:bg-paper/20 mx-auto mb-6" />
          <motion.p variants={staggerItem} className="text-lg text-ink-muted dark:text-ink-faint font-sans">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </motion.p>
        </div>
      </motion.header>

      {/* ─── CONTENT ─── */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Info Cards */}
          <motion.div className="lg:col-span-2 space-y-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
            {contactInfo.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-4 p-5 border border-ink/10 dark:border-paper/10"
                variants={staggerItem}
                whileHover={{ y: -2 }}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-accent/10 flex-shrink-0">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-1">{item.title}</p>
                  <h3 className="text-sm font-semibold text-ink dark:text-paper">{item.detail}</h3>
                  <p className="text-xs text-ink/40 dark:text-paper/40 mt-0.5">{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Form */}
          <motion.form
            className="lg:col-span-3 p-8 border border-ink/10 dark:border-paper/10"
            onSubmit={handleSubmit}
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            {submitted && (
              <motion.div
                className="flex items-center gap-2 p-4 mb-6 border-l-2 border-green-600 text-sm text-green-700 dark:text-green-300 bg-green-50/50 dark:bg-green-900/10"
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle className="w-4 h-4" />
                Message sent successfully! We'll get back to you soon.
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-1.5">Name</label>
                <input
                  type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="Your name" required
                  className="w-full px-4 py-2.5 text-sm bg-paper dark:bg-ink border-2 border-ink dark:border-paper text-ink dark:text-paper placeholder-ink/40 dark:placeholder-paper/40 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-1.5">Email</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="you@example.com" required
                  className="w-full px-4 py-2.5 text-sm bg-paper dark:bg-ink border-2 border-ink dark:border-paper text-ink dark:text-paper placeholder-ink/40 dark:placeholder-paper/40 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-ink-muted dark:text-ink-faint font-sans mb-1.5">Message</label>
              <textarea
                name="message" value={formData.message} onChange={handleChange}
                placeholder="Tell us more..." rows={5} required
                className="w-full px-4 py-2.5 text-sm bg-paper dark:bg-ink border-2 border-ink dark:border-paper text-ink dark:text-paper placeholder-ink/40 dark:placeholder-paper/40 focus:outline-none focus:border-accent transition-colors resize-none"
              />
            </div>

            <motion.button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-accent border border-accent text-white font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            >
              {sending ? (
                'Sending...'
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Message
                </>
              )}
            </motion.button>
          </motion.form>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
