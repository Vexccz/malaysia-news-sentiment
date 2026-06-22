import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await register(formData);
      navigate('/dashboard');
    } catch (err) {
      setErrors({ form: err.response?.data?.error || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Editorial Visual */}
      <div className="hidden lg:flex lg:w-[55%] bg-zinc-50 dark:bg-zinc-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-50/30 dark:bg-red-950/10" />
        
        {/* Decorative lines */}
        <div className="absolute top-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-800" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-800" />
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-20 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            {/* Masthead */}
            <div className="border-b-2 border-zinc-900 dark:border-zinc-700 pb-8">
              <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">
                <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
                <span>Kuala Lumpur</span>
                <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
              </div>
              <h3 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                Never Miss a
              </h3>
              <p className="text-3xl md:text-4xl font-serif italic text-red-700 dark:text-red-500">
                Narrative Shift.
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-6">
              <div className="border-l-2 border-red-700 dark:border-red-500 pl-4">
                <h4 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  Real-Time Tracking
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Monitor sentiment shifts as they happen across 14+ Malaysian news sources
                </p>
              </div>

              <div className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4">
                <h4 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  AI Classification
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Powered by Malaya NLP for accurate Malaysian context understanding
                </p>
              </div>

              <div className="border-l-2 border-zinc-300 dark:border-zinc-700 pl-4">
                <h4 className="text-lg font-serif font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  Visual Analytics
                </h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Heatmaps, trends, and entity graphs for deep insight
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className="border-2 border-zinc-900 dark:border-zinc-700 p-6 bg-white dark:bg-zinc-800">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-serif font-bold text-red-700 dark:text-red-500">14+</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400 mt-1">Sources</div>
                </div>
                <div>
                  <div className="text-3xl font-serif font-bold text-red-700 dark:text-red-500">24/7</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400 mt-1">Monitor</div>
                </div>
                <div>
                  <div className="text-3xl font-serif font-bold text-red-700 dark:text-red-500">95%</div>
                  <div className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400 mt-1">Accuracy</div>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-serif italic border-t border-zinc-200 dark:border-zinc-800 pt-8">
              Join researchers, journalists, and analysts tracking Malaysian public sentiment.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-6 sm:px-12 lg:px-20 bg-white dark:bg-zinc-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto"
        >
          {/* Logo/Brand */}
          <div className="mb-12">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              <span className="font-serif">MY News</span>{' '}
              <span className="font-serif italic text-red-700 dark:text-red-500">Sentiment</span>
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
              Create Account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.form && (
              <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">{errors.form}</p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="Ahmad bin Abdullah"
              />
              {errors.name && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="ahmad@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="Min. 8 characters"
              />
              {errors.password && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-900 dark:text-zinc-300 mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-red-700 dark:focus:border-red-500 transition-colors"
                placeholder="Re-enter password"
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{errors.confirmPassword}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </motion.button>
          </form>

          {/* Login link */}
          <p className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-red-700 dark:text-red-500 hover:text-red-800 dark:hover:text-red-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default RegisterPage;
