/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Security warning for local development
  useEffect(() => {
    if (import.meta.env.MODE !== 'production') {
      console.warn(
        '%c[SECURITY WARNING]%c JWT is being stored in localstorage. This makes the application vulnerable to XSS. For high-security projects, consider using HttpOnly cookies.',
        'color: #fca5a5; font-weight: bold; font-size: 1.2em;',
        'color: inherit;'
      );
    }
  }, []);

  // Sync session with Backend (verify token and get user profile)
  const syncWithBackend = useCallback(async (token) => {
    try {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error('Backend sync failed:', err.message);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
      return null;
    }
  }, []);

  // Monitor authentication state on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const existingToken = localStorage.getItem('token');
      
      if (existingToken) {
        setLoading(true);
        await syncWithBackend(existingToken);
      }
      
      // Also listen to Firebase auth changes (for Google Login)
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (!isMounted) return;

        if (fbUser && !localStorage.getItem('token')) {
          // Firebase logged in but no backend token yet (transition state)
        } else if (!fbUser && !localStorage.getItem('token')) {
          setUser(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    const unsubPromise = initializeAuth();

    return () => {
      isMounted = false;
      unsubPromise.then(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [syncWithBackend]);

  const saveSession = (token, userData) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    saveSession(res.data.token, res.data.user);
    return res.data;
  };

  const guestLogin = async () => {
    const res = await api.post('/auth/guest');
    saveSession(res.data.token, res.data.user);
    return res.data;
  };

  // Modern Google Login using Firebase Popup
  const firebaseGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      // Security #8: Only send the verified Firebase ID token.
      // Do NOT send name/email/picture from the client — the backend extracts
      // those from the verified token via firebase-admin, not from req.body.
      const res = await api.post('/auth/google-firebase', { token: idToken });

      saveSession(res.data.token, res.data.user);
      return res.data;
    } catch (err) {
      console.error('Firebase Login Error:', err.message);
      throw err;
    }
  };

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  }, []);

  const updatePreferences = async (prefs) => {
    const res = await api.patch('/auth/preferences', prefs);
    setUser(u => ({ ...u, preferences: res.data.preferences }));
    return res.data;
  };

  const updateProfile = async (data) => {
    const res = await api.patch('/auth/profile', data);
    setUser(u => ({ ...u, ...res.data.user }));
    return res.data;
  };

  const toggleBookmark = async (id) => {
    try {
      await api.post(`/news/${id}/bookmark`);
      const isCurrentlyBookmarked = user.bookmarks?.includes(id);
      const newBookmarks = isCurrentlyBookmarked
        ? user.bookmarks.filter(bid => bid !== id)
        : [...(user.bookmarks || []), id];
      
      setUser(u => ({ ...u, bookmarks: newBookmarks }));
      
      // Auto-categorize if newly bookmarked
      if (!isCurrentlyBookmarked) {
        try {
          await api.post('/bookmarks/auto-assign', { articleId: id });
        } catch (err) {
          console.warn('Auto-categorize failed (non-critical):', err);
        }
      }
    } catch (err) {
      console.error('Bookmark toggle failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, guestLogin, googleLogin: firebaseGoogleLogin, 
      logout, updatePreferences, updateProfile, toggleBookmark 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
