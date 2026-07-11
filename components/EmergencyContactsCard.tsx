"use client";

import { memo } from "react";
import { ChevronDown, Phone, ShieldAlert } from "lucide-react";
import type { Lang } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";
import { getContactsFor } from "@/lib/emergency-contacts";

interface EmergencyContactsCardProps {
  place: string;
  state: string | null;
  lang: Lang;
}

/** Always rendered, static data — must work even if every other API is down. */
function EmergencyContactsCard({
  place,
  state,
  lang,
}: EmergencyContactsCardProps) {
  const t = STRINGS[lang];
  const { national, local } = getContactsFor(place, state);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <ShieldAlert
          size={18}
          strokeWidth={2.25}
          className="text-red-600"
          aria-hidden
        />
        {t.emergencyTitle}
      </h2>

      <div className="flex flex-wrap gap-2">
        {national.map((c) => (
          <a
            key={c.number}
            href={`tel:${c.number}`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <Phone
              size={14}
              strokeWidth={2.25}
              className="text-blue-700"
              aria-hidden
            />
            <span className="text-slate-700">{c.label}</span>
            <span className="tnum font-bold text-blue-700">{c.number}</span>
          </a>
        ))}
      </div>

      {local.length > 0 && (
        <details className="mt-3 group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-blue-700">
            <ChevronDown
              size={15}
              strokeWidth={2.25}
              className="transition-transform group-open:rotate-180"
              aria-hidden
            />
            {t.moreNumbers(local.length)}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {local.map((c) => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <Phone
                  size={14}
                  strokeWidth={2.25}
                  className="text-blue-700"
                  aria-hidden
                />
                <span className="text-slate-700">{c.label}</span>
                <span className="tnum font-bold text-blue-700">{c.number}</span>
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default memo(EmergencyContactsCard);
