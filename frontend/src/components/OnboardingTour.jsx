import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TOUR_STEPS = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Sentiment Dashboard',
    desc: 'View real-time sentiment analysis of Malaysian news articles with key metrics and trends.',
    page: '/dashboard',
  },
  {
    target: '[data-tour="entities"]',
    title: 'Entity Graph',
    desc: 'Explore relationships between people, organizations, and locations mentioned in the news.',
    page: '/dashboard',
  },
  {
    target: '[data-tour="heatmap"]',
    title: 'Geographic Heatmap',
    desc: 'See sentiment distribution across Malaysian states on an interactive map.',
    page: '/dashboard',
  },
  {
    target: '[data-tour="trending"]',
    title: 'Trending Topics',
    desc: 'Track the most discussed topics and their sentiment trends over time.',
    page: '/dashboard',
  },
  {
    target: '[data-tour="reports"]',
    title: 'Export Reports',
    desc: 'Generate professional PDF reports for your sentiment analysis findings.',
    page: '/dashboard',
  },
];

// Hook for Dashboard to trigger tour
export const useOnboardingTour = () => {
  const [key, setKey] = useState(0);
  const startTour = useCallback(() => {
    localStorage.removeItem('onboarding_completed');
    setKey(k => k + 1);
  }, []);
  return { key, startTour };
};

const OnboardingTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-start on first dashboard visit
  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed && location.pathname === '/dashboard') {
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Position tooltip relative to target
  useEffect(() => {
    if (!isActive) return;

    const currentStep = TOUR_STEPS[step];
    if (!currentStep) return;

    if (currentStep.page && location.pathname !== currentStep.page) {
      navigate(currentStep.page);
    }

    const findTarget = () => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
      }
    };

    findTarget();
    const interval = setInterval(findTarget, 300);
    return () => clearInterval(interval);
  }, [isActive, step, location.pathname, navigate]);

  const finish = useCallback(() => {
    setIsActive(false);
    setStep(0);
    setRect(null);
    localStorage.setItem('onboarding_completed', 'true');
  }, []);

  const next = useCallback(() => {
    if (step >= TOUR_STEPS.length - 1) {
      finish();
    } else {
      setStep(s => s + 1);
    }
  }, [step, finish]);

  const prev = useCallback(() => {
    if (step > 0) setStep(s => s - 1);
  }, [step]);

  if (!isActive || !rect) return null;

  const currentStep = TOUR_STEPS[step];

  const tooltipLeft = rect.right + 200 > window.innerWidth
    ? rect.left - 260
    : rect.right + 16;
  const tooltipTop = Math.max(16, Math.min(rect.top - 10, window.innerHeight - 200));

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'auto' }}>
      <div className="absolute inset-0 bg-black/60" onClick={finish} />

      <div
        className="absolute border-2 border-[#4f46e5] transition-all duration-300"
        style={{
          left: rect.left - 6,
          top: rect.top - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          borderRadius: 2,
        }}
      />

      <div
        className="absolute bg-paper border border-ink/10 p-5 w-60"
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <p className="uppercase tracking-widest text-[10px] text-ink/40 mb-1">
          Step {step + 1} of {TOUR_STEPS.length}
        </p>
        <h3 className="font-['Playfair_Display'] text-base font-bold text-ink mb-2">
          {currentStep.title}
        </h3>
        <p className="text-sm text-ink/60 leading-relaxed mb-4">
          {currentStep.desc}
        </p>

        <div className="flex justify-center gap-1.5 mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 ${i === step ? 'bg-[#4f46e5]' : 'bg-ink/15'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs uppercase tracking-widest text-ink/40 hover:text-ink/60"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export const resetTour = () => {
  localStorage.removeItem('onboarding_completed');
};

export default OnboardingTour;
