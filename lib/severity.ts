import type { Severity } from "./types";

export interface SeverityInfo {
  level: Severity;
  /** Human label, English (banner also shows LLM headline in the user's language). */
  label: string;
  /** Tailwind background classes for the banner. */
  bgClass: string;
  /** Tailwind text class that reads well on the banner background. */
  textClass: string;
  /** Whether the banner should pulse (severe only). */
  pulse: boolean;
}

// Thresholds on next-12h rainfall (mm), per spec §6.
//   <10 low(green) · 10–35 moderate(yellow) · 35–70 high(orange) · >70 severe(red)
const LOW_MAX = 10;
const MODERATE_MAX = 35;
const HIGH_MAX = 70;

/**
 * Deterministic severity from forecast rainfall. This is safety-critical, so it
 * is computed in code — never delegated to the LLM.
 */
export function severityFromRain(next12hRainMm: number): SeverityInfo {
  const mm = Number.isFinite(next12hRainMm) ? next12hRainMm : 0;

  if (mm < LOW_MAX) {
    return {
      level: "low",
      label: "Low risk",
      bgClass: "bg-emerald-600",
      textClass: "text-white",
      pulse: false,
    };
  }
  if (mm < MODERATE_MAX) {
    return {
      level: "moderate",
      label: "Moderate risk",
      bgClass: "bg-amber-500",
      textClass: "text-slate-900",
      pulse: false,
    };
  }
  if (mm < HIGH_MAX) {
    return {
      level: "high",
      label: "High risk",
      bgClass: "bg-orange-600",
      textClass: "text-white",
      pulse: false,
    };
  }
  return {
    level: "severe",
    label: "Severe risk",
    bgClass: "bg-red-600",
    textClass: "text-white",
    pulse: true,
  };
}
