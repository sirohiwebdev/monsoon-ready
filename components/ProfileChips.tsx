"use client";

import {
  Baby,
  Building2,
  Car,
  Check,
  Home,
  PawPrint,
  PersonStanding,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Lang, Profile } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";

interface ProfileChipsProps {
  profile: Profile;
  lang: Lang;
  onChange: (profile: Profile) => void;
}

const HOUSEHOLD_OPTIONS = [1, 2, 4, 6];

function Chip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-blue-600 bg-blue-50 text-blue-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {Icon && (
        <Icon
          size={18}
          strokeWidth={2}
          className={active ? "text-blue-600" : "text-slate-400"}
          aria-hidden
        />
      )}
      {children}
      {active && <Check size={16} strokeWidth={2.5} className="text-blue-600" aria-hidden />}
    </button>
  );
}

function FieldLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      <Icon size={14} strokeWidth={2.25} aria-hidden />
      {children}
    </p>
  );
}

export default function ProfileChips({ profile, lang, onChange }: ProfileChipsProps) {
  const t = STRINGS[lang];
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });

  return (
    <div className="flex flex-col gap-4">
      {/* Household size */}
      <div>
        <FieldLabel icon={Users}>{t.household}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {HOUSEHOLD_OPTIONS.map((n) => (
            <Chip
              key={n}
              active={profile.householdSize === n}
              onClick={() => set({ householdSize: n })}
            >
              {n} {t.people(n)}
            </Chip>
          ))}
        </div>
      </div>

      {/* Floor — flood exposure, the most important field */}
      <div>
        <FieldLabel icon={Home}>{t.floorLabel}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={profile.floor === "ground"}
            onClick={() => set({ floor: "ground" })}
            icon={Home}
          >
            {t.groundFloor}
          </Chip>
          <Chip
            active={profile.floor === "upper"}
            onClick={() => set({ floor: "upper" })}
            icon={Building2}
          >
            {t.upperFloor}
          </Chip>
        </div>
      </div>

      {/* Boolean attributes */}
      <div>
        <FieldLabel icon={Users}>{t.inHome}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          <Chip active={profile.hasKids} onClick={() => set({ hasKids: !profile.hasKids })} icon={Baby}>
            {t.kids}
          </Chip>
          <Chip
            active={profile.hasElderly}
            onClick={() => set({ hasElderly: !profile.hasElderly })}
            icon={PersonStanding}
          >
            {t.elderly}
          </Chip>
          <Chip
            active={profile.hasVehicle}
            onClick={() => set({ hasVehicle: !profile.hasVehicle })}
            icon={Car}
          >
            {t.vehicle}
          </Chip>
          <Chip
            active={profile.hasPets}
            onClick={() => set({ hasPets: !profile.hasPets })}
            icon={PawPrint}
          >
            {t.pets}
          </Chip>
        </div>
      </div>
    </div>
  );
}
