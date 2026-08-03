/**
 * @module KineticsEffects
 * @description Spring-physics React component library.
 * 20 reusable motion components for Malaysia News Sentiment frontend.
 * Uses framer-motion + pure CSS. Supports dark/light mode via CSS variables.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
} from 'react';
import {
  motion,
  useSpring,
  useMotionValue,
  useTransform,
  useAnimation,
  useInView,
  AnimatePresence,
  useMotionTemplate,
} from 'framer-motion';

/* ─────────────────── shared helpers ─────────────────── */

const VARS_LIGHT = {
  '--bg': '#FAF8F3',
  '--bg-card': '#FFFFFF',
  '--accent': '#C0392B',
  '--ink': '#12110F',
  '--paper': '#FAF8F3',
};

const VARS_DARK = {
  '--bg': '#12110F',
  '--bg-card': '#1E1D1B',
  '--accent': '#E74C3C',
  '--ink': '#FAF8F3',
  '--paper': '#1E1D1B',
};

const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function useThemeVars() {
  const [dark, setDark] = useState(prefersDark);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDark(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return dark ? VARS_DARK : VARS_LIGHT;
}

/* ================================================================
   1. SpringCounter
   ================================================================ */

/**
 * Number counter with spring overshoot.
 * @param {object} props
 * @param {number} props.value - Target number.
 * @param {number} [props.stiffness=280]
 * @param {number} [props.damping=18]
 * @param {number} [props.decimals=0]
 * @param {string} [props.className]
 */
export function SpringCounter({
  value,
  stiffness = 280,
  damping = 18,
  decimals = 0,
  className = '',
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness, damping });

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  const display = useTransform(spring, (v) => v.toFixed(decimals));
  const vars = useThemeVars();

  return (
    <motion.span
      className={className}
      style={{
        ...vars,
        fontVariantNumeric: 'tabular-nums',
        color: 'var(--ink)',
      }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

/* ================================================================
   2. MagneticButton
   ================================================================ */

/**
 * Cursor pulls button toward it within a dead zone.
 * @param {object} props
 * @param {number} [props.deadZone=0.35] - Proximity ratio (0-1).
 * @param {number} [props.strength=30] - Max px displacement.
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function MagneticButton({
  deadZone = 0.35,
  strength = 30,
  children,
  className = '',
  ...rest
}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });
  const vars = useThemeVars();

  const handleMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(rect.width, rect.height) * deadZone * 3;
      if (dist < maxDist) {
        const ratio = 1 - dist / maxDist;
        x.set(dx * ratio * (strength / maxDist) * 4);
        y.set(dy * ratio * (strength / maxDist) * 4);
      }
    },
    [deadZone, strength, x, y]
  );

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.button
      ref={ref}
      className={className}
      style={{ ...vars, x: springX, y: springY, position: 'relative' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileTap={{ scale: 0.96 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ================================================================
   3. PushButton
   ================================================================ */

/**
 * Tactile depress with bottom-edge shadow.
 * @param {object} props
 * @param {number} [props.depth=4] - Depress px.
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function PushButton({ depth = 4, children, className = '', ...rest }) {
  const vars = useThemeVars();
  return (
    <motion.button
      className={className}
      style={{
        ...vars,
        position: 'relative',
        transformOrigin: 'center bottom',
        cursor: 'pointer',
        background: 'var(--bg-card)',
        color: 'var(--ink)',
        border: '1px solid color-mix(in srgb, var(--ink) 15%, transparent)',
        borderRadius: 8,
        padding: '10px 22px',
        fontWeight: 600,
        boxShadow: `0 ${depth}px 0 0 color-mix(in srgb, var(--ink) 25%, transparent)`,
      }}
      whileTap={{
        y: depth,
        boxShadow: '0 0px 0 0 color-mix(in srgb, var(--ink) 25%, transparent)',
        transition: { duration: 0.06 },
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ================================================================
   4. RippleButton
   ================================================================ */

/**
 * Click ripple at exact point (600 ms decay).
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.rippleColor] - Defaults to accent.
 */
export function RippleButton({
  children,
  className = '',
  rippleColor,
  ...rest
}) {
  const [ripples, setRipples] = useState([]);
  const vars = useThemeVars();
  const idRef = useRef(0);

  const handleClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  }, []);

  return (
    <motion.button
      className={className}
      style={{
        ...vars,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--accent)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 22px',
        fontWeight: 600,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      {...rest}
    >
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x,
            top: r.y,
            width: 0,
            height: 0,
            borderRadius: '50%',
            background: rippleColor || 'rgba(255,255,255,0.45)',
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
          }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </motion.button>
  );
}

/* ================================================================
   5. SquishButton
   ================================================================ */

/**
 * Compress on press, spring back (scale 0.88).
 * @param {object} props
 * @param {number} [props.squish=0.88]
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function SquishButton({
  squish = 0.88,
  children,
  className = '',
  ...rest
}) {
  const vars = useThemeVars();
  return (
    <motion.button
      className={className}
      style={{
        ...vars,
        cursor: 'pointer',
        background: 'var(--bg-card)',
        color: 'var(--ink)',
        border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
        borderRadius: 8,
        padding: '10px 22px',
        fontWeight: 600,
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scaleX: 1.08, scaleY: squish }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/* ================================================================
   6. ToastOvershoot
   ================================================================ */

/**
 * Notification slides past rest before settling (1.08 overshoot).
 * @param {object} props
 * @param {boolean} props.visible
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 * @param {number} [props.overshoot=1.08]
 */
export function ToastOvershoot({
  visible,
  children,
  className = '',
  overshoot = 1.08,
}) {
  const vars = useThemeVars();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={className}
          style={{
            ...vars,
            background: 'var(--bg-card)',
            color: 'var(--ink)',
            border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
            borderRadius: 10,
            padding: '14px 20px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            pointerEvents: 'auto',
          }}
          initial={{ y: -80, opacity: 0, scale: 0.9 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: [0.9, overshoot, 1],
          }}
          exit={{ y: -60, opacity: 0, scale: 0.9 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 18,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================
   7. AccordionSpring
   ================================================================ */

/**
 * Max-height accordion with rotating chevron.
 * @param {object} props
 * @param {string} props.title
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.defaultOpen=false]
 * @param {number} [props.stiffness=260]
 * @param {number} [props.damping=28]
 * @param {string} [props.className]
 */
export function AccordionSpring({
  title,
  children,
  defaultOpen = false,
  stiffness = 260,
  damping = 28,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const vars = useThemeVars();

  return (
    <div
      className={className}
      style={{
        ...vars,
        borderBottom: '1px solid color-mix(in srgb, var(--ink) 10%, transparent)',
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 0',
          background: 'none',
          border: 'none',
          color: 'var(--ink)',
          cursor: 'pointer',
          fontFamily: "'Playfair Display', serif",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness, damping }}
          style={{ display: 'inline-block', fontSize: 12 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness, damping }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 16, color: 'var(--ink)', opacity: 0.8 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================
   8. TabPill
   ================================================================ */

/**
 * Glide indicator that measures target width (0.4 s).
 * @param {object} props
 * @param {string[]} props.tabs
 * @param {number} props.active
 * @param {(i: number) => void} props.onChange
 * @param {string} [props.className]
 */
export function TabPill({ tabs, active, onChange, className = '' }) {
  const containerRef = useRef(null);
  const tabRefs = useRef([]);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const vars = useThemeVars();

  useEffect(() => {
    const el = tabRefs.current[active];
    const container = containerRef.current;
    if (el && container) {
      const cr = container.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setPillStyle({ left: er.left - cr.left, width: er.width });
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...vars,
        position: 'relative',
        display: 'inline-flex',
        gap: 0,
        background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
        borderRadius: 10,
        padding: 4,
      }}
    >
      <motion.div
        animate={{ x: pillStyle.left, width: pillStyle.width }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }}
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          height: 'calc(100% - 8px)',
          background: 'var(--bg-card)',
          borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      />
      {tabs.map((t, i) => (
        <button
          key={t}
          ref={(el) => (tabRefs.current[i] = el)}
          onClick={() => onChange(i)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '8px 18px',
            background: 'none',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: i === active ? 700 : 500,
            color: 'var(--ink)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   9. ChoiceChip
   ================================================================ */

/**
 * Toggle filter chip with spring pop.
 * @param {object} props
 * @param {string} props.label
 * @param {boolean} props.active
 * @param {() => void} props.onClick
 * @param {string} [props.className]
 */
export function ChoiceChip({ label, active, onClick, className = '' }) {
  const vars = useThemeVars();
  return (
    <motion.button
      className={className}
      onClick={onClick}
      animate={{
        scale: active ? [1, 1.12, 1] : 1,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--ink)',
      }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      style={{
        ...vars,
        cursor: 'pointer',
        border: active
          ? '1.5px solid var(--accent)'
          : '1.5px solid color-mix(in srgb, var(--ink) 20%, transparent)',
        borderRadius: 999,
        padding: '7px 18px',
        fontWeight: 600,
        fontSize: 13,
        fontFamily: "'Inter', sans-serif",
      }}
      whileHover={{ scale: 1.05 }}
    >
      {label}
    </motion.button>
  );
}

/* ================================================================
   10. LikeBurst
   ================================================================ */

/**
 * Toggle like with radial particle burst (heart).
 * @param {object} props
 * @param {boolean} props.liked
 * @param {() => void} props.onToggle
 * @param {number} [props.particles=8]
 * @param {string} [props.className]
 */
export function LikeBurst({ liked, onToggle, particles = 8, className = '' }) {
  const vars = useThemeVars();
  const [burst, setBurst] = useState(false);

  const handleClick = useCallback(() => {
    if (!liked) setBurst(true);
    onToggle();
    setTimeout(() => setBurst(false), 600);
  }, [liked, onToggle]);

  return (
    <motion.button
      className={className}
      onClick={handleClick}
      style={{
        ...vars,
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 8,
        fontSize: 22,
      }}
      whileTap={{ scale: 0.85 }}
    >
      <motion.span
        animate={{ scale: liked ? [1, 1.35, 1] : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
        style={{ display: 'inline-block', lineHeight: 1 }}
      >
        {liked ? '❤️' : '🤍'}
      </motion.span>

      {burst && (
        <span style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: particles }).map((_, i) => {
            const angle = (360 / particles) * i;
            return (
              <motion.span
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((angle * Math.PI) / 180) * 24,
                  y: Math.sin((angle * Math.PI) / 180) * 24,
                  opacity: 0,
                  scale: 0.4,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            );
          })}
        </span>
      )}
    </motion.button>
  );
}

/* ================================================================
   11. SwipeReveal
   ================================================================ */

/**
 * Drag horizontal to expose action buttons (−96 px).
 * @param {object} props
 * @param {React.ReactNode} props.children - Foreground content.
 * @param {React.ReactNode} props.actions - Hidden actions behind.
 * @param {number} [props.threshold=-96]
 * @param {string} [props.className]
 */
export function SwipeReveal({
  children,
  actions,
  threshold = -96,
  className = '',
}) {
  const x = useMotionValue(0);
  const vars = useThemeVars();

  return (
    <div
      className={className}
      style={{
        ...vars,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: Math.abs(threshold),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'var(--accent)',
          borderRadius: 10,
        }}
      >
        {actions}
      </div>

      <motion.div
        style={{ x, position: 'relative', zIndex: 1, touchAction: 'pan-y' }}
        drag="x"
        dragConstraints={{ left: threshold, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x < threshold / 2) {
            x.set(threshold);
          } else {
            x.set(0);
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ================================================================
   12. ExpandingSearch
   ================================================================ */

/**
 * Grows on hover/focus (0.4 s glide).
 * @param {object} props
 * @param {string} [props.placeholder]
 * @param {string} [props.className]
 */
export function ExpandingSearch({ placeholder = 'Search…', className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  const vars = useThemeVars();

  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => {
    if (!inputRef.current?.value) setExpanded(false);
  }, []);

  return (
    <motion.div
      className={className}
      style={{
        ...vars,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--bg-card)',
        borderRadius: 10,
        border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
        padding: '8px 12px',
        overflow: 'hidden',
      }}
      animate={{ width: expanded ? 280 : 44 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      onMouseEnter={expand}
      onMouseLeave={collapse}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinecap="round"
        style={{ flexShrink: 0, opacity: 0.6 }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <motion.input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        onFocus={expand}
        onBlur={collapse}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--ink)',
          marginLeft: 8,
          fontSize: 14,
          width: '100%',
          fontFamily: "'Inter', sans-serif",
        }}
        animate={{ opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
}

/* ================================================================
   13. FloatingInput
   ================================================================ */

/**
 * Placeholder lifts into label on focus (pure CSS).
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.type]
 * @param {string} [props.className]
 */
export function FloatingInput({ label, type = 'text', className = '' }) {
  const id = useRef(`fi-${Math.random().toString(36).slice(2)}`).current;
  const vars = useThemeVars();

  return (
    <div
      className={className}
      style={{
        ...vars,
        position: 'relative',
        paddingTop: 18,
      }}
    >
      <style>{`
        #${id} {
          width: 100%;
          padding: 10px 2px 6px;
          border: none;
          border-bottom: 2px solid color-mix(in srgb, var(--ink) 20%, transparent);
          background: transparent;
          color: var(--ink);
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.3s;
        }
        #${id}:focus {
          border-bottom-color: var(--accent);
        }
        #${id}::placeholder {
          color: transparent;
        }
        .fi-label-${id} {
          position: absolute;
          left: 2px;
          top: 28px;
          color: color-mix(in srgb, var(--ink) 50%, transparent);
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          pointer-events: none;
          transition: all 0.2s ease;
        }
        #${id}:focus + .fi-label-${id},
        #${id}:not(:placeholder-shown) + .fi-label-${id} {
          top: 0;
          font-size: 11px;
          color: var(--accent);
          font-weight: 600;
        }
      `}</style>
      <input id={id} type={type} placeholder={label} />
      <label htmlFor={id} className={`fi-label-${id}`}>
        {label}
      </label>
    </div>
  );
}

/* ================================================================
   14. StarRating
   ================================================================ */

/**
 * Hover previews, click locks with pop (0..5).
 * @param {object} props
 * @param {number} props.value - Current rating (0-5).
 * @param {(v: number) => void} props.onChange
 * @param {number} [props.max=5]
 * @param {string} [props.className]
 */
export function StarRating({ value, onChange, max = 5, className = '' }) {
  const [hover, setHover] = useState(0);
  const vars = useThemeVars();
  const display = hover || value;

  return (
    <div
      className={className}
      style={{ ...vars, display: 'inline-flex', gap: 4 }}
    >
      {Array.from({ length: max }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= display;
        return (
          <motion.button
            key={i}
            onMouseEnter={() => setHover(idx)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(idx)}
            animate={value === idx ? { scale: [1, 1.35, 1] } : {}}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            whileHover={{ scale: 1.2 }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 24,
              lineHeight: 1,
              padding: 2,
              color: filled ? '#F5A623' : 'color-mix(in srgb, var(--ink) 20%, transparent)',
            }}
          >
            ★
          </motion.button>
        );
      })}
    </div>
  );
}

/* ================================================================
   15. CopyButton
   ================================================================ */

/**
 * Icon crossfade to check, label swaps (1.4 s).
 * @param {object} props
 * @param {string} props.text - Text to copy.
 * @param {string} [props.label='Copy']
 * @param {string} [props.copiedLabel='Copied!']
 * @param {string} [props.className]
 */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  className = '',
}) {
  const [copied, setCopied] = useState(false);
  const vars = useThemeVars();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* fallback */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [text]);

  return (
    <motion.button
      className={className}
      onClick={handleCopy}
      whileTap={{ scale: 0.95 }}
      style={{
        ...vars,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
        border: '1px solid color-mix(in srgb, var(--ink) 12%, transparent)',
        borderRadius: 8,
        padding: '6px 14px',
        cursor: 'pointer',
        color: 'var(--ink)',
        fontWeight: 600,
        fontSize: 13,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            style={{ color: '#27AE60', fontSize: 16 }}
          >
            ✓
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: 14 }}
          >
            📋
          </motion.span>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'copied' : 'copy'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {copied ? copiedLabel : label}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/* ================================================================
   16. CursorTrail
   ================================================================ */

/**
 * Chain of dots chases pointer (0.35 lag per dot).
 * @param {object} props
 * @param {number} [props.dots=12]
 * @param {number} [props.size=8]
 * @param {number} [props.lag=0.35]
 * @param {string} [props.className]
 */
/** @type {number} Maximum trail dots (hooks must be fixed-count). */
const MAX_DOTS = 24;

/** Internal: single dot with spring-based position. */
function _TrailDot({ targetX, targetY, index, size, damping }) {
  const stiffness = Math.max(80, 200 - index * 12);
  const x = useSpring(targetX, { stiffness, damping });
  const y = useSpring(targetY, { stiffness, damping });

  useEffect(() => {
    x.set(targetX);
    y.set(targetY);
  }, [targetX, targetY, x, y]);

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        x,
        y,
        width: size * (1 - index * 0.06),
        height: size * (1 - index * 0.06),
        borderRadius: '50%',
        background: 'var(--accent)',
        opacity: 1 - index * 0.07,
        translateX: '-50%',
        translateY: '-50%',
      }}
    />
  );
}

/**
 * Chain of dots chases pointer (0.35 lag per dot).
 * @param {object} props
 * @param {number} [props.dots=12]
 * @param {number} [props.size=8]
 * @param {number} [props.lag=0.35]
 * @param {string} [props.className]
 */
export function CursorTrail({ dots = 12, size = 8, lag = 0.35, className = '' }) {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const vars = useThemeVars();
  const count = Math.min(dots, MAX_DOTS);
  const damping = Math.round(20 / lag);

  useEffect(() => {
    const handler = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div
      className={className}
      style={{
        ...vars,
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <_TrailDot
          key={i}
          index={i}
          targetX={mousePos.x}
          targetY={mousePos.y}
          size={size}
          damping={damping}
        />
      ))}
    </div>
  );
}

/* ================================================================
   17. LiquidGlass
   ================================================================ */

/**
 * Frosted glass that liquefies under press.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export function LiquidGlass({ children, className = '' }) {
  const vars = useThemeVars();
  const [pressing, setPressing] = useState(false);

  return (
    <motion.div
      className={className}
      onPointerDown={() => setPressing(true)}
      onPointerUp={() => setPressing(false)}
      onPointerLeave={() => setPressing(false)}
      animate={{
        borderRadius: pressing ? '40% 60% 55% 45% / 55% 45% 60% 40%' : 16,
        backdropFilter: pressing ? 'blur(20px) saturate(1.8)' : 'blur(12px)',
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        ...vars,
        background: 'rgba(255,255,255,0.12)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
        padding: 24,
        cursor: 'pointer',
        color: 'var(--ink)',
        overflow: 'hidden',
      }}
      whileHover={{ scale: 1.02 }}
    >
      {children}
    </motion.div>
  );
}

/* ================================================================
   18. SnapRail
   ================================================================ */

/**
 * Selection pill springs to hovered option.
 * @param {object} props
 * @param {string[]} props.options
 * @param {number} props.selected
 * @param {(i: number) => void} props.onChange
 * @param {string} [props.className]
 */
export function SnapRail({ options, selected, onChange, className = '' }) {
  const containerRef = useRef(null);
  const optionRefs = useRef([]);
  const [hover, setHover] = useState(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const vars = useThemeVars();

  const target = hover !== null ? hover : selected;

  useEffect(() => {
    const el = optionRefs.current[target];
    const container = containerRef.current;
    if (el && container) {
      const cr = container.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setPill({ left: er.left - cr.left, width: er.width });
    }
  }, [target]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        ...vars,
        position: 'relative',
        display: 'inline-flex',
        background: 'color-mix(in srgb, var(--ink) 6%, transparent)',
        borderRadius: 10,
        padding: 4,
      }}
      onMouseLeave={() => setHover(null)}
    >
      <motion.div
        animate={{ x: pill.left, width: pill.width }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'absolute',
          top: 4,
          left: 0,
          height: 'calc(100% - 8px)',
          background: 'var(--accent)',
          borderRadius: 8,
        }}
      />
      {options.map((opt, i) => (
        <button
          key={opt}
          ref={(el) => (optionRefs.current[i] = el)}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '8px 18px',
            background: 'none',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: i === selected ? 700 : 500,
            color: i === target ? '#fff' : 'var(--ink)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            transition: 'color 0.15s',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   19. RevealOnScroll
   ================================================================ */

/**
 * Element fades + slides in when in viewport.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.y=40] - Initial offset px.
 * @param {number} [props.duration=0.6]
 * @param {string} [props.className]
 */
export function RevealOnScroll({
  children,
  y = 40,
  duration = 0.6,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const vars = useThemeVars();

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...vars, color: 'var(--ink)' }}
      initial={{ opacity: 0, y }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ================================================================
   20. StaggerChildren
   ================================================================ */

/**
 * Children animate in sequence with delay.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.delay=0.08] - Delay between children (s).
 * @param {number} [props.y=30] - Initial offset px.
 * @param {string} [props.className]
 */
export function StaggerChildren({
  children,
  delay = 0.08,
  y = 30,
  className = '',
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const vars = useThemeVars();

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: delay } },
  };

  const childVariants = {
    hidden: { opacity: 0, y },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...vars, color: 'var(--ink)' }}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={childVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
}
