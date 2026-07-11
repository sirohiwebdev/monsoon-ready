"use client";

import { useState } from "react";
import type { Lang, Plan, Profile } from "@/lib/types";
import { severityFromRain } from "@/lib/severity";
import { STRINGS } from "@/lib/i18n";
import { fetchPlan } from "@/lib/client";
import { useLiveWeather } from "@/lib/useLiveWeather";
import LocationGate from "@/components/LocationGate";
import ConditionsBar from "@/components/ConditionsBar";
import EmergencyContactsCard from "@/components/EmergencyContactsCard";
import AdvisoryCard from "@/components/AdvisoryCard";
import PlanRequestCard from "@/components/PlanRequestCard";
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
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const live = useLiveWeather();
  const t = STRINGS[lang];

  async function handleGeneratePlan() {
    if (!live.weather) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      setPlan(await fetchPlan(profile, live.weather, lang));
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setPlanLoading(false);
    }
  }

  if (!live.weather) {
    if (live.refreshing) {
      return <Loader messages={t.locatingWeather} />;
    }
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
        onChangeLocation={live.reset}
        lang={lang}
      />

      <main className="mx-auto w-full max-w-md px-4 py-6 md:max-w-2xl md:px-6 md:py-8 lg:max-w-6xl lg:px-8">
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
            {planLoading ? (
              <Loader messages={t.loading(live.weather.place)} />
            ) : plan ? (
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
              <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500">
                {t.emptyPlanPrompt}
              </div>
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
            <ChatBox lang={lang} profile={profile} weather={live.weather} />
          </div>
        </div>
      </main>
    </>
  );
}
