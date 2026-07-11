const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const SWEEP_MS = 5 * 60_000;

const hits = new Map<string, { count: number; reset: number }>();
let lastSweep = 0;

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  if (now - lastSweep > SWEEP_MS) {
    for (const [key, entry] of hits) {
      if (now > entry.reset) hits.delete(key);
    }
    lastSweep = now;
  }
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}
