/**
 * Pluggable rate-limit store. The default InMemoryStore works for single-instance
 * deployments (dev, demo, hackathon). For production with multiple serverless
 * instances, provide a Redis-backed or shared-cache store so limits are enforced
 * globally. The store interface is intentionally minimal.
 */
export interface RateLimitStore {
  get(ip: string): { count: number; reset: number } | null;
  set(ip: string, entry: { count: number; reset: number }): void;
  increment(ip: string): void;
  deleteExpired(now: number): void;
}

class InMemoryStore implements RateLimitStore {
  private hits = new Map<string, { count: number; reset: number }>();
  private lastSweep = 0;
  private sweepMs: number;

  constructor(sweepMs = 5 * 60_000) {
    this.sweepMs = sweepMs;
  }

  get(ip: string) {
    return this.hits.get(ip) ?? null;
  }

  set(ip: string, entry: { count: number; reset: number }) {
    this.hits.set(ip, entry);
  }

  increment(ip: string) {
    const entry = this.hits.get(ip);
    if (entry) entry.count++;
  }

  deleteExpired(now: number) {
    if (now - this.lastSweep < this.sweepMs) return;
    for (const [key, entry] of this.hits) {
      if (now > entry.reset) this.hits.delete(key);
    }
    this.lastSweep = now;
  }
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const store: RateLimitStore = new InMemoryStore();

export function rateLimit(ip: string, s: RateLimitStore = store): boolean {
  const now = Date.now();
  s.deleteExpired(now);
  const entry = s.get(ip);
  if (!entry || now > entry.reset) {
    s.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  s.increment(ip);
  return true;
}

export function getClientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
