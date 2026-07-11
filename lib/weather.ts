import type { WeatherSummary } from "./types";

// Open-Meteo — free, no API key required.
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const FORECAST_HORIZON_HOURS = 12;

export interface GeoLocation {
  latitude: number;
  longitude: number;
  /** Display name, e.g. "Kothrud, Maharashtra". */
  place: string;
}

interface GeocodeResponse {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    admin1?: string;
    country?: string;
  }>;
}

interface ForecastResponse {
  current?: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    precipitation: number[];
    precipitation_probability: number[];
  };
}

class WeatherError extends Error {}

async function fetchJson<T>(url: string, what: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new WeatherError(`Could not reach the weather service (${what}). Check your connection.`);
  }
  if (!res.ok) {
    throw new WeatherError(`Weather service error while ${what} (${res.status}).`);
  }
  return (await res.json()) as T;
}

export { WeatherError };

/**
 * Resolve a typed place name to coordinates. Open-Meteo's geocoder only knows
 * city-level names (e.g. "Pune"), not localities (e.g. "Kothrud"). So for a
 * query like "Kothrud, Pune" we try the whole string, then each comma-separated
 * part — city-first, since the broader name is more likely to resolve — while
 * keeping the user's original text as the display label.
 */
export async function geocodePlace(name: string): Promise<GeoLocation> {
  const original = name.trim();
  const parts = original.split(",").map((p) => p.trim()).filter(Boolean);
  // Candidates: full string first, then parts right-to-left (city before locality).
  const candidates = [original, ...parts.slice().reverse()].filter(
    (c, i, arr) => c && arr.indexOf(c) === i,
  );

  for (const candidate of candidates) {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(candidate)}&count=1&language=en&format=json`;
    const data = await fetchJson<GeocodeResponse>(url, "finding your area");
    const hit = data.results?.[0];
    if (hit) {
      const matched = [hit.name, hit.admin1].filter(Boolean).join(", ");
      // Prefer the user's own words when they were more specific (multi-part).
      const place = parts.length > 1 ? original : matched;
      return { latitude: hit.latitude, longitude: hit.longitude, place };
    }
  }

  throw new WeatherError(`Couldn't find "${original}". Try a nearby city or a more specific area.`);
}

/** Reverse-geocode coordinates to a friendly place name; falls back to a coord string. */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  // Open-Meteo has no reverse endpoint; nearest-name via a tiny forward search is unreliable,
  // so we present a rounded coordinate label. Kept intentionally simple per spec scope.
  return `Your location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
}

/**
 * Fetch the forecast and shape it into the compact WeatherSummary the prompt consumes.
 * Computes next-12h total rainfall, the peak rain window, and hours-to-peak.
 */
export async function getWeatherSummary(
  latitude: number,
  longitude: number,
  place: string,
): Promise<WeatherSummary> {
  const url =
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,precipitation,weather_code,wind_speed_10m` +
    `&hourly=precipitation,precipitation_probability` +
    `&forecast_days=2&timezone=auto`;

  const data = await fetchJson<ForecastResponse>(url, "reading the forecast");

  const current = data.current;
  const hourly = data.hourly;
  if (!current || !hourly?.time?.length) {
    throw new WeatherError("The forecast came back empty. Please try again in a moment.");
  }

  const { next12hRainMm, peakWindow, hoursToPeak } = summarizeHourly(
    hourly.time,
    hourly.precipitation ?? [],
    current.time,
  );

  return {
    place,
    tempC: round1(current.temperature_2m),
    currentRainMm: round1(current.precipitation),
    windKmh: round1(current.wind_speed_10m),
    next12hRainMm: round1(next12hRainMm),
    peakWindow,
    hoursToPeak,
  };
}

/** Pure helper (exported for testing): derive the 12h rainfall picture from hourly arrays. */
export function summarizeHourly(
  times: string[],
  precipitation: number[],
  currentTime: string,
): { next12hRainMm: number; peakWindow: string; hoursToPeak: number } {
  // Align "now" to the current hour in the hourly series.
  const startIdx = alignStartIndex(times, currentTime);
  const endIdx = Math.min(startIdx + FORECAST_HORIZON_HOURS, times.length);

  let total = 0;
  let peakIdx = startIdx;
  let peakVal = -1;
  for (let i = startIdx; i < endIdx; i++) {
    const mm = precipitation[i] ?? 0;
    total += mm;
    if (mm > peakVal) {
      peakVal = mm;
      peakIdx = i;
    }
  }

  // No meaningful rain in the window.
  if (peakVal <= 0) {
    return { next12hRainMm: total, peakWindow: "No significant rain expected", hoursToPeak: 0 };
  }

  // Build a window from the contiguous run of "significant" hours around the peak.
  const threshold = Math.max(0.5, peakVal * 0.3);
  let runStart = peakIdx;
  let runEnd = peakIdx;
  while (runStart > startIdx && (precipitation[runStart - 1] ?? 0) >= threshold) runStart--;
  while (runEnd < endIdx - 1 && (precipitation[runEnd + 1] ?? 0) >= threshold) runEnd++;

  const peakWindow = `${hhmm(times[runStart])}–${hhmm(times[runEnd + 1] ?? times[runEnd])}`;
  const hoursToPeak = Math.max(0, peakIdx - startIdx);

  return { next12hRainMm: total, peakWindow, hoursToPeak };
}

function alignStartIndex(times: string[], currentTime: string): number {
  // Prefer an exact hour match; otherwise first slot at/after now; else 0.
  const exact = times.indexOf(currentTime);
  if (exact >= 0) return exact;
  const nowMs = Date.parse(currentTime);
  if (!Number.isNaN(nowMs)) {
    const idx = times.findIndex((t) => Date.parse(t) >= nowMs);
    if (idx >= 0) return idx;
  }
  return 0;
}

/** "2026-07-11T20:00" -> "20:00" */
function hhmm(iso: string): string {
  const t = iso?.split("T")[1];
  return t ? t.slice(0, 5) : "--:--";
}

function round1(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 10) / 10;
}
