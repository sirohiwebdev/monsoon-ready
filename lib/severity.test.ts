import { describe, it, expect } from "vitest";
import { severityFromRain } from "./severity";

describe("severityFromRain", () => {
  describe("threshold boundaries", () => {
    it("returns low for 0 mm", () => {
      const r = severityFromRain(0);
      expect(r.level).toBe("low");
      expect(r.label).toBe("Low risk");
      expect(r.bgClass).toBe("bg-emerald-600");
      expect(r.textClass).toBe("text-white");
      expect(r.pulse).toBe(false);
    });

    it("returns low for 9.9 mm (just below moderate)", () => {
      expect(severityFromRain(9.9).level).toBe("low");
    });

    it("returns moderate for 10 mm (exact boundary)", () => {
      const r = severityFromRain(10);
      expect(r.level).toBe("moderate");
      expect(r.label).toBe("Moderate risk");
      expect(r.bgClass).toBe("bg-amber-500");
      expect(r.textClass).toBe("text-slate-900");
      expect(r.pulse).toBe(false);
    });

    it("returns moderate for 34.9 mm", () => {
      expect(severityFromRain(34.9).level).toBe("moderate");
    });

    it("returns high for 35 mm (exact boundary)", () => {
      const r = severityFromRain(35);
      expect(r.level).toBe("high");
      expect(r.label).toBe("High risk");
      expect(r.bgClass).toBe("bg-orange-600");
      expect(r.textClass).toBe("text-white");
      expect(r.pulse).toBe(false);
    });

    it("returns high for 69.9 mm", () => {
      expect(severityFromRain(69.9).level).toBe("high");
    });

    it("returns severe for 70 mm (exact boundary)", () => {
      const r = severityFromRain(70);
      expect(r.level).toBe("severe");
      expect(r.label).toBe("Severe risk");
      expect(r.bgClass).toBe("bg-red-600");
      expect(r.textClass).toBe("text-white");
      expect(r.pulse).toBe(true);
    });

    it("returns severe for 100 mm", () => {
      expect(severityFromRain(100).level).toBe("severe");
    });
  });

  describe("invalid inputs default to low", () => {
    it("NaN defaults to low", () => {
      expect(severityFromRain(NaN).level).toBe("low");
    });

    it("Infinity defaults to low", () => {
      expect(severityFromRain(Infinity).level).toBe("low");
    });

    it("-Infinity defaults to low", () => {
      expect(severityFromRain(-Infinity).level).toBe("low");
    });

    it("negative number defaults to low (mm < 10)", () => {
      expect(severityFromRain(-5).level).toBe("low");
    });
  });

  describe("pulse property", () => {
    it("pulse is false for low", () => {
      expect(severityFromRain(0).pulse).toBe(false);
    });

    it("pulse is false for moderate", () => {
      expect(severityFromRain(20).pulse).toBe(false);
    });

    it("pulse is false for high", () => {
      expect(severityFromRain(50).pulse).toBe(false);
    });

    it("pulse is true only for severe", () => {
      expect(severityFromRain(70).pulse).toBe(true);
      expect(severityFromRain(200).pulse).toBe(true);
    });
  });
});
