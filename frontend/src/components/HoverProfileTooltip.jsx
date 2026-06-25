import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const HoverProfileTooltip = ({ userId, userName, userRole, children }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [visible, setVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const wrapperRef = useRef(null);
  const enterTimer = useRef(null);
  const leaveTimer = useRef(null);

  const fetchProfileData = useCallback(async () => {
    if (fetched || !userId) return;
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [profileRes, badgesRes] = await Promise.all([
        fetch(`${API_BASE}/collab/profile/${userId}`, { headers }),
        fetch(`${API_BASE}/collab/badges/${userId}`, { headers }),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.profile || data);
      }
      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges || data || []);
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [userId, token, fetched]);

  const handleMouseEnter = () => {
    clearTimeout(leaveTimer.current);
    enterTimer.current = setTimeout(() => {
      setVisible(true);
      fetchProfileData();
    }, 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(enterTimer.current);
    leaveTimer.current = setTimeout(() => {
      setVisible(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      clearTimeout(enterTimer.current);
      clearTimeout(leaveTimer.current);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-700 text-white';
      case 'moderator': return 'bg-amber-700 text-white';
      default: return 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white';
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'short' })
    : '\u2014';

  const topBadges = badges.slice(0, 3);

  return (
    <div
      ref={wrapperRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {visible && (
        <div
          className="absolute left-0 top-full mt-1 border border-black/20 dark:border-white/20 bg-white dark:bg-gray-900 p-3 min-w-[200px] z-50"
          style={{ borderRadius: 0 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-sans">
              {t('loading') || 'Loading...'}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 border border-black/20 dark:border-white/20 bg-red-700 text-white flex items-center justify-center font-serif text-sm font-bold">
                  {getInitials(profile?.name || userName)}
                </div>
                <div>
                  <div className="font-serif font-bold text-sm text-black dark:text-white">
                    {profile?.name || userName || t('anonymous') || 'Anonymous'}
                  </div>
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wider ${roleBadgeColor(profile?.role || userRole)}`}>
                    {profile?.role || userRole || 'user'}
                  </span>
                </div>
              </div>

              <div className="border-t border-black/10 dark:border-white/10 pt-2 mb-2 space-y-0.5">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-gray-600 dark:text-gray-400">{t('memberSince') || 'Member since'}</span>
                  <span className="text-black dark:text-white">{memberSince}</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-gray-600 dark:text-gray-400">{t('comments') || 'Comments'}</span>
                  <span className="text-black dark:text-white">{profile?.commentCount ?? '\u2014'}</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalLikes') || 'Total likes'}</span>
                  <span className="text-black dark:text-white">{profile?.totalLikes ?? '\u2014'}</span>
                </div>
              </div>

              {topBadges.length > 0 && (
                <div className="border-t border-black/10 dark:border-white/10 pt-2 mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-sans mb-1">
                    {t('badges') || 'Badges'}
                  </div>
                  <div className="flex gap-1">
                    {topBadges.map((badge, i) => (
                      <span
                        key={i}
                        className="inline-block px-1.5 py-0.5 text-[10px] bg-amber-700 text-white font-sans"
                        title={badge.description || badge.name}
                      >
                        {badge.icon || badge.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-black/10 dark:border-white/10 pt-2">
                <a
                  href={`/profile/${userId}`}
                  className="text-xs text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-sans underline"
                >
                  {t('viewFullProfile') || 'View full profile \u2192'}
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HoverProfileTooltip;
