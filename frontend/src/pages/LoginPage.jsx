import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
  const { login, guestLogin } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await guestLogin();
      navigate('/dashboard');
    } catch (err) {
      setError('Guest login failed. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-white dark:bg-zinc-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto"
        >
          {/* Logo/Brand */}
          <div className="mb-12">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              <span className="font-serif">MY News</span>{' '}
              <span className="font-serif italic text-red-700 dark:text-red-500">Sentiment</span>
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              Est. 2026 · Kuala Lumpur
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="ahmad@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 border-2 border-zinc-900 dark:border-zinc-700 text-red-700 focus:ring-red-700 dark:focus:ring-red-500"
                />
                <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                  Remember me
                </span>
              </label>
              <Link
                to="/reset-password"
                className="text-red-700 dark:text-red-500 hover:text-red-800 dark:hover:text-red-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </motion.button>
          </form>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-red-700 dark:text-red-500 hover:text-red-800 dark:hover:text-red-400 transition-colors"
            >
              Create account
            </Link>
          </p>

          {/* Guest login */}
          <div className="mt-4 text-center">
            <button
              onClick={handleGuest}
              disabled={guestLoading}
              className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {guestLoading ? 'Entering...' : 'Continue as Guest'}
            </button>
            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
              Guest mode has limited features
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right side - Editorial Visual */}
      <div className="hidden lg:flex lg:w-[55%] bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-50/30 dark:bg-red-950/10" />
        
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-800" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20 w-full">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            {/* Masthead style header */}
            <div className="border-b-2 border-zinc-900 dark:border-zinc-700 pb-8">
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
                <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
                <span>Vol. 1 · No. 01</span>
                <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <h3 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                Malaysia News
              </h3>
              <p className="text-3xl md:text-4xl font-serif italic text-red-700 dark:text-red-500">
                Reported Plainly.
              </p>
            </div>

            {/* Featured article card */}
            <div className="border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Live Analysis
                </span>
              </div>
              <h4 className="text-xl font-serif font-bold text-zinc-900 dark:text-zinc-50 mb-4 leading-tight">
                Malaysia's GDP grows 5.2% in Q1 2026
              </h4>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium uppercase tracking-wide">
                  Positive
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Score: 0.87
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8">
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
                Powered By
              </p>
              <div className="flex flex-wrap gap-2">
                {['Malaysiakini', 'Astro Awani', 'FMT', 'Bernama', 'The Star'].map((source) => (
                  <span
                    key={source}
                    className="px-3 py-1 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>

            {/* Tagline */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-serif italic">
              Real-time AI that monitors, classifies, and visualises sentiment across Malaysia's top news sources.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
