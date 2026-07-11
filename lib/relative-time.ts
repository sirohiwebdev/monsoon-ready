import type { Lang } from "./types";

const RELATIVE_STRINGS: Record<
  Lang,
  {
    justNow: string;
    secondsAgo: (n: number) => string;
    minutesAgo: (n: number) => string;
    hoursAgo: (n: number) => string;
  }
> = {
  en: {
    justNow: "just now",
    secondsAgo: (n) => `${n}s ago`,
    minutesAgo: (n) => `${n}m ago`,
    hoursAgo: (n) => `${n}h ago`,
  },
  hi: {
    justNow: "अभी",
    secondsAgo: (n) => `${n} सेकंड पहले`,
    minutesAgo: (n) => `${n} मिनट पहले`,
    hoursAgo: (n) => `${n} घंटे पहले`,
  },
  mr: {
    justNow: "आत्ता",
    secondsAgo: (n) => `${n} सेकंद आधी`,
    minutesAgo: (n) => `${n} मिनिटे आधी`,
    hoursAgo: (n) => `${n} तास आधी`,
  },
};

/** ms timestamp -> "just now" / "3m ago" / "1h ago" (localized). */
export function formatRelative(
  ms: number,
  lang: Lang = "en",
  now: number = Date.now(),
): string {
  const s = RELATIVE_STRINGS[lang];
  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 30) return s.justNow;
  if (diffSec < 60) return s.secondsAgo(diffSec);
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return s.minutesAgo(diffMin);
  return s.hoursAgo(Math.floor(diffMin / 60));
}
