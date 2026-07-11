"use client";

import { useState } from "react";
import { ArrowRight, MapPin, Navigation } from "lucide-react";
import type { Lang } from "@/lib/types";
import type { LocationInput } from "@/lib/useLiveWeather";
import { STRINGS } from "@/lib/i18n";

interface LocationGateProps {
  lang: Lang;
  busy: boolean;
  error: string | null;
  onSubmit: (loc: LocationInput) => void;
}

/** The very first screen: just enough to resolve a location and start the dashboard. */
export default function LocationGate({ lang, busy, error, onSubmit }: LocationGateProps) {
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
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-10 md:max-w-lg">
      <header className="pb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Monsoon<span className="text-blue-700">Ready</span>
        </h1>
        <p className="mt-1 text-slate-600">{t.tagline}</p>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

      {shownError && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {shownError}
        </p>
      )}

      <button
        type="button"
        onClick={submitPlace}
        disabled={busy || locating}
        className="mt-4 inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-blue-700 text-lg font-semibold text-white shadow-sm transition-all hover:bg-blue-800 active:translate-y-px disabled:opacity-50"
      >
        {t.checkArea}
        <ArrowRight size={20} strokeWidth={2.25} aria-hidden />
      </button>
    </main>
  );
}
