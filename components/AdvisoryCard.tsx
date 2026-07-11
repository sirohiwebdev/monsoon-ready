"use client";

import { useEffect, useState } from "react";
import { Megaphone, ShieldCheck } from "lucide-react";
import type { Advisory, Lang } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";
import { fetchAdvisories } from "@/lib/client";

interface AdvisoryCardProps {
  state: string | null;
  lang: Lang;
}

const DOT_CLASS: Record<Advisory["severityColor"], string> = {
  red: "bg-red-600",
  orange: "bg-orange-500",
  yellow: "bg-amber-400",
  green: "bg-emerald-500",
};

/**
 * Best-effort government advisory feed (NDMA SACHET). Renders nothing while
 * loading or when there's no state to check. Once the feed has genuinely been
 * checked and nothing matches, shows a reassuring "all clear" line rather
 * than a placeholder — but never fabricates content attributed to a
 * government source when the feed itself is unreachable is indistinguishable
 * from "no alerts", so both cases get the same calm message.
 */
export default function AdvisoryCard({ state, lang }: AdvisoryCardProps) {
  const t = STRINGS[lang];
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [checked, setChecked] = useState(false);
  const [prevKey, setPrevKey] = useState<string | null>(state);

  // Reset when the state prop changes — during render, not in an effect.
  if (state !== prevKey) {
    setPrevKey(state);
    setAdvisories([]);
    setChecked(false);
  }

  useEffect(() => {
    if (!state) return;
    let cancelled = false;
    fetchAdvisories(state).then((result) => {
      if (cancelled) return;
      setAdvisories(result);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [state]);

  if (!checked) return null;

  if (advisories.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
        <ShieldCheck
          size={18}
          strokeWidth={2.25}
          className="shrink-0 text-emerald-600"
          aria-hidden
        />
        <p className="text-sm text-emerald-800">{t.noAdvisories}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Megaphone
          size={18}
          strokeWidth={2.25}
          className="text-blue-700"
          aria-hidden
        />
        {t.advisoryTitle}
      </h2>
      <ul className="flex flex-col gap-3">
        {advisories.map((a) => (
          <li key={a.id} className="flex gap-2.5">
            <span
              aria-hidden
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[a.severityColor]}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {a.disasterType} — {a.areaDescription}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                {a.message}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t.sourceLabel}: {a.source}
                {a.effectiveEnd && (
                  <>
                    {" · "}
                    {t.activeUntil}{" "}
                    {new Date(a.effectiveEnd).toLocaleString(
                      lang === "en" ? "en-IN" : lang,
                      {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
