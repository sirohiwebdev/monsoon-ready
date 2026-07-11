"use client";

import { useState } from "react";
import { ArrowRight, Languages, MapPin, Navigation } from "lucide-react";
import type { Lang, Profile } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";
import ProfileChips from "./ProfileChips";
import LanguageToggle from "./LanguageToggle";

export type LocationInput = { place: string } | { lat: number; lon: number };

interface InputCardProps {
  profile: Profile;
  lang: Lang;
  busy: boolean;
  error: string | null;
  onProfileChange: (p: Profile) => void;
  onLangChange: (l: Lang) => void;
  onSubmit: (loc: LocationInput) => void;
}

export default function InputCard({
  profile,
  lang,
  busy,
  error,
  onProfileChange,
  onLangChange,
  onSubmit,
}: InputCardProps) {
  const t = STRINGS[lang];
  const [place, setPlace] = useState("");
  const [locating, setLocating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function useMyLocation() {
    setLocalError(null);
    if (!navigator.geolocation) {
      setLocalError(t.needLocation);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onSubmit({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setLocalError(t.needLocation);
      },
      { timeout: 10000 },
    );
  }

  function submitPlace() {
    const trimmed = place.trim();
    if (!trimmed) {
      setLocalError(t.needLocation);
      return;
    }
    setLocalError(null);
    onSubmit({ place: trimmed });
  }

  const shownError = error ?? localError;

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Monsoon<span className="text-blue-700">Ready</span>
        </h1>
        <p className="mt-1 text-slate-600">{t.tagline}</p>
      </header>

      <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        {/* Location */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={busy || locating}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Navigation size={18} strokeWidth={2} className="text-blue-700" aria-hidden />
            {locating ? t.locating : t.useLocation}
          </button>
          <div className="relative">
            <MapPin
              size={18}
              strokeWidth={2}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPlace();
              }}
              placeholder={t.areaPlaceholder}
              className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Profile */}
        <ProfileChips profile={profile} lang={lang} onChange={onProfileChange} />

        <div className="h-px bg-slate-100" />

        {/* Language */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Languages size={14} strokeWidth={2.25} aria-hidden />
            {t.language}
          </p>
          <LanguageToggle value={lang} onChange={onLangChange} />
        </div>
      </div>

      {shownError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {shownError}
        </p>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={submitPlace}
        disabled={busy || locating}
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 text-lg font-semibold text-white shadow-sm transition-all hover:bg-blue-800 active:translate-y-px disabled:opacity-50"
      >
        {t.cta}
        <ArrowRight size={20} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
