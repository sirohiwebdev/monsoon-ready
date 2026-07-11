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
  tempC: number;
  currentRainMm: number;
  windKmh: number;
  next12hRainMm: number;
  peakWindow: string; // "20:00–02:00"
  hoursToPeak: number; // for time-criticality sequencing
}

// Severity is computed deterministically in code (lib/severity.ts), never by the LLM.
export type Severity = "low" | "moderate" | "high" | "severe";

// The LLM MUST return exactly this shape (JSON mode). Validated with Zod.
export interface Plan {
  headline: string; // one-line situation summary in the chosen language
  severity_reason: string; // why it's serious, referencing the real numbers
  do_now: string[]; // time-critical, ordered most-urgent first
  prepare: string[]; // before peak rain
  avoid: string[]; // travel/area advisories
  kit: string[]; // emergency kit checklist
  contacts: { label: string; number: string }[]; // India emergency numbers
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
