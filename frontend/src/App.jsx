import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Lazy-loaded heavy pages (code splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Heatmap = lazy(() => import('./pages/Heatmap'));
const EntityGraphPage = lazy(() => import('./pages/EntityGraphPage'));
const Reports = lazy(() => import('./pages/Reports'));
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
const LiveFeed = lazy(() => import('./pages/LiveFeed'));
const Forecast = lazy(() => import('./pages/Forecast'));
const Categories = lazy(() => import('./pages/Categories'));
const SentimentTimeline = lazy(() => import('./pages/SentimentTimeline'));
const ComparePage = lazy(() => import('./pages/Compare'));
const Trending = lazy(() => import('./pages/Trending'));
const Digest = lazy(() => import('./pages/Digest'));
const AdvancedAnalytics = lazy(() => import('./pages/AdvancedAnalytics'));
const SharedArticles = lazy(() => import('./pages/SharedArticles'));


// Lighter pages - still lazy but less critical
const History = lazy(() => import('./pages/History'));
const CommunityPage = lazy(() => import('./pages/CommunityPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Alerts = lazy(() => import('./pages/Alerts'));
const SourceCredibility = lazy(() => import('./pages/SourceCredibility'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const SharedArticle = lazy(() => import('./pages/SharedArticle'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));

// Use case pages (lazy loaded)
const ResearchersPage = lazy(() => import('./pages/usecases/ResearchersPage'));
const JournalistsPage = lazy(() => import('./pages/usecases/JournalistsPage'));
const AnalystsPage = lazy(() => import('./pages/usecases/AnalystsPage'));
const PolicyMakersPage = lazy(() => import('./pages/usecases/PolicyMakersPage'));
const PRPage = lazy(() => import('./pages/usecases/PRPage'));
const StudentsPage = lazy(() => import('./pages/usecases/StudentsPage'));

// Small/auth pages - eagerly loaded for fast navigation
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import StaticPage from './pages/StaticPage';
import ContactPage from './pages/ContactPage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import ChangelogPage from './pages/ChangelogPage';
import InsightsLabPage from './pages/InsightsLabPage';
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
import NotFound from './pages/NotFound';
import VerifyEmailPage from './pages/VerifyEmailPage';

import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';
import { ArticleAnalysisProvider } from './context/ArticleAnalysisContext';
import OfflineBanner from './components/OfflineBanner';
import Layout from './components/Layout';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { FreshnessProvider } from './context/FreshnessContext';
import OnboardingTour from './components/OnboardingTour';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx client errors (except 429 rate limit)
        if (error?.response?.status && error.response.status < 500 && error.response.status !== 429) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const SideLink = ({ to, children, icon, onClick }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`sidebar-link ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{children}</span>
    </Link>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Verifying Neural Link..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Code Quality #20: Separate guard for admin-only routes — checks role, not just auth.
// Without this, any logged-in user could navigate to /admin via the URL bar.
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Verifying Access..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

const Sidebar = ({ isOpen, isCollapsed, onClose }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const initials = (user?.name || user?.email || 'User').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <div className="logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
            </svg>
          </div>
          <div className="logo-text">MY News <span>Sentiment</span></div>
        </Link>

        <div className="sidebar-section">
          <div className="sidebar-section-label">{t('analyticsSection')}</div>
          <nav className="sidebar-nav">
            <SideLink to="/dashboard" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            }>{t('dashboard')}</SideLink>
            <SideLink to="/compare" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
              </svg>
            }>{t('compareMode')}</SideLink>
            <SideLink to="/trending" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            }>{t('trending')}</SideLink>
            <SideLink to="/history" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            }>{t('history')}</SideLink>
            <SideLink to="/feed" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
              </svg>
            }>{t('liveFeed')}</SideLink>
            <SideLink to="/timeline" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            }>{t('timeline')}</SideLink>
            <SideLink to="/analytics" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
            }>Advanced Analytics</SideLink>
            <SideLink to="/entities" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
                <line x1="6" y1="7" x2="10" y2="10"/><line x1="18" y1="7" x2="14" y2="10"/><line x1="6" y1="17" x2="10" y2="14"/><line x1="18" y1="17" x2="14" y2="14"/>
              </svg>
            }>{t('entities')}</SideLink>
          </nav>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">{t('systemSection')}</div>
          <nav className="sidebar-nav">
            {user?.role === 'admin' && (
              <SideLink to="/admin" onClick={onClose} icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>
              }>{t('admin')}</SideLink>
            )}
            <SideLink to="/bookmarks" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            }>{t('bookmarks')}</SideLink>
            <SideLink to="/settings" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
            }>{t('settings')}</SideLink>
            <SideLink to="/shared-articles" onClick={onClose} icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            }>{t('sharedArticles')}</SideLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} className="sidebar-avatar-img" loading="lazy" decoding="async" />
                : <div className="sidebar-avatar">{initials}</div>
              }
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-email">{user.email || user.phone || ''}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: 'var(--text-400)', padding: '0 2px', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-500)', marginBottom: 3 }}>Powered by</div>
              <div>NewsAPI · GPT-4o-mini</div>
              <div>MongoDB Atlas · 2026</div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};


import SidebarToggle from './components/SidebarToggle';

const TITLES = { 
  '/dashboard': 'dashboard', 
  '/history': 'history', 
  '/settings': 'settings', 
  '/compare': 'compareMode', 
  '/admin': 'admin',
  '/bookmarks': 'bookmarks',
  '/trending': 'trending',
  '/entities': 'entities',
  '/feed': 'liveFeed',
  '/timeline': 'timeline',
  '/alerts': 'alerts',
  '/analytics': 'advancedAnalytics',
  '/shared-articles': 'sharedArticles',
  '/credibility': 'sources',
  '/digest': 'digest',
  '/search': 'search',
  '/api-docs': 'apiDocs'
};

// ── Bottom Navigation Bar (Mobile Only) — StatusMy Pattern ──────────────────────
const BottomNav = () => {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close more popup on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [loc.pathname]);

  // #11 Back gesture handling for More popup
  useEffect(() => {
    if (!moreOpen) return;
    window.history.pushState(null, '');
    const handlePop = () => setMoreOpen(false);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [moreOpen]);

  const handleMoreNav = useCallback((path) => {
    navigate(path);
    setMoreOpen(false);
  }, [navigate]);

  if (!isMobile) return null;

  const tabs = [
    { path: '/dashboard', label: t('dashboard'), icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { path: '/trending', label: t('trending'), icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    )},
    { path: '/entities', label: t('entities'), icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
        <line x1="6" y1="7" x2="10" y2="10"/><line x1="18" y1="7" x2="14" y2="10"/><line x1="6" y1="17" x2="10" y2="14"/><line x1="18" y1="17" x2="14" y2="14"/>
      </svg>
    )},
    { path: '/history', label: t('history'), icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    )},
  ];

  const isActive = (path) => {
    if (path === '/dashboard') return loc.pathname === '/dashboard';
    return loc.pathname.startsWith(path);
  };

  const moreActive = moreOpen || ['/compare', '/bookmarks', '/settings', '/admin'].includes(loc.pathname);

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="bottom-nav-more-overlay open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More Popup */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="bottom-nav-more-popup open"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="bottom-nav-more-popup-handle" />
            <button onClick={() => handleMoreNav('/compare')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
              </svg>
              {t('compareMode')}
            </button>
            <button onClick={() => handleMoreNav('/bookmarks')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
              </svg>
              {t('bookmarks')}
            </button>
            <button onClick={() => handleMoreNav('/settings')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              {t('settings')}
            </button>
            {user?.role === 'admin' && (
              <button onClick={() => handleMoreNav('/admin')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/>
                </svg>
                {t('admin')}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar — 64px, StatusMy pattern */}
      <nav className="bottom-nav">
        {tabs.map(tab => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`bottom-nav-item ${active ? 'active' : ''}`}
            >
              {active && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="bottom-nav-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          className={`bottom-nav-item ${moreActive ? 'active' : ''}`}
          onClick={() => setMoreOpen(prev => !prev)}
        >
          {moreActive && (
            <motion.div
              layoutId="bottom-nav-indicator"
              className="bottom-nav-indicator"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
          <span>More</span>
        </button>
      </nav>
    </>
  );
};

const AppShell = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  
  const { t, lang, toggleLanguage } = useLanguage();
  const loc = useLocation();
  const titleKey = TITLES[loc.pathname] || 'dashboard';

  const toggleSidebar = () => {
    if (window.innerWidth > 1024) {
      const newState = !isSidebarCollapsed;
      setIsSidebarCollapsed(newState);
      localStorage.setItem('sidebar-collapsed', newState);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar 
        isOpen={isSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="main-area">
        <OfflineBanner />
        <header className="topbar">
          <div className="topbar-left">
            <div className="topbar-hamburger-wrap">
              <SidebarToggle 
                isOpen={window.innerWidth > 1024 ? !isSidebarCollapsed : isSidebarOpen} 
                onToggle={toggleSidebar} 
              />
            </div>
            <h1 className="topbar-title">{t(titleKey)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="btn-outline" onClick={toggleLanguage} style={{ fontSize: '11px', fontWeight: 800 }}>
              {lang === 'en' ? '🇲🇾 BM' : '🇺🇸 EN'}
            </button>
            <button className="btn-outline mobile-hide" onClick={() => window.location.reload()}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>
        </header>
        <main className="page-body" id="main-content">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
};

import { SocketProvider } from './context/SocketContext';
import LoadingSpinner from './components/LoadingSpinner';

const AppInner = () => (
  <Suspense fallback={<LoadingSpinner />}>
  <PageTransition>
  <Routes>
    <Route path="/"               element={<LandingPage />} />
    <Route path="/login"          element={<LoginPage />} />
    <Route path="/register"       element={<RegisterPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/verify-email"   element={<VerifyEmailPage />} />

    <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
    <Route path="/trending" element={<ProtectedRoute><Layout><Trending /></Layout></ProtectedRoute>} />
    <Route path="/compare" element={<ProtectedRoute><Layout><ComparePage /></Layout></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
    <Route path="/bookmarks" element={<ProtectedRoute><Layout><Bookmarks /></Layout></ProtectedRoute>} />
    <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
    <Route path="/entities" element={<ProtectedRoute><Layout><EntityGraphPage /></Layout></ProtectedRoute>} />
    <Route path="/feed" element={<ProtectedRoute><Layout><LiveFeed /></Layout></ProtectedRoute>} />
    <Route path="/timeline" element={<ProtectedRoute><Layout><SentimentTimeline /></Layout></ProtectedRoute>} />
    <Route path="/alerts" element={<ProtectedRoute><Layout><Alerts /></Layout></ProtectedRoute>} />
    <Route path="/insights-lab" element={<ProtectedRoute><Layout><InsightsLabPage /></Layout></ProtectedRoute>} />
    <Route path="/agent" element={<ProtectedRoute><Layout><Suspense fallback={<div className="p-8 text-center">Loading...</div>}><AgentDashboard /></Suspense></Layout></ProtectedRoute>} />
    <Route path="/credibility" element={<ProtectedRoute><Layout><SourceCredibility /></Layout></ProtectedRoute>} />
    <Route path="/digest" element={<ProtectedRoute><Layout><Digest /></Layout></ProtectedRoute>} />
    <Route path="/search" element={<ProtectedRoute><Layout><AdvancedSearch /></Layout></ProtectedRoute>} />
    <Route path="/api-docs/*" element={<ApiDocs />} />
    <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
    <Route path="/heatmap" element={<ProtectedRoute><Layout><Heatmap /></Layout></ProtectedRoute>} />
    <Route path="/categories" element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />
    <Route path="/forecast" element={<ProtectedRoute><Layout><Forecast /></Layout></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><Layout><AdvancedAnalytics /></Layout></ProtectedRoute>} />
    <Route path="/shared-articles" element={<ProtectedRoute><Layout><SharedArticles /></Layout></ProtectedRoute>} />
    <Route path="/community" element={<ProtectedRoute><Layout><CommunityPage /></Layout></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>} />

    <Route path="/articles/:id" element={<ProtectedRoute><Layout><ArticleDetail /></Layout></ProtectedRoute>} />
    
    {/* Public shared article page (no auth, no layout) */}
    <Route path="/shared/:id" element={<SharedArticle />} />
    
    {/* Static Informational Pages */}
    <Route path="/contact" element={<ContactPage />} />
    <Route path="/features" element={<FeaturesPage />} />
    <Route path="/pricing" element={<PricingPage />} />
    <Route path="/about" element={<AboutPage />} />
    <Route path="/changelog" element={<ChangelogPage />} />
    <Route path="/jobs" element={<StaticPage />} />
    <Route path="/privacy" element={<StaticPage />} />
    
    {/* Use Case Pages */}
    <Route path="/use-cases/researchers" element={<ResearchersPage />} />
    <Route path="/use-cases/journalists" element={<JournalistsPage />} />
    <Route path="/use-cases/analysts" element={<AnalystsPage />} />
    <Route path="/use-cases/policy-makers" element={<PolicyMakersPage />} />
    <Route path="/use-cases/pr" element={<PRPage />} />
    <Route path="/use-cases/students" element={<StudentsPage />} />
    
    {/* Cinematic 404 Route */}
    <Route path="*" element={<NotFound />} />
  </Routes>
  </PageTransition>
  </Suspense>
);

const AppRoutes = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts({
    onShowHelp: () => setShowShortcuts(true),
    onCloseModals: () => setShowShortcuts(false),
  });

  return (
    <>
      <AppInner />
      <OnboardingTour />
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <FreshnessProvider><LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <ArticleAnalysisProvider>
                <Router>
                  <AppRoutes />
                  <Toaster
                    position={window.innerWidth <= 768 ? 'bottom-center' : 'top-center'}
                    containerStyle={window.innerWidth <= 768 ? { bottom: 80 } : { top: 10 }}
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#fff',
                        color: '#111',
                        border: 'none',
                        borderLeft: '3px solid #111',
                        fontFamily: "'Inter', -apple-system, sans-serif",
                        fontSize: '12px',
                        borderRadius: '0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        padding: '12px 16px',
                        letterSpacing: '0.01em',
                        maxWidth: '360px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#111',
                          secondary: '#fff',
                        },
                        style: {
                          borderLeftColor: '#111',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#111',
                          secondary: '#fff',
                        },
                        style: {
                          borderLeftColor: '#dc2626',
                        },
                      },
                    }}
                  />
                </Router>
              </ArticleAnalysisProvider>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider></FreshnessProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

