import type OpenAI from "openai";
import { LANG_NAMES, type Lang, type Profile, type WeatherSummary } from "./types";

type ChatCompletionMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// ── /api/plan — THE graded artifact (spec §7). Edit reasoning rules here first. ──

const PLAN_SYSTEM = `You are an emergency-preparedness advisor for monsoon and urban-flood safety in India.
You give calm, specific, life-safety guidance for ordinary citizens — not generic tips.
You reason about THIS storm and THIS household. You never invent weather data; use only the
numbers provided. Respond ONLY as a single JSON object matching the schema. No prose outside JSON.
Write ALL user-facing text natively in the requested language (including emergency terms),
not translated-sounding English.`;

function planUserMessage(profile: Profile, weather: WeatherSummary, lang: Lang): string {
  return `LANGUAGE: ${LANG_NAMES[lang]}

LIVE WEATHER for ${weather.place}:
- Now: ${weather.tempC}°C, rainfall ${weather.currentRainMm} mm, wind ${weather.windKmh} km/h
- Next 12h total rainfall: ${weather.next12hRainMm} mm
- Peak rain window: ${weather.peakWindow} (about ${weather.hoursToPeak} hours from now)

HOUSEHOLD:
- ${profile.householdSize} people, ${profile.floor} floor
- kids: ${profile.hasKids}, elderly: ${profile.hasElderly}, vehicle: ${profile.hasVehicle}, pets: ${profile.hasPets}

TASK:
Produce a personalized, prioritized monsoon action plan for THIS household facing THIS forecast.
Rules for good reasoning (judges reward these):
1. SEQUENCE by time-criticality. There are ~${weather.hoursToPeak} hours before peak rain — put the most
   urgent actions first in do_now and reference the timing.
2. TAILOR to the profile: ground floor -> move valuables/electricals up, water-entry risk is high.
   elderly -> medicines in a waterproof bag, mobility plan. kids -> keep together, ID on them.
   no vehicle -> plan on foot / public options, do not attempt flooded roads. pets -> include them.
3. GROUND every claim in the real numbers above; severity_reason must cite them.
4. avoid[] = concrete travel/area advice (underpasses, low-lying roads, riverside — flooding risk).
5. contacts[] = real India emergency numbers: NDMA/Disaster 1078, Police 100, Ambulance 108,
   Fire 101, plus a note to save the local municipal ward helpline.
6. Keep each list item short and actionable (one sentence). 4–7 items per list.

Return ONLY the JSON object with keys:
headline, severity_reason, do_now[], prepare[], avoid[], kit[], contacts[{label,number}].`;
}

export function buildPlanMessages(
  profile: Profile,
  weather: WeatherSummary,
  lang: Lang,
): ChatCompletionMessage[] {
  return [
    { role: "system", content: PLAN_SYSTEM },
    { role: "user", content: planUserMessage(profile, weather, lang) },
  ];
}

// ── /api/chat — follow-up during/after the event (spec §7 tail). ──

function chatSystem(lang: Lang): string {
  return `You are an emergency-preparedness advisor for monsoon and urban-flood safety in India.
You give calm, specific, life-safety guidance for ordinary citizens — not generic tips.
Answer in ${LANG_NAMES[lang]}, in 2–4 short sentences, calm and specific, prioritizing immediate
safety. Use only the situation context provided; do not invent weather data. Plain text only.`;
}

export function buildChatMessages(
  question: string,
  context: string,
  lang: Lang,
): ChatCompletionMessage[] {
  return [
    { role: "system", content: chatSystem(lang) },
    {
      role: "user",
      content: `SITUATION CONTEXT:\n${context}\n\nQUESTION:\n${question}`,
    },
  ];
}

/** Compact one-string context passed from the client to /api/chat. */
export function buildChatContext(profile: Profile, weather: WeatherSummary): string {
  return [
    `Place: ${weather.place}`,
    `Now: ${weather.tempC}°C, rain ${weather.currentRainMm}mm, wind ${weather.windKmh}km/h`,
    `Next 12h rain: ${weather.next12hRainMm}mm; peak ${weather.peakWindow} (~${weather.hoursToPeak}h away)`,
    `Household: ${profile.householdSize} people, ${profile.floor} floor, kids=${profile.hasKids}, elderly=${profile.hasElderly}, vehicle=${profile.hasVehicle}, pets=${profile.hasPets}`,
  ].join("\n");
}
