# BUILD SPEC — "MonsoonReady" · Monsoon Preparedness & Citizen Assistance

> **How to use this file:** Paste into Claude Code / Cursor as the project brief. Build in the
> order given in §10. Do not add features outside §2. The graded artifact is the prompt in §7 —
> get it working end-to-end before polishing UI.

---

## 1. Context (why this exists)

3-hour hackathon build for **PromptWars** (a Google Build-with-AI event). The name means judges
weight **prompt quality and centrality of the LLM** above code polish. Everything below is
designed so the AI does real, visible reasoning — not a chatbot bolted onto a static app.

**The one demo moment we are building toward:** the _same_ incoming storm produces a _different_
action plan for a ground-floor family with an elderly parent than for a 4th-floor person with a
car — generated live, in the user's language. That difference IS the AI, and it's the pitch.

---

## 2. Scope — LOCKED. Do not exceed

### MUST build

- Single-screen input: location (geolocation + manual fallback), profile chips, language selector, one CTA.
- Live weather fetch via **Open-Meteo** (no API key — do NOT introduce any weather service that needs signup).
- One LLM generation (`/api/plan`) → structured, personalized, weather-grounded, language-native plan.
- Result screen rendering that plan in clean sections + a deterministic severity banner.
- Follow-up chat (`/api/chat`) — "what do I do now" during/after the event.

### SHOULD build (only after MUST works end-to-end)

- Language toggle: English / हिन्दी / मराठी.
- Time-criticality sequencing in the plan ("~3 hrs to peak rain, do X first").
- Loading shimmer + subtle motion on results.

### WON'T build (state these in the demo as deliberate scoping, not gaps)

- Real SMS/push alerts → represented by the in-app severity banner.
- Auth / accounts / database → all state lives in React.
- "After-event" as a separate flow → the chat covers during/after.

---

## 3. Stack

- **Next.js (App Router)** + TypeScript + Tailwind CSS.
- **OpenAI SDK** (`openai` npm package). Model: `gpt-4o-mini` with **JSON mode**
  (`response_format: { type: "json_object" }`). If a newer fast mini model is available on the
  account, it can swap in — keep JSON mode.
- No DB, no ORM, no auth library.
- Deploy target: **Vercel**.
- API key stays **server-side only** (API routes). Never expose it to the client.

---

## 4. File tree

```
app/
  layout.tsx
  page.tsx                # client component: holds all state, switches Input ↔ Result
  globals.css             # Tailwind + a few custom keyframes
  api/
    weather/route.ts      # GET: geocode + forecast from Open-Meteo
    plan/route.ts         # POST: {location, weather, profile, lang} -> structured plan JSON
    chat/route.ts         # POST: {question, context, lang} -> short answer string
components/
  InputCard.tsx           # location + chips + language + CTA
  ProfileChips.tsx        # tappable multi-select chips
  LanguageToggle.tsx
  SeverityBanner.tsx      # deterministic color from rainfall mm
  PlanView.tsx            # renders the structured plan sections
  ChatBox.tsx
  Loader.tsx              # lively shimmer
lib/
  types.ts                # shared TS types (see §6)
  severity.ts             # pure fn: rainfall mm -> severity level + color
  weather.ts              # Open-Meteo fetch helpers + shaping
```

---

## 5. Data source — Open-Meteo (no key)

**Geocode** a typed place name:

```
https://geocoding-api.open-meteo.com/v1/search?name=Pune&count=1&language=en&format=json
```

→ returns `latitude`, `longitude`, `name`, `admin1`.

**Forecast** (use lat/lng from geolocation or geocode):

```
https://api.open-meteo.com/v1/forecast
  ?latitude=18.52&longitude=73.85
  &current=temperature_2m,precipitation,weather_code,wind_speed_10m
  &hourly=precipitation,precipitation_probability
  &forecast_days=2&timezone=auto
```

From the response, `/api/weather` should compute and return a compact shape the prompt can use:

- current temp, current precipitation (mm), wind speed, weather_code
- **next-12h total rainfall (mm)** and **peak rainfall hour** (from the hourly arrays)
- a short human window string, e.g. `"Heavy rain expected 20:00–02:00"`

Keep the safety-critical severity color **deterministic in code** (§6 `severity.ts`), NOT from the LLM.

---

## 6. Types & contracts (`lib/types.ts`)

```ts
export type Lang = "en" | "hi" | "mr";

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

// Severity is computed in code, not by the LLM:
export type Severity = "low" | "moderate" | "high" | "severe";
// severity.ts thresholds on next12hRainMm (tune during build):
//   <10 low(green) · 10–35 moderate(yellow) · 35–70 high(orange) · >70 severe(red)

// The LLM MUST return exactly this shape (JSON mode):
export interface Plan {
  headline: string; // one-line situation summary in the chosen language
  severity_reason: string; // why it's serious, referencing the real numbers
  do_now: string[]; // time-critical, ordered most-urgent first
  prepare: string[]; // before peak rain
  avoid: string[]; // travel/area advisories
  kit: string[]; // emergency kit checklist
  contacts: { label: string; number: string }[]; // India emergency numbers
}
```

---

## 7. THE PROMPT — `/api/plan` (the graded artifact — get this right first)

Server route: POST `{ profile, weather, lang }` → returns `Plan` JSON.

**System message:**

```
You are an emergency-preparedness advisor for monsoon and urban-flood safety in India.
You give calm, specific, life-safety guidance for ordinary citizens — not generic tips.
You reason about THIS storm and THIS household. You never invent weather data; use only the
numbers provided. Respond ONLY as a single JSON object matching the schema. No prose outside JSON.
Write ALL user-facing text natively in the requested language (including emergency terms),
not translated-sounding English.
```

**User message (interpolate real values):**

```
LANGUAGE: {full language name — English / हिन्दी / मराठी}

LIVE WEATHER for {place}:
- Now: {tempC}°C, rainfall {currentRainMm} mm, wind {windKmh} km/h
- Next 12h total rainfall: {next12hRainMm} mm
- Peak rain window: {peakWindow} (about {hoursToPeak} hours from now)

HOUSEHOLD:
- {householdSize} people, {floor} floor
- kids: {hasKids}, elderly: {hasElderly}, vehicle: {hasVehicle}, pets: {hasPets}

TASK:
Produce a personalized, prioritized monsoon action plan for THIS household facing THIS forecast.
Rules for good reasoning (judges reward these):
1. SEQUENCE by time-criticality. There are ~{hoursToPeak} hours before peak rain — put the most
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
headline, severity_reason, do_now[], prepare[], avoid[], kit[], contacts[{label,number}].
```

> This prompt is your competitive edge. If you improve one thing with spare time, improve the
> reasoning rules here — not the CSS.

**`/api/chat`** — POST `{ question, lang, context }` where `context` = a compact string of the
weather summary + profile. System: same advisor persona, "answer in {lang}, 2–4 short sentences,
calm and specific, prioritize immediate safety." Return plain text.

---

## 8. UI direction — intuitive + lively (for stressed, non-technical users)

**Principle:** a panicking person on a phone must succeed in one glance. Big touch targets,
generous spacing, one primary action per screen, no jargon.

**Palette (monsoon, but reassuring — not alarming until it needs to be):**

- Background: soft slate/indigo gradient (`from-slate-900 via-slate-800 to-indigo-900`) or a light
  `from-sky-50 to-indigo-50` — pick one and stay consistent. Rain theme, calm.
- Accent / CTA: teal-to-blue (`from-teal-400 to-sky-500`) — feels fresh, safe, actionable.
- Severity banner colors are the ONLY place red/orange appear, so they read as real signals:
  green `emerald-500`, yellow `amber-400`, orange `orange-500`, red `red-600` (pulsing).

**Liveliness (subtle, not gimmicky — motion signals "alive/real-time"):**

- CTA button: gentle scale on hover/press, soft glow.
- Result sections **stagger-fade in** (each section 60–80ms after the last) so the plan feels
  generated live. This alone makes the demo feel premium.
- Loader: an animated rain/shimmer line, not a spinner. Copy rotates: "Reading the sky over
  {place}…" → "Building your plan…". Makes 5s of latency feel intentional.
- Severity=severe: banner has a slow pulse. Nothing else blinks.

**Input screen layout (no scroll on mobile):**

1. App name + one-line tagline ("Your personal monsoon safety plan").
2. Location: a "📍 Use my location" button + a text field ("or type your area").
3. Profile chips (tappable, multi-select, clearly toggled state):
   `4 people` (stepper or chips 1/2/4/6) · `Ground floor` / `Upper floor` · `Kids` · `Elderly` ·
   `Vehicle` · `Pets`. Default sensible values so an impatient user can just hit the CTA.
4. Language toggle: `EN · हिन्दी · मराठी` as a pill segmented control.
5. Big CTA: **"Get my safety plan →"**.

**Result screen:**

- SeverityBanner pinned at top (color + `headline` + `peakWindow`).
- Sections in this order with icons: **Do now** (⚡, urgent, first) · **Prepare** (🎒) ·
  **Avoid** (🚫) · **Emergency kit** (✅ checklist with tappable checkboxes) · **Who to call**
  (📞 — numbers are tap-to-dial `tel:` links).
- A "← New plan" back action.
- ChatBox docked at the bottom: "Ask anything (e.g. water is entering my building)".

**Accessibility:** large fonts, high contrast, tel: links, works one-handed. Assume a cheap
Android phone on patchy network.

---

## 9. Env & setup

```
# .env.local
OPENAI_API_KEY=sk-...
```

- `npm i openai` ; Tailwind via `create-next-app --tailwind` or manual.
- Open-Meteo needs no key.
- Guard: if `OPENAI_API_KEY` missing, `/api/plan` returns a friendly error the UI can show.

---

## 10. Build order (timeboxed to ~3 hrs — follow strictly)

1. **(0:00–0:20)** `create-next-app` (TS + Tailwind). Add types (§6) + `severity.ts` + `.env.local`.
2. **(0:20–0:45)** `/api/weather` — geocode + forecast + shape into `WeatherSummary`. Test with a curl / browser hit for "Pune".
3. **(0:45–1:20)** `/api/plan` — wire OpenAI JSON mode with the §7 prompt. Test it returns valid `Plan` JSON for a hardcoded profile+weather. **This is the milestone — the app "works" once this returns good JSON.**
4. **(1:20–2:05)** Input screen + Result screen + SeverityBanner + PlanView. Get the full click-through working in English.
5. **(2:05–2:30)** `/api/chat` + ChatBox.
6. **(2:30–2:50)** Language toggle (EN/hi/mr) — just passes `lang` through; verify Marathi output. Add stagger-fade + loader polish.
7. **(2:50–3:00)** Deploy to Vercel. Run the demo script once end-to-end. STOP adding features.

**Fallback if behind:** cut chat and multilingual; a single English personalized plan grounded in
live weather still wins the "GenAI is central" point. Never cut the personalization (profile→prompt).

---

## 11. Demo script (rehearse this — presentation is graded)

1. "Monsoon guidance is usually one-size-fits-all. Ours reasons about _your_ home and _tonight's_
   storm."
2. Type **Kothrud, Pune** → chips: **4 people, Ground floor, Elderly, No vehicle** → **मराठी** → CTA.
3. Red banner + plan fades in. Read one line: _"Because you're on the ground floor with heavy rain
   at 8PM, step one is move electricals and medicines up — you have ~3 hours."_
4. Change floor to **Upper** + add **Vehicle**, regenerate → **plan changes**. "Same storm,
   different household, different plan. That's the AI."
5. Type in chat: _"water is entering my building, what now?"_ → calm specific answer.
6. Close: "In-app now; SMS alerts and post-event recovery are the roadmap."

---

## 12. Guardrails for the AI IDE

- Do not add a database, auth, or a second AI provider.
- Do not move the OpenAI key to the client.
- Do not let the LLM decide the severity color — use `severity.ts`.
- Do not exceed §2 scope. If unsure, build less and make the demo path flawless.
