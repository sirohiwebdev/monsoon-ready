"use client";

import { useState } from "react";
import {
  Backpack,
  Ban,
  Check,
  ClipboardCheck,
  ClipboardCopy,
  Info,
  ListChecks,
  Phone,
  Printer,
  Siren,
  type LucideIcon,
} from "lucide-react";
import type { Lang, Plan } from "@/lib/types";
import { STRINGS, type UIStrings } from "@/lib/i18n";

interface PlanViewProps {
  plan: Plan;
  lang: Lang;
}

const STAGGER_MS = 70;

function Section({
  icon: Icon,
  iconClass,
  title,
  delayIndex,
  children,
}: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  delayIndex: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="fade-up rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      style={{ animationDelay: `${delayIndex * STAGGER_MS}ms` }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <Icon size={18} strokeWidth={2.25} className={iconClass} aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2.5 text-[15px] leading-relaxed text-slate-800"
        >
          <span
            aria-hidden
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Checklist({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => {
        const on = checked.has(i);
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-pressed={on}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  on
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {on && <Check size={14} strokeWidth={3} />}
              </span>
              <span
                className={`text-[15px] leading-relaxed ${
                  on ? "text-slate-400 line-through" : "text-slate-800"
                }`}
              >
                {item}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Contacts({ contacts }: { contacts: Plan["contacts"] }) {
  return (
    <ul className="flex flex-col gap-2">
      {contacts.map((c, i) => (
        <li key={i}>
          <a
            href={`tel:${c.number.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Phone size={17} strokeWidth={2.25} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] text-slate-800">{c.label}</span>
            <span className="tnum font-semibold text-blue-700">{c.number}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function planToText(plan: Plan, t: UIStrings): string {
  const lines: string[] = [
    `${t.planTitle}: ${plan.headline}`,
    "",
    plan.severity_reason,
    "",
    `${t.sections.do_now}:`,
    ...plan.do_now.map((s) => `  • ${s}`),
    "",
    `${t.sections.prepare}:`,
    ...plan.prepare.map((s) => `  • ${s}`),
    "",
    `${t.sections.avoid}:`,
    ...plan.avoid.map((s) => `  • ${s}`),
    "",
    `${t.sections.kit}:`,
    ...plan.kit.map((s) => `  • ${s}`),
    "",
    `${t.sections.contacts}:`,
    ...plan.contacts.map((c) => `  ${c.label}: ${c.number}`),
  ];
  return lines.join("\n");
}

export default function PlanView({ plan, lang }: PlanViewProps) {
  const t = STRINGS[lang];
  const [copied, setCopied] = useState(false);

  async function copyPlan() {
    const text = planToText(plan, t);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers without Clipboard API (e.g. insecure contexts)
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="print-plan flex flex-col gap-3">
      <div
        className="fade-up flex items-start justify-between gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3.5"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex gap-2.5">
          <Info
            size={18}
            strokeWidth={2.25}
            className="mt-0.5 shrink-0 text-blue-700"
            aria-hidden
          />
          <p className="text-[15px] leading-relaxed text-slate-700">
            {plan.severity_reason}
          </p>
        </div>
        <div className="no-print flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={copyPlan}
            aria-label={t.copyPlan}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            {copied ? (
              <ClipboardCheck
                size={15}
                strokeWidth={2.25}
                className="text-emerald-600"
                aria-hidden
              />
            ) : (
              <ClipboardCopy
                size={15}
                strokeWidth={2.25}
                className="text-slate-500"
                aria-hidden
              />
            )}
            {copied ? t.copied : t.copyPlan}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label={t.printPlan}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <Printer
              size={15}
              strokeWidth={2.25}
              className="text-slate-500"
              aria-hidden
            />
            {t.printPlan}
          </button>
        </div>
      </div>

      <Section
        icon={Siren}
        iconClass="text-red-600"
        title={t.sections.do_now}
        delayIndex={1}
      >
        <List items={plan.do_now} />
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section
          icon={Backpack}
          iconClass="text-blue-700"
          title={t.sections.prepare}
          delayIndex={2}
        >
          <List items={plan.prepare} />
        </Section>

        <Section
          icon={Ban}
          iconClass="text-orange-600"
          title={t.sections.avoid}
          delayIndex={3}
        >
          <List items={plan.avoid} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Section
          icon={ListChecks}
          iconClass="text-blue-700"
          title={t.sections.kit}
          delayIndex={4}
        >
          <Checklist items={plan.kit} />
        </Section>

        <Section
          icon={Phone}
          iconClass="text-blue-700"
          title={t.sections.contacts}
          delayIndex={5}
        >
          <Contacts contacts={plan.contacts} />
        </Section>
      </div>
    </div>
  );
}
