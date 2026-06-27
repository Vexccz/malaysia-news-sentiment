import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Bookmark, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Mobile bottom navigation — 4 main entry points.
 *
 * Hidden on lg+ (sidebar shown there). Sticky bottom on mobile,
 * editorial border-top, no rounded corners, sentiment accent on active.
 *
 * Why these 4: covers 80%+ of mobile flows (read latest, search, save,
 * account). Anything else: hamburger menu / sidebar.
 */
const BottomNav = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  const items = [
    { to: '/', label: t('home', 'Home'),         icon: Home,     match: (p) => p === '/' || p === '/dashboard' },
    { to: '/search', label: t('search', 'Search'), icon: Search,   match: (p) => p.startsWith('/search') },
    { to: '/bookmarks', label: t('bookmarks', 'Saved'), icon: Bookmark, match: (p) => p.startsWith('/bookmarks') },
    { to: '/profile', label: t('profile', 'Profile'), icon: User,    match: (p) => p.startsWith('/profile') || p.startsWith('/settings') },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper dark:bg-[#0a0a0a] border-t-2 border-ink dark:border-paper"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-wider font-sans transition-colors ${
                active
                  ? 'text-accent border-t-2 border-accent -mt-[2px]'
                  : 'text-ink-muted dark:text-ink-faint hover:text-ink dark:hover:text-paper'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
