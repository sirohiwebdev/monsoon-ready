"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, RefreshCw, Thermometer } from "lucide-react";
import type { Lang, WeatherSummary } from "@/lib/types";
import type { SeverityInfo } from "@/lib/severity";
import { STRINGS } from "@/lib/i18n";
import { formatRelative } from "@/lib/relative-time";

interface ConditionsBarProps {
  weather: WeatherSummary;
  severity: SeverityInfo;
  lastUpdated: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onChangeLocation: () => void;
  lang: Lang;
}

export default function ConditionsBar({
  weather,
  severity,
  lastUpdated,
  refreshing,
  onRefresh,
  onChangeLocation,
  lang,
}: ConditionsBarProps) {
  const t = STRINGS[lang];

  // Re-render every 30s so "Updated Xm ago" stays fresh without a full refetch.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:max-w-2xl lg:max-w-6xl lg:px-8">
        <div className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
          <MapPin
            size={16}
            strokeWidth={2.25}
            className="shrink-0 text-blue-700"
            aria-hidden
          />
          <span className="truncate">{weather.place}</span>
          <button
            type="button"
            onClick={onChangeLocation}
            aria-label={t.changeLocation}
            title={t.changeLocation}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Pencil size={13} strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${severity.bgClass} ${severity.textClass}`}
        >
          {t.severityLabel[severity.level]}
        </span>

        <span className="tnum inline-flex items-center gap-1 text-sm text-slate-600">
          {weather.currentRainMm} mm
        </span>
        <span className="tnum inline-flex items-center gap-1 text-sm text-slate-600">
          <Thermometer
            size={14}
            strokeWidth={2.25}
            className="text-slate-400"
            aria-hidden
          />
          {weather.tempC}°C
        </span>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>
            {t.updated} {lastUpdated ? formatRelative(lastUpdated, lang) : "—"}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            aria-label={t.refresh}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <RefreshCw
              size={15}
              strokeWidth={2.25}
              className={refreshing ? "animate-spin" : ""}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </header>
  );
}
