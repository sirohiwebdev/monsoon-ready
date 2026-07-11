import { describe, it, expect } from "vitest";
import { STRINGS, type UIStrings } from "./i18n";
import type { Lang } from "./types";

const langs: Lang[] = ["en", "hi", "mr"];

const stringKeys: (keyof UIStrings)[] = [
  "tagline",
  "useLocation",
  "locating",
  "areaPlaceholder",
  "household",
  "floorLabel",
  "inHome",
  "groundFloor",
  "upperFloor",
  "kids",
  "elderly",
  "vehicle",
  "pets",
  "language",
  "cta",
  "regenerate",
  "adjustTitle",
  "initialTitle",
  "newPlan",
  "peakLabel",
  "chatTitle",
  "chatPlaceholder",
  "chatSend",
  "chatThinking",
  "needLocation",
  "checkArea",
  "changeLocation",
  "updated",
  "refresh",
  "emergencyTitle",
  "advisoryTitle",
  "activeUntil",
  "sourceLabel",
  "noAdvisories",
  "emptyPlanPrompt",
];

const sectionKeys = ["do_now", "prepare", "avoid", "kit", "contacts"] as const;
const severityLevels = ["low", "moderate", "high", "severe"] as const;

describe("STRINGS completeness", () => {
  for (const lang of langs) {
    describe(`language: ${lang}`, () => {
      it("has all string keys", () => {
        for (const key of stringKeys) {
          expect(STRINGS[lang][key], `missing key: ${key}`).toBeDefined();
          expect(typeof STRINGS[lang][key]).toBe("string");
        }
      });

      it("has people() function with singular and plural", () => {
        const fn = STRINGS[lang].people;
        expect(typeof fn).toBe("function");
        const singular = fn(1);
        const plural = fn(5);
        expect(typeof singular).toBe("string");
        expect(singular.length).toBeGreaterThan(0);
        expect(typeof plural).toBe("string");
        expect(plural.length).toBeGreaterThan(0);
      });

      it("loading() returns array of 3 strings", () => {
        const arr = STRINGS[lang].loading("TestPlace");
        expect(Array.isArray(arr)).toBe(true);
        expect(arr).toHaveLength(3);
        for (const s of arr) {
          expect(typeof s).toBe("string");
          expect(s.length).toBeGreaterThan(0);
        }
      });

      it("sections has all 5 keys", () => {
        for (const key of sectionKeys) {
          expect(STRINGS[lang].sections[key], `missing section: ${key}`).toBeDefined();
          expect(typeof STRINGS[lang].sections[key]).toBe("string");
        }
      });

      it("severityLabel has all 4 severity levels", () => {
        for (const level of severityLevels) {
          expect(STRINGS[lang].severityLabel[level], `missing severity: ${level}`).toBeDefined();
          expect(typeof STRINGS[lang].severityLabel[level]).toBe("string");
        }
      });

      it("moreNumbers() returns a string", () => {
        const s = STRINGS[lang].moreNumbers(3);
        expect(typeof s).toBe("string");
        expect(s.length).toBeGreaterThan(0);
      });
    });
  }
});

describe("people() pluralization", () => {
  it("en: singular is 'person', plural is 'people'", () => {
    expect(STRINGS.en.people(1)).toBe("person");
    expect(STRINGS.en.people(2)).toBe("people");
  });

  it("hi: singular and plural differ", () => {
    expect(STRINGS.hi.people(1)).toBe("व्यक्ति");
    expect(STRINGS.hi.people(2)).toBe("लोग");
  });

  it("mr: singular and plural differ", () => {
    expect(STRINGS.mr.people(1)).toBe("व्यक्ती");
    expect(STRINGS.mr.people(2)).toBe("माणसे");
  });
});
