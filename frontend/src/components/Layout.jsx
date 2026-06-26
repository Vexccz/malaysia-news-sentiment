import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ThemeToggle from './ThemeToggle';
import QuickStatsBar from './QuickStatsBar';
import NotificationsBell from './NotificationsBell';

const navItems = [
  { path: '/dashboard', labelKey: 'dashboard', tourId: 'dashboard', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { path: '/trending', labelKey: 'trending', tourId: 'trending', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  )},
  { path: '/feed', labelKey: 'liveFeed', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
    </svg>
  )},
  { path: '/timeline', labelKey: 'timeline', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { path: '/entities', labelKey: 'entities', tourId: 'entities', labelOverride: 'Entities', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
      <line x1="6" y1="7" x2="10" y2="10"/><line x1="18" y1="7" x2="14" y2="10"/><line x1="6" y1="17" x2="10" y2="14"/><line x1="18" y1="17" x2="14" y2="14"/>
    </svg>
  )},
  { path: '/community', labelKey: 'community', labelOverride: 'Community', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )},
  { path: '/history', labelKey: 'history', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  )},
  { path: '/forecast', labelKey: 'forecast', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { path: '/digest', labelKey: 'digest', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/>
    </svg>
  )},
  { path: '/search', labelKey: 'search', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  )},
  { path: '/compare', labelKey: 'compare', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
    </svg>
  )},
  { path: '/alerts', labelKey: 'alerts', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )},
  { path: '/credibility', labelKey: 'sources', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )},
  { path: '/bookmarks', labelKey: 'bookmarks', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
    </svg>
  )},
  { path: '/reports', labelKey: 'reports', tourId: 'reports', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )},
  { path: '/heatmap', labelKey: 'heatmap', tourId: 'heatmap', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  )},
  { path: '/categories', labelKey: 'categories', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { path: '/settings', labelKey: 'settings', icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )},
];

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || user?.email || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex h-screen bg-paper dark:bg-paper-dark overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-paper-card dark:bg-paper-dark-card border-r border-paper-line dark:border-paper-dark-line
        flex flex-col
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Masthead */}
        <div className="px-5 py-5 border-b-2 border-ink dark:border-paper">
          <Link to="/" className="block no-underline">
            <p className="editorial-kicker mb-1">The Sentiment</p>
            <h1 className="font-display font-bold text-xl leading-none text-ink dark:text-paper">
              MY News <span className="italic text-accent">Sentiment</span>
            </h1>
            <p className="text-[10px] text-ink-muted dark:text-ink-faint mt-1 tracking-wide">VOL. I · KUALA LUMPUR</p>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-ink-muted dark:text-ink-faint px-3 pb-2 pt-1 font-sans">{t('sections')}</p>
          {/* Primary nav group */}
          {navItems.slice(0, 4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour={item.tourId || undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 text-[13px] no-underline transition-colors border-l-2 font-sans
                  ${active
                    ? 'border-ink dark:border-paper bg-paper dark:bg-[#111] text-ink dark:text-paper font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper hover:border-ink/20 dark:hover:border-paper/20'
                  }
                `}
              >
                <span className={active ? 'text-ink dark:text-paper' : ''}>{item.icon}</span>
                {item.labelOverride || t(item.labelKey)}
              </Link>
            );
          })}

          {/* Section separator */}
          <div className="my-3 mx-3 border-t border-paper-line dark:border-paper-dark-line" />

          {/* Secondary nav group */}
          {navItems.slice(4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-tour={item.tourId || undefined}
                className={`
                  flex items-center gap-3 px-3 py-2 text-[13px] no-underline transition-colors border-l-2 font-sans
                  ${active
                    ? 'border-ink dark:border-paper bg-paper dark:bg-[#111] text-ink dark:text-paper font-semibold'
                    : 'border-transparent text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper hover:border-ink/20 dark:hover:border-paper/20'
                  }
                `}
              >
                <span className={active ? 'text-ink dark:text-paper' : ''}>{item.icon}</span>
                {item.labelOverride || t(item.labelKey)}
              </Link>
            );
          })}

          {/* Section separator before admin */}
          {user?.role === 'admin' && (
            <div className="my-3 mx-3 border-t border-paper-line dark:border-paper-dark-line" />
          )}

          {/* Admin link */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className={`
                flex items-center gap-3 px-3 py-2 text-[13px] no-underline transition-colors border-l-2 mt-2 font-sans
                ${location.pathname === '/admin'
                  ? 'border-ink dark:border-paper bg-paper dark:bg-[#111] text-ink dark:text-paper font-semibold'
                  : 'border-transparent text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper hover:border-ink/20 dark:hover:border-paper/20'
                }
              `}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                              </svg>
                              {t('admin')}
                            </Link>
          )}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-paper-line dark:border-paper-dark-line p-3 space-y-2">
          <div className="flex items-center justify-between px-2 gap-2">
            <ThemeToggle />
            {user && <NotificationsBell />}
          </div>
          {user && (
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 p-2 rounded-sm hover:bg-paper dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold font-display">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink dark:text-paper truncate">{user.name}</p>
                <p className="text-[11px] text-ink-muted dark:text-ink-faint truncate">{user.email || user.phone || ''}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="p-1.5 rounded-sm hover:bg-accent/10 text-ink-muted hover:text-accent transition-colors"
                title={t('logout')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-paper-card dark:bg-paper-dark-card border-b-2 border-ink dark:border-paper">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-sm hover:bg-paper dark:hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <Link to="/" className="font-display font-bold text-sm text-ink dark:text-paper no-underline">MY News <span className="italic text-accent">Sentiment</span></Link>
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <QuickStatsBar />
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
