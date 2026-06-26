/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../services/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = (key, fallback) => {
    const value = translations[lang]?.[key] || translations['en']?.[key];
    if (value) return value;
    return fallback !== undefined ? fallback : key;
  };

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'ms' : 'en'));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
