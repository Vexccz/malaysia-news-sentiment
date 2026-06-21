1|import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
2|import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
3|import { motion, AnimatePresence } from 'framer-motion';
4|import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
5|import { GoogleOAuthProvider } from '@react-oauth/google';
6|import { Toaster } from 'react-hot-toast';
7|import { AuthProvider, useAuth } from './context/AuthContext';
8|import { ThemeProvider } from './context/ThemeContext';
9|import { LanguageProvider, useLanguage } from './context/LanguageContext';
10|
11|// Lazy-loaded heavy pages (code splitting)
12|const Dashboard = lazy(() => import('./pages/Dashboard'));
13|const LandingPage = lazy(() => import('./pages/LandingPage'));
14|const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
15|const Heatmap = lazy(() => import('./pages/Heatmap'));
16|const EntityGraphPage = lazy(() => import('./pages/EntityGraphPage'));
17|const Reports = lazy(() => import('./pages/Reports'));
18|const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
19|const LiveFeed = lazy(() => import('./pages/LiveFeed'));
20|const Forecast = lazy(() => import('./pages/Forecast'));
21|const Categories = lazy(() => import('./pages/Categories'));
22|const SentimentTimeline = lazy(() => import('./pages/SentimentTimeline'));
23|const ComparePage = lazy(() => import('./pages/Compare'));
24|const Trending = lazy(() => import('./pages/Trending'));
25|const Digest = lazy(() => import('./pages/Digest'));
26|
27|// Lighter pages - still lazy but less critical
28|const History = lazy(() => import('./pages/History'));
29|const Bookmarks = lazy(() => import('./pages/Bookmarks'));
30|const Alerts = lazy(() => import('./pages/Alerts'));
31|const SourceCredibility = lazy(() => import('./pages/SourceCredibility'));
32|const ApiDocs = lazy(() => import('./pages/ApiDocs'));
33|const SharedArticle = lazy(() => import('./pages/SharedArticle'));
34|
35|// Use case pages (lazy loaded)
36|const ResearchersPage = lazy(() => import('./pages/usecases/ResearchersPage'));
37|const JournalistsPage = lazy(() => import('./pages/usecases/JournalistsPage'));
38|const AnalystsPage = lazy(() => import('./pages/usecases/AnalystsPage'));
39|const PolicyMakersPage = lazy(() => import('./pages/usecases/PolicyMakersPage'));
40|const PRPage = lazy(() => import('./pages/usecases/PRPage'));
41|const StudentsPage = lazy(() => import('./pages/usecases/StudentsPage'));
42|
43|// Small/auth pages - eagerly loaded for fast navigation
44|import SettingsPage from './pages/SettingsPage';
45|import LoginPage from './pages/LoginPage';
46|import RegisterPage from './pages/RegisterPage';
47|import ResetPasswordPage from './pages/ResetPasswordPage';
48|import StaticPage from './pages/StaticPage';
49|import ContactPage from './pages/ContactPage';
50|import FeaturesPage from './pages/FeaturesPage';
51|import PricingPage from './pages/PricingPage';
52|import AboutPage from './pages/AboutPage';
53|import NotFound from './pages/NotFound';
54|import VerifyEmailPage from './pages/VerifyEmailPage';
55|
56|import LoadingScreen from './components/LoadingScreen';
57|import ErrorBoundary from './components/ErrorBoundary';
58|import PageTransition from './components/PageTransition';
59|import { ArticleAnalysisProvider } from './context/ArticleAnalysisContext';
60|import OfflineBanner from './components/OfflineBanner';
61|import Layout from './components/Layout';
62|
63|const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
64|
65|// Create a client
66|const queryClient = new QueryClient({
67|  defaultOptions: {
68|    queries: {
69|      refetchOnWindowFocus: false,
70|      retry: (failureCount, error) => {
71|        // Don't retry on 4xx client errors (except 429 rate limit)
72|        if (error?.response?.status && error.response.status < 500 && error.response.status !== 429) {
73|          return false;
74|        }
75|        return failureCount < 2;
76|      },
77|      staleTime: 5 * 60 * 1000, // 5 minutes
78|    },
79|  },
80|});
81|
82|const SideLink = ({ to, children, icon, onClick }) => {
83|  const loc = useLocation();
84|  const active = loc.pathname === to;
85|  return (
86|    <Link to={to} className={`sidebar-link ${active ? 'active' : ''}`} onClick={onClick}>
87|      {icon}
88|      <span>{children}</span>
89|    </Link>
90|  );
91|};
92|
93|const ProtectedRoute = ({ children }) => {
94|  const { user, loading } = useAuth();
95|  if (loading) return <LoadingScreen message="Verifying Neural Link..." />;
96|  if (!user) return <Navigate to="/login" replace />;
97|  return children;
98|};
99|
100|// Code Quality #20: Separate guard for admin-only routes — checks role, not just auth.
101|// Without this, any logged-in user could navigate to /admin via the URL bar.
102|const AdminRoute = ({ children }) => {
103|  const { user, loading } = useAuth();
104|  if (loading) return <LoadingScreen message="Verifying Access..." />;
105|  if (!user) return <Navigate to="/login" replace />;
106|  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
107|  return children;
108|};
109|
110|const Sidebar = ({ isOpen, isCollapsed, onClose }) => {
111|  const { user } = useAuth();
112|  const { t } = useLanguage();
113|  const initials = (user?.name || user?.email || 'User').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
114|
115|  return (
116|    <>
117|      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
118|      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
119|        <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
120|          <div className="logo-mark">
121|            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
122|              <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
123|            </svg>
124|          </div>
125|          <div className="logo-text">MY News <span>Sentiment</span></div>
126|        </Link>
127|
128|        <div className="sidebar-section">
129|          <div className="sidebar-section-label">{t('analyticsSection')}</div>
130|          <nav className="sidebar-nav">
131|            <SideLink to="/dashboard" onClick={onClose} icon={
132|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
133|                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
134|                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
135|              </svg>
136|            }>{t('dashboard')}</SideLink>
137|            <SideLink to="/compare" onClick={onClose} icon={
138|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
139|                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
140|              </svg>
141|            }>{t('compareMode')}</SideLink>
142|            <SideLink to="/trending" onClick={onClose} icon={
143|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
144|                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
145|              </svg>
146|            }>{t('trending')}</SideLink>
147|            <SideLink to="/history" onClick={onClose} icon={
148|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
149|                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
150|              </svg>
151|            }>{t('history')}</SideLink>
152|            <SideLink to="/feed" onClick={onClose} icon={
153|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
154|                <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>
155|              </svg>
156|            }>{t('liveFeed')}</SideLink>
157|            <SideLink to="/timeline" onClick={onClose} icon={
158|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
159|                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
160|              </svg>
161|            }>{t('timeline')}</SideLink>
162|            <SideLink to="/entities" onClick={onClose} icon={
163|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
164|                <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
165|                <line x1="6" y1="7" x2="10" y2="10"/><line x1="18" y1="7" x2="14" y2="10"/><line x1="6" y1="17" x2="10" y2="14"/><line x1="18" y1="17" x2="14" y2="14"/>
166|              </svg>
167|            }>{t('entities')}</SideLink>
168|          </nav>
169|        </div>
170|
171|        <div className="sidebar-section">
172|          <div className="sidebar-section-label">{t('systemSection')</div>
173|          <nav className="sidebar-nav">
174|            {user?.role === 'admin' && (
175|              <SideLink to="/admin" onClick={onClose} icon={
176|                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
177|                  <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/></svg>
178|              }>{t('admin')}</SideLink>
179|            )}
180|            <SideLink to="/bookmarks" onClick={onClose} icon={
181|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
182|                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
183|            }>{t('bookmarks')}</SideLink>
184|            <SideLink to="/settings" onClick={onClose} icon={
185|              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
186|                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
187|              </svg>
188|            }>{t('settings')}</SideLink>
189|          </nav>
190|        </div>
191|
192|        <div className="sidebar-footer">
193|          {user ? (
194|            <div className="sidebar-user">
195|              {user.avatar
196|                ? <img src={user.avatar} alt={user.name} className="sidebar-avatar-img" loading="lazy" decoding="async" />
197|                : <div className="sidebar-avatar">{initials}</div>
198|              }
199|              <div className="sidebar-user-info">
200|                <div className="sidebar-user-name">{user.name}</div>
201|                <div className="sidebar-user-email">{user.email || user.phone || ''}</div>
202|              </div>
203|            </div>
204|          ) : (
205|            <div style={{ fontSize: 10.5, color: 'var(--text-400)', padding: '0 2px', lineHeight: 1.5 }}>
206|              <div style={{ fontWeight: 600, color: 'var(--text-500)', marginBottom: 3 }}>Powered by</div>
207|              <div>NewsAPI · GPT-4o-mini</div>
208|              <div>MongoDB Atlas · 2026</div>
209|            </div>
210|          )}
211|        </div>
212|      </aside>
213|    </>
214|  );
215|};
216|
217|
218|import SidebarToggle from './components/SidebarToggle';
219|
220|const TITLES = { 
221|  '/dashboard': 'dashboard', 
222|  '/history': 'history', 
223|  '/settings': 'settings', 
224|  '/compare': 'compareMode', 
225|  '/admin': 'admin',
226|  '/bookmarks': 'bookmarks',
227|  '/trending': 'trending',
228|  '/entities': 'entities',
229|  '/feed': 'liveFeed',
230|  '/timeline': 'timeline',
231|  '/alerts': 'alerts',
232|  '/credibility': 'sources',
233|  '/digest': 'digest',
234|  '/search': 'search',
235|  '/api-docs': 'apiDocs'
236|};
237|
238|// ── Bottom Navigation Bar (Mobile Only) — StatusMy Pattern ──────────────────────
239|const BottomNav = () => {
240|  const loc = useLocation();
241|  const navigate = useNavigate();
242|  const { user } = useAuth();
243|  const { t } = useLanguage();
244|  const [moreOpen, setMoreOpen] = useState(false);
245|  const [isMobile, setIsMobile] = useState(false);
246|
247|  useEffect(() => {
248|    const check = () => setIsMobile(window.innerWidth <= 768);
249|    check();
250|    window.addEventListener('resize', check);
251|    return () => window.removeEventListener('resize', check);
252|  }, []);
253|
254|  // Close more popup on route change
255|  useEffect(() => {
256|    setMoreOpen(false);
257|  }, [loc.pathname]);
258|
259|  // #11 Back gesture handling for More popup
260|  useEffect(() => {
261|    if (!moreOpen) return;
262|    window.history.pushState(null, '');
263|    const handlePop = () => setMoreOpen(false);
264|    window.addEventListener('popstate', handlePop);
265|    return () => window.removeEventListener('popstate', handlePop);
266|  }, [moreOpen]);
267|
268|  const handleMoreNav = useCallback((path) => {
269|    navigate(path);
270|    setMoreOpen(false);
271|  }, [navigate]);
272|
273|  if (!isMobile) return null;
274|
275|  const tabs = [
276|    { path: '/dashboard', label: t('dashboard'), icon: (
277|      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
278|        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
279|        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
280|      </svg>
281|    )},
282|    { path: '/trending', label: t('trending'), icon: (
283|      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
284|        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
285|      </svg>
286|    )},
287|    { path: '/entities', label: t('entities'), icon: (
288|      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
289|        <circle cx="12" cy="12" r="3"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/>
290|        <line x1="6" y1="7" x2="10" y2="10"/><line x1="18" y1="7" x2="14" y2="10"/><line x1="6" y1="17" x2="10" y2="14"/><line x1="18" y1="17" x2="14" y2="14"/>
291|      </svg>
292|    )},
293|    { path: '/history', label: t('history'), icon: (
294|      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
295|        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
296|      </svg>
297|    )},
298|  ];
299|
300|  const isActive = (path) => {
301|    if (path === '/dashboard') return loc.pathname === '/dashboard';
302|    return loc.pathname.startsWith(path);
303|  };
304|
305|  const moreActive = moreOpen || ['/compare', '/bookmarks', '/settings', '/admin'].includes(loc.pathname);
306|
307|  return (
308|    <>
309|      {/* Overlay */}
310|      <AnimatePresence>
311|        {moreOpen && (
312|          <motion.div
313|            className="bottom-nav-more-overlay open"
314|            initial={{ opacity: 0 }}
315|            animate={{ opacity: 1 }}
316|            exit={{ opacity: 0 }}
317|            onClick={() => setMoreOpen(false)}
318|          />
319|        )}
320|      </AnimatePresence>
321|
322|      {/* More Popup */}
323|      <AnimatePresence>
324|        {moreOpen && (
325|          <motion.div
326|            className="bottom-nav-more-popup open"
327|            initial={{ y: '100%', opacity: 0 }}
328|            animate={{ y: 0, opacity: 1 }}
329|            exit={{ y: '100%', opacity: 0 }}
330|            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
331|          >
332|            <div className="bottom-nav-more-popup-handle" />
333|            <button onClick={() => handleMoreNav('/compare')}>
334|              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
335|                <path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M21 16v5h-5"/><path d="M3 16v5h5"/><path d="M4 12h16"/>
336|              </svg>
337|              {t('compareMode')}
338|            </button>
339|            <button onClick={() => handleMoreNav('/bookmarks')}>
340|              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
341|                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
342|              </svg>
343|              {t('bookmarks')}
344|            </button>
345|            <button onClick={() => handleMoreNav('/settings')}>
346|              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
347|                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
348|              </svg>
349|              {t('settings')}
350|            </button>
351|            {user?.role === 'admin' && (
352|              <button onClick={() => handleMoreNav('/admin')}>
353|                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
354|                  <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/><path d="M3 10h18"/><path d="M7 15h.01"/><path d="M11 15h2"/>
355|                </svg>
356|                {t('admin')}
357|              </button>
358|            )}
359|          </motion.div>
360|        )}
361|      </AnimatePresence>
362|
363|      {/* Bottom Nav Bar — 64px, StatusMy pattern */}
364|      <nav className="bottom-nav">
365|        {tabs.map(tab => {
366|          const active = isActive(tab.path);
367|          return (
368|            <button
369|              key={tab.path}
370|              onClick={() => navigate(tab.path)}
371|              className={`bottom-nav-item ${active ? 'active' : ''}`}
372|            >
373|              {active && (
374|                <motion.div
375|                  layoutId="bottom-nav-indicator"
376|                  className="bottom-nav-indicator"
377|                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
378|                />
379|              )}
380|              {tab.icon}
381|              <span>{tab.label}</span>
382|            </button>
383|          );
384|        })}
385|        <button
386|          className={`bottom-nav-item ${moreActive ? 'active' : ''}`}
387|          onClick={() => setMoreOpen(prev => !prev)}
388|        >
389|          {moreActive && (
390|            <motion.div
391|              layoutId="bottom-nav-indicator"
392|              className="bottom-nav-indicator"
393|              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
394|            />
395|          )}
396|          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
397|            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
398|          </svg>
399|          <span>More</span>
400|        </button>
401|      </nav>
402|    </>
403|  );
404|};
405|
406|const AppShell = ({ children }) => {
407|  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
408|  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
409|    return localStorage.getItem('sidebar-collapsed') === 'true';
410|  });
411|  
412|  const { t, lang, toggleLanguage } = useLanguage();
413|  const loc = useLocation();
414|  const titleKey = TITLES[loc.pathname] || 'dashboard';
415|
416|  const toggleSidebar = () => {
417|    if (window.innerWidth > 1024) {
418|      const newState = !isSidebarCollapsed;
419|      setIsSidebarCollapsed(newState);
420|      localStorage.setItem('sidebar-collapsed', newState);
421|    } else {
422|      setIsSidebarOpen(!isSidebarOpen);
423|    }
424|  };
425|
426|  return (
427|    <div className="app-shell">
428|      <Sidebar 
429|        isOpen={isSidebarOpen} 
430|        isCollapsed={isSidebarCollapsed} 
431|        onClose={() => setIsSidebarOpen(false)} 
432|      />
433|      <div className="main-area">
434|        <OfflineBanner />
435|        <header className="topbar">
436|          <div className="topbar-left">
437|            <div className="topbar-hamburger-wrap">
438|              <SidebarToggle 
439|                isOpen={window.innerWidth > 1024 ? !isSidebarCollapsed : isSidebarOpen} 
440|                onToggle={toggleSidebar} 
441|              />
442|            </div>
443|            <h1 className="topbar-title">{t(titleKey)}</h1>
444|          </div>
445|          <div className="topbar-actions">
446|            <button className="btn-outline" onClick={toggleLanguage} style={{ fontSize: '11px', fontWeight: 800 }}>
447|              {lang === 'en' ? '🇲🇾 BM' : '🇺🇸 EN'}
448|            </button>
449|            <button className="btn-outline mobile-hide" onClick={() => window.location.reload()}>
450|              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
451|                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
452|              </svg>
453|              Refresh
454|            </button>
455|          </div>
456|        </header>
457|        <main className="page-body" id="main-content">{children}</main>
458|      </div>
459|      <BottomNav />
460|    </div>
461|  );
462|};
463|
464|import { SocketProvider } from './context/SocketContext';
465|import LoadingSpinner from './components/LoadingSpinner';
466|
467|const AppInner = () => (
468|  <Suspense fallback={<LoadingSpinner />}>
469|  <PageTransition>
470|  <Routes>
471|    <Route path="/"               element={<LandingPage />} />
472|    <Route path="/login"          element={<LoginPage />} />
473|    <Route path="/register"       element={<RegisterPage />} />
474|    <Route path="/reset-password" element={<ResetPasswordPage />} />
475|    <Route path="/verify-email"   element={<VerifyEmailPage />} />
476|
477|    <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
478|    <Route path="/trending" element={<ProtectedRoute><Layout><Trending /></Layout></ProtectedRoute>} />
479|    <Route path="/compare" element={<ProtectedRoute><Layout><ComparePage /></Layout></ProtectedRoute>} />
480|    <Route path="/history" element={<ProtectedRoute><Layout><History /></Layout></ProtectedRoute>} />
481|    <Route path="/bookmarks" element={<ProtectedRoute><Layout><Bookmarks /></Layout></ProtectedRoute>} />
482|    <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
483|    <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
484|    <Route path="/entities" element={<ProtectedRoute><Layout><EntityGraphPage /></Layout></ProtectedRoute>} />
485|    <Route path="/feed" element={<ProtectedRoute><Layout><LiveFeed /></Layout></ProtectedRoute>} />
486|    <Route path="/timeline" element={<ProtectedRoute><Layout><SentimentTimeline /></Layout></ProtectedRoute>} />
487|    <Route path="/alerts" element={<ProtectedRoute><Layout><Alerts /></Layout></ProtectedRoute>} />
488|    <Route path="/credibility" element={<ProtectedRoute><Layout><SourceCredibility /></Layout></ProtectedRoute>} />
489|    <Route path="/digest" element={<ProtectedRoute><Layout><Digest /></Layout></ProtectedRoute>} />
490|    <Route path="/search" element={<ProtectedRoute><Layout><AdvancedSearch /></Layout></ProtectedRoute>} />
491|    <Route path="/api-docs/*" element={<ApiDocs />} />
492|    <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
493|    <Route path="/heatmap" element={<ProtectedRoute><Layout><Heatmap /></Layout></ProtectedRoute>} />
494|    <Route path="/categories" element={<ProtectedRoute><Layout><Categories /></Layout></ProtectedRoute>} />
495|    <Route path="/forecast" element={<ProtectedRoute><Layout><Forecast /></Layout></ProtectedRoute>} />
496|    
497|    {/* Public shared article page (no auth, no layout) */}
498|    <Route path="/shared/:id" element={<SharedArticle />} />
499|    
500|    {/* Static Informational Pages */}
501|