"use client";

import { LANG_NAMES, type Lang } from "@/lib/types";

const ORDER: Lang[] = ["en", "hi", "mr"];

interface LanguageToggleProps {
  value: Lang;
  onChange: (lang: Lang) => void;
}

/** Segmented control: EN · हिन्दी · मराठी */
export default function LanguageToggle({ value, onChange }: LanguageToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1"
    >
      {ORDER.map((lang) => {
        const active = lang === value;
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(lang)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {lang === "en" ? "EN" : LANG_NAMES[lang]}
          </button>
        );
      })}
    </div>
  );
}
