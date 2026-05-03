/**
 * Simple client-side sliding-window rate limiter.
 * Tracks request timestamps per key using a module-level Map.
 * Resets on page reload / app restart.
 */

const MAX_REQUESTS = 20;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

const requestLog = new Map<string, number[]>();

/**
 * Returns true when the caller has exceeded the rate limit for `key`.
 * Records the current request in the sliding window on every call.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Keep only timestamps within the current window
  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}
