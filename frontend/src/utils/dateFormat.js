/**
 * Relative time formatting for both English and Bahasa Melayu.
 * Uses Intl.RelativeTimeFormat where available, with a custom fallback.
 */

const MS_IN = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
};

// Custom BM relative time map (fallback for older browsers)
const BM_UNITS = {
  minute: { one: 'minit lalu', other: 'minit lalu' },
  hour:   { one: 'jam lalu',   other: 'jam lalu' },
  day:    { one: 'hari lalu',  other: 'hari lalu' },
  week:   { one: 'minggu lalu', other: 'minggu lalu' },
  month:  { one: 'bulan lalu', other: 'bulan lalu' },
  year:   { one: 'tahun lalu', other: 'tahun lalu' },
};

const EN_UNITS = {
  minute: { one: 'minute ago', other: 'minutes ago' },
  hour:   { one: 'hour ago',   other: 'hours ago' },
  day:    { one: 'day ago',    other: 'days ago' },
  week:   { one: 'week ago',   other: 'weeks ago' },
  month:  { one: 'month ago',  other: 'months ago' },
  year:   { one: 'year ago',   other: 'years ago' },
};

// For the compact format used in ArticleCard
const COMPACT_EN = {
  minute: 'm ago',
  hour: 'h ago',
  day: 'd ago',
  week: 'w ago',
};

const COMPACT_MS = {
  minute: 'm lalu',
  hour: 'j lalu',
  day: 'h lalu',
  week: 'mg lalu',
};

/**
 * Format a date string as relative time in the given language.
 * @param {string} dateStr - ISO date string
 * @param {string} lang - 'en' or 'ms'
 * @param {boolean} compact - If true, returns compact format like "2j lalu"
 * @returns {string}
 */
export function formatRelativeTime(dateStr, lang = 'en', compact = false) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;

  if (diffMs < 0) return lang === 'ms' ? 'baru sahaja' : 'just now';

  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  const diffWeeks = Math.floor(diffDays / 7);

  // "just now" for < 1 min
  if (diffMins < 1) {
    return lang === 'ms' ? 'baru sahaja' : 'just now';
  }

  // Compact format (used in article cards)
  if (compact) {
    const units = lang === 'ms' ? COMPACT_MS : COMPACT_EN;
    if (diffMins < 60) return `${diffMins}${units.minute}`;
    if (diffHours < 24) return `${diffHours}${units.hour}`;
    if (diffDays < 7) return `${diffDays}${units.day}`;
    if (diffWeeks < 4) return `${diffWeeks}${units.week}`;
    // Fall through to formatted date
    return formatAbsoluteDate(dateStr, lang);
  }

  // Try Intl.RelativeTimeFormat first
  try {
    const locale = lang === 'ms' ? 'ms-MY' : 'en-MY';
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

    if (diffMins < 60) return rtf.format(-diffMins, 'minute');
    if (diffHours < 24) return rtf.format(-diffHours, 'hour');
    if (diffDays < 7) return rtf.format(-diffDays, 'day');
    if (diffWeeks < 5) return rtf.format(-diffWeeks, 'week');

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return rtf.format(-diffMonths, 'month');

    const diffYears = Math.floor(diffDays / 365);
    return rtf.format(-diffYears, 'year');
  } catch {
    // Fallback for browsers without Intl.RelativeTimeFormat
    const units = lang === 'ms' ? BM_UNITS : EN_UNITS;
    if (diffMins < 60) return `${diffMins} ${units.minute.other}`;
    if (diffHours < 24) return `${diffHours} ${units.hour.other}`;
    if (diffDays < 7) return `${diffDays} ${units.day.other}`;
    if (diffWeeks < 5) return `${diffWeeks} ${units.week.other}`;
    return formatAbsoluteDate(dateStr, lang);
  }
}

/**
 * Format a date as absolute date string.
 * @param {string} dateStr
 * @param {string} lang
 * @returns {string}
 */
export function formatAbsoluteDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY';
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
}

/**
 * Format a date for display in article detail (month + day only).
 * @param {string} dateStr
 * @param {string} lang
 * @returns {string}
 */
export function formatShortDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY';
  try {
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric', month: 'short',
    });
  } catch {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      day: 'numeric', month: 'short',
    });
  }
}

/**
 * Format current date for the masthead.
 * @param {string} lang
 * @returns {string}
 */
export function formatTodayMasthead(lang = 'en') {
  const locale = lang === 'ms' ? 'ms-MY' : 'en-MY';
  try {
    return new Date().toLocaleDateString(locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return new Date().toLocaleDateString('en-MY', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }
}
