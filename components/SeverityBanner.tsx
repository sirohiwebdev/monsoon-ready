"use client";

import {
  AlertTriangle,
  CloudRain,
  Clock,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { Lang, Severity } from "@/lib/types";
import type { SeverityInfo } from "@/lib/severity";
import { STRINGS } from "@/lib/i18n";

interface SeverityBannerProps {
  severity: SeverityInfo;
  headline: string;
  peakWindow: string;
  lang: Lang;
}

const ICON: Record<Severity, LucideIcon> = {
  low: ShieldCheck,
  moderate: CloudRain,
  high: AlertTriangle,
  severe: Siren,
};

export default function SeverityBanner({
  severity,
  headline,
  peakWindow,
  lang,
}: SeverityBannerProps) {
  const t = STRINGS[lang];
  const Icon = ICON[severity.level];

  return (
    <div
      role="alert"
      className={`rounded-xl p-4 shadow-sm ${severity.bgClass} ${severity.textClass} ${
        severity.pulse ? "pulse-severe" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <Icon size={20} strokeWidth={2.25} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-bold uppercase tracking-widest">
              {t.severityLabel[severity.level]}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold tnum">
              <Clock size={12} strokeWidth={2.5} aria-hidden />
              {t.peakLabel}: {peakWindow}
            </span>
          </div>
          <p className="mt-1.5 text-lg font-bold leading-snug">{headline}</p>
        </div>
      </div>
    </div>
  );
}
