import { describe, it, expect, afterEach, vi } from "vitest";
import {
  fetchWeatherByPlace,
  fetchWeatherByCoords,
  fetchPlan,
  fetchAdvisories,
  fetchChatAnswer,
} from "./client";
import type { Lang, Plan, Profile, WeatherSummary } from "./types";
import { mockFetchOnce, restoreFetch } from "./test-helpers";

afterEach(() => {
  restoreFetch();
});

const weather: WeatherSummary = {
  place: "Pune, Maharashtra",
  state: "Maharashtra",
  latitude: 18.52,
  longitude: 73.85,
  tempC: 28.5,
  currentRainMm: 2.3,
  windKmh: 15,
  next12hRainMm: 45,
  peakWindow: "20:00–02:00",
  hoursToPeak: 3,
};

const profile: Profile = {
  householdSize: 4,
  floor: "ground",
  hasKids: true,
  hasElderly: false,
  hasVehicle: true,
  hasPets: false,
};

const validPlan: Plan = {
  headline: "Heavy rain expected",
  severity_reason: "45mm in 12h",
  do_now: ["Move valuables up"],
  prepare: ["Charge phones"],
  avoid: ["Avoid riverside roads"],
  kit: ["Water bottles"],
  contacts: [{ label: "Police", number: "100" }],
};

describe("fetchWeatherByPlace", () => {
  it("returns parsed WeatherSummary on 200", async () => {
    mockFetchOnce(weather);
    const result = await fetchWeatherByPlace("Pune");
    expect(result).toEqual(weather);
  });

  it("throws with server error message on non-OK", async () => {
    mockFetchOnce({ error: "Area not found" }, false, 400);
    await expect(fetchWeatherByPlace("Unknown")).rejects.toThrow(
      "Area not found",
    );
  });

  it("throws with fallback message when body is unparseable", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
      text: () => Promise.resolve("not json"),
    }) as unknown as typeof fetch;
    await expect(fetchWeatherByPlace("Unknown")).rejects.toThrow(
      "Couldn't fetch the weather.",
    );
  });
});

describe("fetchWeatherByCoords", () => {
  it("returns parsed WeatherSummary on 200", async () => {
    mockFetchOnce(weather);
    const result = await fetchWeatherByCoords(18.52, 73.85);
    expect(result).toEqual(weather);
  });

  it("throws on non-OK response", async () => {
    mockFetchOnce({ error: "Bad coords" }, false, 400);
    await expect(fetchWeatherByCoords(0, 0)).rejects.toThrow("Bad coords");
  });
});

describe("fetchPlan", () => {
  it("returns parsed Plan on 200", async () => {
    mockFetchOnce(validPlan);
    const result = await fetchPlan(profile, weather, "en" as Lang);
    expect(result).toEqual(validPlan);
  });

  it("throws on non-OK response", async () => {
    mockFetchOnce({ error: "Missing API key" }, false, 503);
    await expect(fetchPlan(profile, weather, "en" as Lang)).rejects.toThrow(
      "Missing API key",
    );
  });
});

describe("fetchAdvisories (client)", () => {
  it("returns advisory array on 200", async () => {
    mockFetchOnce({ advisories: [] });
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual([]);
  });

  it("returns advisories from response", async () => {
    const advisories = [
      {
        id: "1",
        severityColor: "red" as const,
        disasterType: "Flood",
        areaDescription: "Maharashtra",
        message: "Flood warning",
        source: "IMD",
        effectiveEnd: "2026-07-11T18:29:00.000Z",
      },
    ];
    mockFetchOnce({ advisories });
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual(advisories);
  });

  it("returns [] on non-OK (never throws)", async () => {
    mockFetchOnce({ error: "Server error" }, false, 500);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual([]);
  });
});

describe("fetchChatAnswer", () => {
  it("returns answer string on 200", async () => {
    mockFetchOnce({ answer: "Stay indoors and avoid low-lying areas." });
    const result = await fetchChatAnswer(
      "What to do?",
      profile,
      weather,
      "en" as Lang,
    );
    expect(result).toBe("Stay indoors and avoid low-lying areas.");
  });

  it("throws on non-OK response", async () => {
    mockFetchOnce({ error: "Rate limited" }, false, 429);
    await expect(
      fetchChatAnswer("test", profile, weather, "en" as Lang),
    ).rejects.toThrow("Rate limited");
  });
});
