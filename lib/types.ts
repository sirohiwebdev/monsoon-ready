// Shared type contracts for MonsoonReady.
// These types are the single source of truth shared across API routes,
// lib helpers, and client components.

export type Lang = "en" | "hi" | "mr";

export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
};

export interface Profile {
  householdSize: number;
  floor: "ground" | "upper"; // flood exposure — most important field
  hasKids: boolean;
  hasElderly: boolean;
  hasVehicle: boolean;
  hasPets: boolean;
}

export interface WeatherSummary {
  place: string;
  state: string | null; // admin1 from geocode, e.g. "Maharashtra" — key for contacts/advisory
  latitude: number; // needed to re-poll without re-geocoding
  longitude: number;
  tempC: number;
  currentRainMm: number;
  windKmh: number;
  next12hRainMm: number;
  peakWindow: string; // "20:00–02:00"
  hoursToPeak: number; // for time-criticality sequencing
}

// Severity is computed deterministically in code (lib/severity.ts), never by the LLM.
export type Severity = "low" | "moderate" | "high" | "severe";

export interface Contact {
  label: string;
  number: string;
}

// The LLM MUST return exactly this shape (JSON mode). Validated with Zod.
export interface Plan {
  headline: string; // one-line situation summary in the chosen language
  severity_reason: string; // why it's serious, referencing the real numbers
  do_now: string[]; // time-critical, ordered most-urgent first
  prepare: string[]; // before peak rain
  avoid: string[]; // travel/area advisories
  kit: string[]; // emergency kit checklist
  contacts: Contact[]; // India emergency numbers
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// A live government alert, sourced from NDMA SACHET. Best-effort — absent when
// no feed is reachable or nothing matches the user's state. Never fabricated.
export interface Advisory {
  id: string;
  severityColor: "red" | "orange" | "yellow" | "green";
  disasterType: string; // "Heavy Rain", "Flood", "Thunderstorm"...
  areaDescription: string; // raw text from source, shown as-is
  message: string;
  source: string; // real attribution, e.g. "Mizoram SDMA"
  effectiveEnd: string | null; // ISO string, or null if unparseable
}
