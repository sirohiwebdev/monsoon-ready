import type { Advisory, Lang, Plan, Profile, WeatherSummary } from "./types";

// Thin client-side wrappers around the API routes. Each throws an Error whose
// message is the server's friendly text, so UI can show it directly.

const CLIENT_TIMEOUT_MS = 15_000;

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchWeatherByPlace(
  place: string,
): Promise<WeatherSummary> {
  const res = await fetch(`/api/weather?place=${encodeURIComponent(place)}`, {
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(await readError(res, "Couldn't fetch the weather."));
  return res.json();
}

export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
): Promise<WeatherSummary> {
  const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`, {
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(await readError(res, "Couldn't fetch the weather."));
  return res.json();
}

export async function fetchPlan(
  profile: Profile,
  weather: WeatherSummary,
  lang: Lang,
): Promise<Plan> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, weather, lang }),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok)
    throw new Error(await readError(res, "Couldn't generate your plan."));
  return res.json();
}

export async function fetchAdvisories(state: string): Promise<Advisory[]> {
  const res = await fetch(`/api/advisory?state=${encodeURIComponent(state)}`, {
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { advisories: Advisory[] };
  return data.advisories ?? [];
}

export async function fetchChatAnswer(
  question: string,
  profile: Profile,
  weather: WeatherSummary,
  lang: Lang,
): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, profile, weather, lang }),
    signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(await readError(res, "Couldn't get an answer."));
  const data = (await res.json()) as { answer: string };
  return data.answer;
}
