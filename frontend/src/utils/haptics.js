// Haptic feedback utility — Web Vibration API (graceful no-op on unsupported)
// Previously depended on @capacitor/haptics (mobile-only). Dropped Capacitor
// because no native shell ships and the dep brought high-severity tar/cli
// vulnerabilities. The Vibration API gives equivalent UX on Chrome Android.

const safeVibrate = (ms) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // navigator.vibrate may throw in privacy-restricted iframes
  }
};

// style: 'Light' | 'Medium' | 'Heavy'
export const hapticImpact = async (style = 'Medium') => {
  const ms = style === 'Light' ? 10 : style === 'Heavy' ? 30 : 18;
  safeVibrate(ms);
};

// type: 'Success' | 'Warning' | 'Error'
export const hapticNotification = async (type = 'Success') => {
  const pattern = type === 'Success' ? [10, 30, 10]
    : type === 'Warning' ? [20, 60, 20]
    : [40, 100, 40, 100, 40]; // Error — longer triple
  safeVibrate(pattern);
};
