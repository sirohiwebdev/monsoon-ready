"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import type { Lang, Profile } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";
import ProfileChips from "./ProfileChips";
import LanguageToggle from "./LanguageToggle";

interface PlanRequestCardProps {
  profile: Profile;
  lang: Lang;
  mode: "initial" | "regenerate";
  busy: boolean;
  error: string | null;
  onProfileChange: (p: Profile) => void;
  onLangChange: (l: Lang) => void;
  onSubmit: () => void;
}

/**
 * Household profile + language + the button that generates or regenerates
 * the plan. One component for both moments so the chip/toggle markup only
 * exists once in the tree.
 */
export default function PlanRequestCard({
  profile,
  lang,
  mode,
  busy,
  error,
  onProfileChange,
  onLangChange,
  onSubmit,
}: PlanRequestCardProps) {
  const t = STRINGS[lang];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        {mode === "initial" ? t.initialTitle : t.adjustTitle}
      </h2>

      <ProfileChips profile={profile} lang={lang} onChange={onProfileChange} />

      <div className="mt-4">
        <LanguageToggle value={lang} onChange={onLangChange} />
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={busy}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 font-semibold text-white transition-colors hover:bg-blue-800 active:translate-y-px disabled:opacity-50"
      >
        {mode === "initial" ? (
          <>
            {t.cta}
            <ArrowRight size={18} strokeWidth={2.25} aria-hidden />
          </>
        ) : (
          <>
            <RefreshCw size={18} strokeWidth={2.25} aria-hidden />
            {t.regenerate}
          </>
        )}
      </button>
    </div>
  );
}
