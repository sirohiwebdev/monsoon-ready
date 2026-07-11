"use client";

import { useState } from "react";
import { ArrowLeft, RefreshCw, SlidersHorizontal } from "lucide-react";
import type { Lang, Plan, Profile, WeatherSummary } from "@/lib/types";
import { severityFromRain } from "@/lib/severity";
import { STRINGS } from "@/lib/i18n";
import {
  fetchPlan,
  fetchWeatherByCoords,
  fetchWeatherByPlace,
} from "@/lib/client";
import { buildChatContext } from "@/lib/prompts";
import InputCard, { type LocationInput } from "@/components/InputCard";
import ProfileChips from "@/components/ProfileChips";
import LanguageToggle from "@/components/LanguageToggle";
import SeverityBanner from "@/components/SeverityBanner";
import PlanView from "@/components/PlanView";
import ChatBox from "@/components/ChatBox";
import Loader from "@/components/Loader";

// Sensible defaults so an impatient user can just hit the CTA.
const DEFAULT_PROFILE: Profile = {
  householdSize: 4,
  floor: "ground",
  hasKids: false,
  hasElderly: false,
  hasVehicle: false,
  hasPets: false,
};

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState("your area");

  const t = STRINGS[lang];

  // Initial flow: fetch live weather, then generate the plan.
  async function handleSubmit(loc: LocationInput) {
    setError(null);
    setLoading(true);
    setLocationLabel("place" in loc ? loc.place : "your area");
    try {
      const w =
        "place" in loc
          ? await fetchWeatherByPlace(loc.place)
          : await fetchWeatherByCoords(loc.lat, loc.lon);
      setWeather(w);
      setLocationLabel(w.place);
      const p = await fetchPlan(profile, w, lang);
      setPlan(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setWeather(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }

  // Same storm, different household/language — reuses cached weather (no refetch).
  async function handleRegenerate() {
    if (!weather) return;
    setError(null);
    setLoading(true);
    try {
      const p = await fetchPlan(profile, weather, lang);
      setPlan(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleNewPlan() {
    setPlan(null);
    setWeather(null);
    setError(null);
  }

  const showResult = plan !== null && weather !== null;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl md:px-6 md:py-10 lg:max-w-6xl lg:px-8">
      {loading ? (
        <Loader messages={t.loading(locationLabel)} />
      ) : showResult ? (
        <ResultScreen
          plan={plan}
          weather={weather}
          profile={profile}
          lang={lang}
          error={error}
          onProfileChange={setProfile}
          onLangChange={setLang}
          onRegenerate={handleRegenerate}
          onNewPlan={handleNewPlan}
        />
      ) : (
        <div className="mx-auto w-full max-w-md lg:max-w-xl">
          <InputCard
            profile={profile}
            lang={lang}
            busy={loading}
            error={error}
            onProfileChange={setProfile}
            onLangChange={setLang}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </main>
  );
}

function ResultScreen({
  plan,
  weather,
  profile,
  lang,
  error,
  onProfileChange,
  onLangChange,
  onRegenerate,
  onNewPlan,
}: {
  plan: Plan;
  weather: WeatherSummary;
  profile: Profile;
  lang: Lang;
  error: string | null;
  onProfileChange: (p: Profile) => void;
  onLangChange: (l: Lang) => void;
  onRegenerate: () => void;
  onNewPlan: () => void;
}) {
  const t = STRINGS[lang];
  const severity = severityFromRain(weather.next12hRainMm);

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onNewPlan}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          {t.newPlan}
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
          {weather.place}
        </span>
      </div>

      <SeverityBanner
        severity={severity}
        headline={plan.headline}
        peakWindow={weather.peakWindow}
        lang={lang}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="lg:col-span-2">
          <PlanView plan={plan} lang={lang} />
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          {/* Adjust household / language and regenerate against the SAME storm. */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <SlidersHorizontal size={18} strokeWidth={2.25} className="text-blue-700" aria-hidden />
              {t.adjustTitle}
            </h2>
            <ProfileChips profile={profile} lang={lang} onChange={onProfileChange} />
            <div className="mt-4">
              <LanguageToggle value={lang} onChange={onLangChange} />
            </div>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 font-semibold text-white transition-colors hover:bg-blue-800 active:translate-y-px"
            >
              <RefreshCw size={18} strokeWidth={2.25} aria-hidden />
              {t.regenerate}
            </button>
          </div>

          <ChatBox lang={lang} context={buildChatContext(profile, weather)} />
        </div>
      </div>
    </div>
  );
}
