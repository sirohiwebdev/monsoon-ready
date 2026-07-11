# MonsoonReady 🌧️

Personalized monsoon & urban-flood safety guidance for India. The *same* incoming
storm produces a *different* action plan for a ground-floor family with an elderly
parent than for a 4th-floor person with a car — generated live, in the user's language.
**That difference is the AI.**

Built for PromptWars (Google Build-with-AI). The graded artifact is the prompt in
[`lib/prompts.ts`](lib/prompts.ts).

## How it works

1. **`/api/weather`** — geocodes the typed area (or geolocation) and pulls a live
   forecast from [Open-Meteo](https://open-meteo.com) (no API key). Shapes it into a
   compact `WeatherSummary`: next-12h rainfall, peak window, hours-to-peak.
2. **`/api/plan`** — one OpenAI call (JSON mode) with the household profile + live
   weather → a structured, personalized, weather-grounded plan, written natively in
   English / हिन्दी / मराठी. Validated against the `Plan` schema with Zod.
3. **`/api/chat`** — follow-up Q&A ("water is entering my building") grounded in the
   same context, answered in the chosen language.

Severity color (green → red) is computed **deterministically in code**
([`lib/severity.ts`](lib/severity.ts)) from rainfall mm — never by the LLM.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then add your OPENAI_API_KEY
npm run dev                         # http://localhost:3000
```

`OPENAI_API_KEY` is server-side only — it never reaches the client. Optionally set
`OPENAI_MODEL` (defaults to `gpt-4o-mini`).

## Demo script

1. Type **Kothrud, Pune** → chips: **4 people · Ground floor · Elderly · no Vehicle**
   → **मराठी** → *Get my safety plan*.
2. Read one line of the plan aloud (it cites the real rainfall and the hours to peak).
3. On the result screen, switch **Ground → Upper floor**, add **Vehicle**,
   *Regenerate* — **the plan changes against the same storm.** That's the AI.
4. Ask in chat: *"water is entering my building, what now?"* → calm, specific answer.

## Project layout

```
app/
  page.tsx                # client: holds all state, switches Input <-> Result
  api/{weather,plan,chat}/route.ts
components/                # InputCard, ProfileChips, LanguageToggle,
                           # SeverityBanner, PlanView, ChatBox, Loader
lib/
  types.ts                # shared contracts
  severity.ts             # pure fn: rainfall mm -> severity + color
  weather.ts              # Open-Meteo fetch + shaping (pure summarizeHourly)
  prompts.ts              # THE prompt (graded artifact) + chat prompt
  plan-schema.ts          # Zod validation of the LLM's JSON
  llm.ts                  # server-side OpenAI client + model
  i18n.ts / client.ts     # UI strings (en/hi/mr) + typed fetch wrappers
```
