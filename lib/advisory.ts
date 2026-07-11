import { z } from "zod";
import type { Advisory } from "./types";
import { withRetry } from "./retry";
import { createLogger } from "./logger";

const log = createLogger("advisory");

// NDMA SACHET's public alert feed — verified live, no auth required. This is an
// undocumented internal endpoint of a .gov.in site, not a published/versioned
// API: it can change shape or vanish without notice. Every step below degrades
// to an empty result rather than throwing, and we never fabricate content
// attributed to a government source.
const SACHET_URL =
  "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails";
const TIMEOUT_MS = 4000;

const rawAlertSchema = z
  .object({
    identifier: z.union([z.number(), z.string()]),
    severity_color: z.string().optional(),
    disaster_type: z.string().optional(),
    area_description: z.string().optional(),
    warning_message: z.string().optional(),
    alert_source: z.string().optional(),
    effective_start_time: z.string().optional(),
    effective_end_time: z.string().optional(),
    actual_lang: z.string().optional(),
  })
  .passthrough();

const SEVERITY_RANK: Record<string, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  green: 3,
};
const SEVERITY_COLORS = new Set(["red", "orange", "yellow", "green"]);
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Sat Jul 11 12:57:00 IST 2026" -> Date. Fixed +05:30 offset (source is always IST). */
function parseSachetTime(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(
    /^\w{3} (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) IST (\d{4})$/,
  );
  if (!m) return null;
  const [, mon, day, hh, mm, ss, year] = m;
  const monthIdx = MONTHS.indexOf(mon);
  if (monthIdx < 0) return null;
  const utcMs =
    Date.UTC(+year, monthIdx, +day, +hh, +mm, +ss) - (5 * 60 + 30) * 60_000;
  return new Date(utcMs);
}

/**
 * Fetch + filter SACHET alerts relevant to a state. Never throws — any failure
 * (network, timeout, bad shape) resolves to []. Best-effort, not guaranteed.
 */
export async function fetchAdvisories(state: string): Promise<Advisory[]> {
  try {
    const res = await withRetry(
      () => fetch(SACHET_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      {
        maxAttempts: 2,
        onRetry: (a, e) =>
          log.warn("retrying SACHET fetch", { attempt: a, error: String(e) }),
      },
    );
    if (!res.ok) return [];
    const json = await res.json();

    const parsed = z.array(rawAlertSchema).safeParse(json);
    if (!parsed.success) return [];
    const rows = parsed.data;

    const now = Date.now();
    const stateLower = state.toLowerCase();

    const matched = rows.filter((r) => {
      if (r.actual_lang !== "en") return false;
      if (!r.area_description?.toLowerCase().includes(stateLower)) return false;
      const end = parseSachetTime(r.effective_end_time);
      if (end && end.getTime() < now) return false; // expired
      return true;
    });

    const advisories: Advisory[] = matched.map((r) => ({
      id: String(r.identifier),
      severityColor: (SEVERITY_COLORS.has(r.severity_color ?? "")
        ? r.severity_color
        : "yellow") as Advisory["severityColor"],
      disasterType: r.disaster_type ?? "Advisory",
      areaDescription: r.area_description ?? "",
      message: r.warning_message ?? "",
      source: r.alert_source ?? "NDMA SACHET",
      effectiveEnd:
        parseSachetTime(r.effective_end_time)?.toISOString() ?? null,
    }));

    advisories.sort(
      (a, b) => SEVERITY_RANK[a.severityColor] - SEVERITY_RANK[b.severityColor],
    );
    return advisories.slice(0, 5);
  } catch {
    return [];
  }
}
