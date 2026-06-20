import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FUN_FACTS = [
  "Sentiment analysis can detect sarcasm with 65% accuracy",
  "The average news article contains 3-5 key entities",
  "Malaysian news covers 14 states and 3 federal territories",
  "AI can analyse sentiment in Bahasa Melayu and English",
  "Over 50,000 news articles are published daily in Malaysia",
  "NLP models can understand context, not just keywords",
  "Positive news tends to get 40% more engagement",
  "Sentiment trends help predict market movements",
  "Social media sentiment differs from news sentiment by ~20%",
  "Our AI processes each article in under 2 seconds",
];

const AnalyzingOverlay = ({ progress }) => {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % FUN_FACTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!progress || progress.total === 0) return null;

  const pct = Math.round((progress.done / progress.total) * 100);

  return (
    <motion.div 
      className="analyzing-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div 
        className="analyzing-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Spinner */}
        <div className="analyzing-icon">
          <div className="analyzing-spinner-modern">
            <div className="spinner-ring spinner-ring-1"></div>
            <div className="spinner-ring spinner-ring-2"></div>
            <div className="spinner-ring spinner-ring-3"></div>
          </div>
        </div>

        {/* Title */}
        <h3 className="analyzing-title">
          Analyzing Articles
        </h3>

        {/* Count */}
        <p className="analyzing-count">
          {progress.done} of {progress.total} completed
        </p>
        
        {/* Progress Bar */}
        <div className="analyzing-progress-track">
          <motion.div 
            className="analyzing-progress-fill-modern"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Percentage */}
        <span className="analyzing-pct">
          {pct}%
        </span>

        {/* Facts */}
        <div className="analyzing-fact-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={factIndex}
              className="analyzing-fact"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {FUN_FACTS[factIndex]}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnalyzingOverlay;
