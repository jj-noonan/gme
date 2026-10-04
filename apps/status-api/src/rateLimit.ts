/**
 * A fixed-window request counter per client key. In-memory, so it resets on
 * deploy or restart — fine for a backstop on a single small machine.
 */
export function createRateLimiter(limit: { requests: number; windowMs: number }) {
  const windows = new Map<string, { startedAt: number; count: number }>();

  return function allow(key: string, now = Date.now()): boolean {
    const current = windows.get(key);
    if (!current || now - current.startedAt >= limit.windowMs) {
      // Drop finished windows as we go so the map can't grow without bound.
      for (const [k, w] of windows) {
        if (now - w.startedAt >= limit.windowMs) windows.delete(k);
      }
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= limit.requests;
  };
}
