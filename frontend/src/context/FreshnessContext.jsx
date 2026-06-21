/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const FreshnessContext = createContext(null);

export const FreshnessProvider = ({ children }) => {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [relativeTime, setRelativeTime] = useState('just now');
  const intervalRef = useRef(null);

  const updateFreshness = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    const updateRelative = () => {
      const diffMs = Date.now() - lastUpdated;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);

      if (diffSecs < 60) setRelativeTime('just now');
      else if (diffMins < 60) setRelativeTime(`${diffMins} min ago`);
      else if (diffHours < 24) setRelativeTime(`${diffHours}h ago`);
      else setRelativeTime('over a day ago');
    };

    updateRelative();
    intervalRef.current = setInterval(updateRelative, 30000);
    return () => clearInterval(intervalRef.current);
  }, [lastUpdated]);

  const diffMs = Date.now() - lastUpdated;
  const diffMins = diffMs / 60000;
  let status = 'fresh';
  if (diffMins > 15) status = 'stale';
  else if (diffMins > 5) status = 'aging';

  return (
    <FreshnessContext.Provider value={{ lastUpdated, relativeTime, status, updateFreshness }}>
      {children}
    </FreshnessContext.Provider>
  );
};

export const useFreshness = () => {
  const ctx = useContext(FreshnessContext);
  if (!ctx) return { lastUpdated: null, relativeTime: 'unknown', status: 'stale', updateFreshness: () => {} };
  return ctx;
};
