/**
 * Utility helpers for TapsLog
 */

/**
 * Combines class names (Tailwind-safe). Drop-in without clsx if needed.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format ISO date string to a readable local time
 * @param {string} isoDate
 * @returns {string}
 */
export function formatTime(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format ISO date string to a short date
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Map scan action/status to UI badge intent
 * @param {string} status
 * @returns {'green'|'yellow'|'blue'|'red'|'gray'}
 */
export function statusToIntent(status) {
  const map = {
    PRESENT: 'green',
    LATE: 'yellow',
    COMPLETED: 'blue',
    STUDENT_TIME_IN: 'green',
    STUDENT_TIME_OUT: 'blue',
    SESSION_ACTIVATED: 'green',
    SESSION_CLOSED: 'gray',
    ERROR_403: 'red',
    ERROR_409: 'red',
  };
  return map[status] ?? 'gray';
}

/**
 * Play a beep sound via Web Audio API for tap feedback
 * @param {'success'|'warning'|'error'} type
 */
export function playBeep(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freqMap = { success: 880, warning: 440, error: 220 };
    osc.frequency.value = freqMap[type] ?? 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not supported — fail silently
  }
}
