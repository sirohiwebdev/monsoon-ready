# MonsoonReady — Dashboard Upgrade: Low-Level Spec

Turns the app from a one-shot plan generator into a persistent, auto-refreshing
situational-awareness dashboard. Weather polling decouples from plan generation;
emergency contacts become static/always-on; a real government advisory feed
(NDMA SACHET, verified live) is added; news is a stretch goal.

Decisions locked:

- Emergency contacts: **persistent card**, always visible once location is known.
- Government data: **no-signup only**. IMD requires an approved account — excluded
  entirely. NDMA SACHET's public alert endpoint is open, no auth, verified live
  (see below) — used instead.

---

## 0. Verified data source — NDMA SACHET

```
GET https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails
```

No auth, no key, returns a flat JSON array of ~20 live national alerts. Confirmed shape:

```json
{
  "severity": "WARNING",
  "identifier": 1783754745476032,
  "effective_start_time": "Sat Jul 11 12:50:00 IST 2026",
  "effective_end_time": "Sun Jul 12 12:50:00 IST 2026",
  "disaster_type": "Thunderstorm",
  "area_description": "10 districts of Mizoram",
  "severity_level": "Very Likely",
  "actual_lang": "en",
  "warning_message": "Tun atanga darkar 24 chhung hian ...",
  "disseminated": "true",
  "severity_color": "red",
  "alert_source": "Mizoram SDMA"
}
```

Notes:

- `severity_color` ∈ observed `{red, orange, yellow}` (green possible, unconfirmed) — this is the reliable field to key UI color off; `severity` is inconsistent (mixes `WATCH`/`WARNING`/`ALERT` and color names depending on source).
- `area_description` is free text ending in `"... of <StateName>"` — match by substring against the state name from geocoding.
- `effective_*_time` format: `"Sat Jul 11 12:57:00 IST 2026"` — **not** reliably parsed by `Date.parse` across JS engines. Write a small hand-rolled parser (below), fixed `+05:30` offset (source is always IST).
- `alert_source` gives real attribution (`"Tripura SDMA"`, `"IMD Visakhapatnam"`) — show as-is, never invent a source.
- **This is an undocumented internal endpoint of a .gov.in site, not a published/versioned API.** It can change shape or vanish without notice. Every layer below must degrade to an empty result, never an error, never fabricated content.

---

## 1. Types — `lib/types.ts` (edit)

```ts
export interface WeatherSummary {
  place: string;
  state: string | null; // NEW — admin1 from geocode, e.g. "Maharashtra"
  latitude: number; // NEW — needed to re-poll without re-geocoding
  longitude: number; // NEW
  tempC: number;
  currentRainMm: number;
  windKmh: number;
  next12hRainMm: number;
  peakWindow: string;
  hoursToPeak: number;
}

export interface Contact {
  label: string;
  number: string;
}

export interface Advisory {
  id: string;
  severityColor: "red" | "orange" | "yellow" | "green";
  disasterType: string; // "Heavy Rain", "Flood", "Thunderstorm"...
  areaDescription: string; // raw text from source, shown as-is
  message: string;
  source: string; // real attribution, e.g. "Mizoram SDMA"
  effectiveEnd: string | null; // ISO string, or null if unparseable
}
```

`Profile`, `Plan`, `Severity`, `Lang` — unchanged.

---

## 2. `lib/weather.ts` (edit)

```ts
export interface GeoLocation {
  latitude: number;
  longitude: number;
  place: string;
  state: string | null; // NEW
}

export async function geocodePlace(name: string): Promise<GeoLocation>;
// same candidate-fallback logic as today; additionally read hit.admin1 -> state

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<{ place: string; state: string | null }>;
// unchanged limitation (no reverse endpoint) — state stays null for geolocation-only flow;
// contacts/advisory gracefully show national-only / omit in that case

export async function getWeatherSummary(
  latitude: number,
  longitude: number,
  place: string,
  state: string | null, // NEW param
): Promise<WeatherSummary>;
// unchanged forecast logic; now also echoes latitude/longitude/state into the return object
```

`app/api/weather/route.ts`: pass `state`/coords through to `getWeatherSummary`; response shape grows additively (non-breaking).

---

## 3. `lib/emergency-contacts.ts` (new) — static, zero network, cannot fail

```ts
export const NATIONAL_CONTACTS: Contact[] = [
  { label: "Police", number: "100" },
  { label: "Ambulance", number: "108" },
  { label: "Fire", number: "101" },
  { label: "NDMA / Disaster Helpline", number: "1078" },
  { label: "Women's Helpline", number: "1091" },
  { label: "Child Helpline", number: "1098" },
  { label: "Emergency (all-in-one)", number: "112" },
];

// Keyed by admin1 (state name as returned by Open-Meteo geocoding).
// Sparse by design — only numbers verified with reasonable confidence.
// Extend this table over time; never guess a digit.
const STATE_CONTROL_ROOMS: Record<string, Contact[]> = {
  Maharashtra: [{ label: "State Disaster Mgmt Control Room", number: "1077" }],
};

// Keyed by case-insensitive substring match against the resolved place name.
const CITY_CONTACTS: Record<string, Contact[]> = {
  Mumbai: [{ label: "BMC Disaster Control Room", number: "1916" }],
  Pune: [{ label: "PMC Disaster Control Room", number: "1077" }],
};

export function getContactsFor(
  place: string,
  state: string | null,
): { national: Contact[]; local: Contact[] } {
  const local: Contact[] = [];
  if (state && STATE_CONTROL_ROOMS[state])
    local.push(...STATE_CONTROL_ROOMS[state]);
  for (const [city, contacts] of Object.entries(CITY_CONTACTS)) {
    if (place.toLowerCase().includes(city.toLowerCase()))
      local.push(...contacts);
  }
  // de-dupe by number
  const seen = new Set<string>();
  const dedup = local.filter((c) =>
    seen.has(c.number) ? false : (seen.add(c.number), true),
  );
  return { national: NATIONAL_CONTACTS, local: dedup };
}
```

Pure function. No `fetch`, no `async`. This is what makes "always available" literally true.

---

## 4. `lib/advisory.ts` (new) — SACHET fetch, parse, filter

```ts
import { z } from "zod";
import type { Advisory } from "./types";

const SACHET_URL =
  "https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails";
const TIMEOUT_MS = 4000;

// Loose validation — undocumented endpoint, tolerate unknown/missing fields,
// never throw on a shape change. .passthrough() + all-optional except identifier.
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

/** "Sat Jul 11 12:57:00 IST 2026" -> Date (fixed +05:30 offset; source is always IST). */
function parseSachetTime(s: string | undefined): Date | null {
  if (!s) return null;
  const m = s.match(
    /^\w{3} (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) IST (\d{4})$/,
  );
  if (!m) return null;
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
  const [, mon, day, hh, mm, ss, year] = m;
  const monthIdx = MONTHS.indexOf(mon);
  if (monthIdx < 0) return null;
  // Build as UTC then subtract the +05:30 offset to get the true UTC instant.
  const utcMs =
    Date.UTC(+year, monthIdx, +day, +hh, +mm, +ss) - (5 * 60 + 30) * 60_000;
  return new Date(utcMs);
}

/**
 * Fetch + filter SACHET alerts relevant to a state. Never throws — any failure
 * (network, timeout, bad shape) resolves to []. This is an undocumented .gov.in
 * endpoint; the contract is "best effort", not guaranteed.
 */
export async function fetchAdvisories(state: string): Promise<Advisory[]> {
  try {
    const res = await fetch(SACHET_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = z.array(rawAlertSchema).catch([]).parse(json);

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
      severityColor: (["red", "orange", "yellow", "green"] as const).includes(
        r.severity_color as "red",
      )
        ? (r.severity_color as Advisory["severityColor"])
        : "yellow",
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
```

## `app/api/advisory/route.ts` (new)

```ts
import { NextResponse } from "next/server";
import { fetchAdvisories } from "@/lib/advisory";

// GET /api/advisory?state=Maharashtra -> { advisories: Advisory[] }
// Always 200. A broken upstream feed must never surface as an app error.
export async function GET(req: Request) {
  const state = new URL(req.url).searchParams.get("state")?.trim();
  if (!state) return NextResponse.json({ advisories: [] });
  const advisories = await fetchAdvisories(state).catch(() => []);
  return NextResponse.json({ advisories });
}
```

## `lib/client.ts` (edit) — add

```ts
export async function fetchAdvisories(state: string): Promise<Advisory[]> {
  const res = await fetch(`/api/advisory?state=${encodeURIComponent(state)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { advisories: Advisory[] };
  return data.advisories ?? [];
}
```

---

## 5. `lib/relative-time.ts` (new) — tiny pure helper

```ts
/** ms timestamp -> "just now" / "3m ago" / "1h ago". */
export function formatRelative(ms: number, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}
```

---

## 6. `lib/useLiveWeather.ts` (new) — the polling engine

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherSummary } from "./types";
import { fetchWeatherByCoords, fetchWeatherByPlace } from "./client";

export type LocationInput = { place: string } | { lat: number; lon: number };

interface State {
  weather: WeatherSummary | null;
  lastUpdated: number | null;
  refreshing: boolean;
  error: string | null;
}

const REFRESH_MS = 5 * 60 * 1000;

export function useLiveWeather() {
  const [state, setState] = useState<State>({
    weather: null,
    lastUpdated: null,
    refreshing: false,
    error: null,
  });
  const locRef = useRef<LocationInput | null>(null);

  const load = useCallback(
    async (loc: LocationInput, opts?: { silent?: boolean }) => {
      locRef.current = loc;
      setState((s) => ({
        ...s,
        refreshing: true,
        error: opts?.silent ? s.error : null,
      }));
      try {
        const w =
          "place" in loc
            ? await fetchWeatherByPlace(loc.place)
            : await fetchWeatherByCoords(loc.lat, loc.lon);
        setState({
          weather: w,
          lastUpdated: Date.now(),
          refreshing: false,
          error: null,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          refreshing: false,
          // Stale-while-revalidate: never blank good data because a refresh failed.
          error: s.weather
            ? null
            : err instanceof Error
              ? err.message
              : "Couldn't load weather.",
        }));
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    if (locRef.current) void load(locRef.current, { silent: true });
  }, [load]);

  // Poll every 5 min; pause while tab hidden; catch up immediately on refocus if stale.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (state.lastUpdated && Date.now() - state.lastUpdated > REFRESH_MS)
        refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, state.lastUpdated]);

  return { ...state, load, refresh };
}
```

---

## 7. Components

### `components/ConditionsBar.tsx` (new) — sticky top bar

Props:

```ts
{ weather: WeatherSummary; severity: SeverityInfo; lastUpdated: number | null;
  refreshing: boolean; onRefresh: () => void; lang: Lang }
```

Layout: `sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3`, flex row, wraps on mobile:

- `MapPin` + `weather.place` (truncate)
- Severity pill: small colored badge using `severity.bgClass`/`textClass` (reuse `lib/severity.ts`) + risk label
- `{currentRainMm} mm · {tempC}°C`
- Right-aligned: "Updated {formatRelative(lastUpdated)}" (re-render every 30s via internal `setInterval`) + `RefreshCw` icon button (`onClick={onRefresh}`, spin class while `refreshing`)

### `components/EmergencyContactsCard.tsx` (new) — persistent, static

Props: `{ place: string; state: string | null; lang: Lang }`

- `getContactsFor(place, state)` — pure, sync, no loading state needed.
- `national` rendered as a horizontal wrap of compact tap-to-dial chips (icon + label + number), same visual language as `PlanView`'s `Contacts` list but denser.
- `local` (if non-empty) inside a native `<details>` disclosure — "More numbers ({n})" — zero extra JS state, accessible by default.

### `components/AdvisoryCard.tsx` (new) — best-effort, silent fallback

Props: `{ state: string | null; lang: Lang }`

- `useEffect` on `state` change: if `state` is null, do nothing (component renders `null`). Else `fetchAdvisories(state)` client-side, `useState<Advisory[]>`.
- If result is empty (no state, no matches, fetch failed) → **render `null`**, no placeholder, no "no advisories" message — avoid visual noise for the common case.
- If non-empty: card with header "Official Advisories", each item: colored dot from `severityColor`, `disasterType` + `areaDescription`, `message` (clamp ~3 lines), footer `Source: {source}` + `Active until {effectiveEnd formatted}` if present.

### `components/PlanRequestCard.tsx` (new) — consolidates initial-CTA and regenerate

Replaces the duplicated chip/language/button block that used to live in both `InputCard` and the result screen's "adjust" panel.

Props:

```ts
{
  profile: Profile; lang: Lang; mode: "initial" | "regenerate";
  busy: boolean; error: string | null;
  onProfileChange: (p: Profile) => void; onLangChange: (l: Lang) => void;
  onSubmit: () => void;
}
```

Renders `ProfileChips` + `LanguageToggle` + one button whose icon/label depends on `mode` (`ArrowRight` + `t.cta` vs `RefreshCw` + `t.regenerate`).

### `components/LocationGate.tsx` (new) — replaces `InputCard`'s role pre-weather

Minimal: brand header + tagline + "Use my location" button + area text field + small error text. No profile chips here — chips move into `PlanRequestCard`, shown only once weather is known. Props: `{ lang: Lang; busy: boolean; error: string | null; onSubmit: (loc: LocationInput) => void }`. (`InputCard.tsx` is deleted; its location-capture JSX moves here, its profile/language JSX moves into `PlanRequestCard`.)

### `components/NewsCard.tsx` (stretch — build last, only if time remains)

Props: `{ place: string; lang: Lang }`. Fetches `/api/news?place=`, renders up to 4 headlines as external links. Renders `null` on empty/error — same silent-fallback rule as advisories.

---

## 8. `app/page.tsx` — new state machine

```tsx
const live = useLiveWeather();
const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
const [lang, setLang] = useState<Lang>("en");
const [plan, setPlan] = useState<Plan | null>(null);
const [planLoading, setPlanLoading] = useState(false);
const [planError, setPlanError] = useState<string | null>(null);

async function handleGeneratePlan() {
  if (!live.weather) return;
  setPlanLoading(true);
  setPlanError(null);
  try {
    setPlan(await fetchPlan(profile, live.weather, lang));
  } catch (err) {
    setPlanError(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    setPlanLoading(false);
  }
}

if (!live.weather) {
  return (
    <LocationGate
      lang={lang}
      busy={live.refreshing}
      error={live.error}
      onSubmit={live.load}
    />
  );
}

const severity = severityFromRain(live.weather.next12hRainMm);

return (
  <>
    <ConditionsBar
      weather={live.weather}
      severity={severity}
      lastUpdated={live.lastUpdated}
      refreshing={live.refreshing}
      onRefresh={live.refresh}
      lang={lang}
    />
    <main className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl lg:max-w-6xl lg:px-8">
      <div className="flex flex-col gap-4">
        <EmergencyContactsCard
          place={live.weather.place}
          state={live.weather.state}
          lang={lang}
        />
        <AdvisoryCard state={live.weather.state} lang={lang} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:mt-6 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {plan ? (
            <>
              <SeverityBanner
                severity={severity}
                headline={plan.headline}
                peakWindow={live.weather.peakWindow}
                lang={lang}
              />
              <PlanView plan={plan} lang={lang} />
            </>
          ) : (
            <EmptyPlanPrompt lang={lang} />
          )}
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <PlanRequestCard
            profile={profile}
            lang={lang}
            mode={plan ? "regenerate" : "initial"}
            busy={planLoading}
            error={planError}
            onProfileChange={setProfile}
            onLangChange={setLang}
            onSubmit={handleGeneratePlan}
          />
          <ChatBox
            lang={lang}
            context={buildChatContext(profile, live.weather)}
          />
        </div>
      </div>
    </main>
  </>
);
```

Key behavior changes vs. today:

- Weather fetch (`live.load`) happens once, from `LocationGate`, then polls independently — **not** re-fetched when generating/regenerating a plan.
- `ChatBox` is available as soon as weather is known, not gated behind plan generation (context only ever needed weather + profile, never the plan itself).
- "New plan" as a separate screen is gone — there is one persistent dashboard; changing profile/floor and hitting the button in `PlanRequestCard` regenerates in place.
- `EmptyPlanPrompt`: small inline component, one line — "Fill in your household details and tap Get my safety plan →".

### Files removed

- `components/InputCard.tsx` (split into `LocationGate` + `PlanRequestCard`)

### Files unchanged

- `lib/severity.ts`, `lib/prompts.ts`, `lib/plan-schema.ts`, `lib/llm.ts`, `lib/i18n.ts` (minor string additions only), `components/ProfileChips.tsx`, `components/LanguageToggle.tsx`, `components/SeverityBanner.tsx`, `components/PlanView.tsx`, `components/ChatBox.tsx`, `components/Loader.tsx` (loader still used for the very first weather fetch inside `LocationGate`), `app/api/plan/route.ts`, `app/api/chat/route.ts`, `app/api/weather/route.ts` (contract grows additively only).

---

## 9. i18n additions — `lib/i18n.ts`

New keys needed across en/hi/mr: `updated` ("Updated"), `refresh` (aria-label), `emergencyTitle` ("Emergency"), `moreNumbers` ("More numbers"), `advisoryTitle` ("Official Advisories"), `activeUntil` ("Active until"), `emptyPlanPrompt` ("Fill in your household details and tap..."), `checkArea` (gate CTA, e.g. "Check my area").

---

## 10. Build order (parallelizable where independent)

1. **Types + pure lib layer** (parallel — no interdependencies beyond `types.ts`): `types.ts` edit → then in parallel: `emergency-contacts.ts`, `relative-time.ts`, `advisory.ts` (new files, independent of each other).
2. `weather.ts` edit (state/coords threading) + `app/api/weather/route.ts` edit — sequential (route depends on weather.ts signature).
3. `app/api/advisory/route.ts` (depends on step 1's `advisory.ts`) + `lib/client.ts` edit (`fetchAdvisories`) — parallel, both only depend on already-finished step 1.
4. `lib/useLiveWeather.ts` (depends on `client.ts`).
5. Components — parallel (all independent of each other, only depend on steps 1–4): `ConditionsBar`, `EmergencyContactsCard`, `AdvisoryCard`, `PlanRequestCard`, `LocationGate`.
6. `i18n.ts` additions (can happen in parallel with step 5 since components will reference keys that get added here).
7. `app/page.tsx` rewrite (depends on everything above) + delete `InputCard.tsx`.
8. Typecheck, build, browser verification (mobile + desktop), live API smoke test (weather → advisory → plan → chat).
9. **Stretch, only if time remains:** `lib/news.ts` + `app/api/news/route.ts` + `components/NewsCard.tsx`, wired into the contacts/advisory column.
