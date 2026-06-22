import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { Newspaper, Sun, Moon, Home, ArrowLeft, LayoutDashboard, Search } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0f0f0f] transition-colors flex flex-col relative">
      {/* Background grid — simple border lines */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 60px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 60px)',
        }}
      />

      {/* Navbar */}
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

      {/* 404 Content */}
      <div className="flex-1 flex items-center justify-center px-6 pt-16 relative z-10">
        <motion.div
          className="text-center max-w-lg"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* 404 heading */}
          <div className="relative inline-block">
            <motion.div
              className="text-[140px] sm:text-[180px] font-black text-ink dark:text-paper leading-none select-none"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              404
            </motion.div>
          </div>

          {/* Search icon */}
          <motion.div
            className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mt-4 mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Search className="w-7 h-7 text-accent" />
          </motion.div>

          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Page not found
          </motion.h1>
          <motion.p
            className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </motion.p>

          {/* Action buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <motion.button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-accent rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            >
              <Home className="w-4 h-4" /> Go Home
            </motion.button>
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-accent border border-accent/30 rounded-lg hover:bg-accent/5 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </motion.button>
            <motion.button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border border-[#eee] dark:border-[#2a2a2a] rounded-lg hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </motion.button>
          </motion.div>

          {/* Helpful links */}
          <motion.div
            className="mt-10 pt-6 border-t border-[#eee] dark:border-[#2a2a2a]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Popular pages</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: 'Features', to: '/features' },
                { label: 'Pricing', to: '/pricing' },
                { label: 'API Docs', to: '/api' },
                { label: 'About', to: '/about' },
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-[#1a1a1a] border border-[#eee] dark:border-[#2a2a2a] rounded-lg hover:border-accent hover:text-accent transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
