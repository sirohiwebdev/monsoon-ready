import { describe, it, expect, afterEach } from "vitest";
import {
  summarizeHourly,
  geocodePlace,
  reverseGeocode,
  getWeatherSummary,
  WeatherError,
} from "./weather";
import {
  mockFetchOnce,
  mockFetchSequence,
  mockFetchReject,
  restoreFetch,
} from "./test-helpers";

afterEach(() => {
  restoreFetch();
});

describe("summarizeHourly", () => {
  const times = [
    "2026-07-11T14:00",
    "2026-07-11T15:00",
    "2026-07-11T16:00",
    "2026-07-11T17:00",
    "2026-07-11T18:00",
    "2026-07-11T19:00",
    "2026-07-11T20:00",
    "2026-07-11T21:00",
    "2026-07-11T22:00",
    "2026-07-11T23:00",
    "2026-07-12T00:00",
    "2026-07-12T01:00",
    "2026-07-12T02:00",
    "2026-07-12T03:00",
  ];

  it("returns no significant rain when all zeros", () => {
    const precip = new Array(14).fill(0);
    const r = summarizeHourly(times, precip, "2026-07-11T14:00");
    expect(r.peakWindow).toBe("No significant rain expected");
    expect(r.hoursToPeak).toBe(0);
    expect(r.next12hRainMm).toBe(0);
  });

  it("returns no significant rain for very low values", () => {
    const precip = [0.1, 0.1, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = summarizeHourly(times, precip, "2026-07-11T14:00");
    // 0.1 > 0 so it's considered significant rain
    expect(r.next12hRainMm).toBeCloseTo(0.3, 5);
    expect(r.peakWindow).not.toBe("No significant rain expected");
  });

  it("detects single peak hour correctly", () => {
    const precip = [0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = summarizeHourly(times, precip, "2026-07-11T14:00");
    expect(r.next12hRainMm).toBe(5);
    expect(r.hoursToPeak).toBe(2);
    expect(r.peakWindow).toContain("16:00");
  });

  it("detects contiguous hours above threshold as a window", () => {
    const precip = [0, 2, 3, 4, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = summarizeHourly(times, precip, "2026-07-11T14:00");
    expect(r.next12hRainMm).toBe(14);
    expect(r.hoursToPeak).toBe(3);
    // Window is start of first significant hour to the hour after last significant hour
    expect(r.peakWindow).toContain("15:00");
    expect(r.peakWindow).toContain("20:00");
  });

  it("aligns to first slot at/after currentTime when not exact match", () => {
    const precip = [0, 0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = summarizeHourly(times, precip, "2026-07-11T14:30");
    // 14:30 aligns to index 1 (15:00), peak at index 4, so hoursToPeak = 3
    expect(r.hoursToPeak).toBe(3);
    expect(r.next12hRainMm).toBe(10);
  });

  it("respects array bounds when fewer than 12 hours remain", () => {
    const shortTimes = [
      "2026-07-11T20:00",
      "2026-07-11T21:00",
      "2026-07-11T22:00",
    ];
    const precip = [3, 5, 2];
    const r = summarizeHourly(shortTimes, precip, "2026-07-11T20:00");
    expect(r.next12hRainMm).toBe(10);
    expect(r.hoursToPeak).toBe(1);
  });

  it("defaults to startIdx 0 when currentTime not parseable", () => {
    const precip = [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = summarizeHourly(times, precip, "invalid-time");
    expect(r.next12hRainMm).toBe(5);
    expect(r.hoursToPeak).toBe(0);
  });
});

describe("geocodePlace", () => {
  it("returns lat/lon/place/state on a single hit", async () => {
    mockFetchOnce({
      results: [
        {
          latitude: 18.52,
          longitude: 73.85,
          name: "Pune",
          admin1: "Maharashtra",
          country: "India",
        },
      ],
    });
    const loc = await geocodePlace("Pune");
    expect(loc.latitude).toBe(18.52);
    expect(loc.longitude).toBe(73.85);
    expect(loc.state).toBe("Maharashtra");
  });

  it("tries full string then parts for multi-part query", async () => {
    mockFetchSequence([
      { data: { results: [] } },
      {
        data: {
          results: [
            {
              latitude: 18.52,
              longitude: 73.85,
              name: "Pune",
              admin1: "Maharashtra",
            },
          ],
        },
      },
    ]);
    const loc = await geocodePlace("Kothrud, Pune");
    expect(loc.latitude).toBe(18.52);
    expect(loc.place).toBe("Kothrud, Pune");
  });

  it("throws WeatherError when no results found", async () => {
    mockFetchOnce({ results: [] });
    await expect(geocodePlace("Nonexistent")).rejects.toThrow(WeatherError);
  });

  it("throws WeatherError when results is undefined", async () => {
    mockFetchOnce({});
    await expect(geocodePlace("Unknown")).rejects.toThrow(WeatherError);
  });

  it("throws WeatherError on network failure", async () => {
    mockFetchReject(new Error("network error"));
    await expect(geocodePlace("Pune")).rejects.toThrow(WeatherError);
  });
});

describe("reverseGeocode", () => {
  it("returns place and state on success", async () => {
    mockFetchOnce({
      city: "Pune",
      principalSubdivision: "Maharashtra",
      countryName: "India",
    });
    const r = await reverseGeocode(18.52, 73.85);
    expect(r.place).toContain("Pune");
    expect(r.place).toContain("Maharashtra");
    expect(r.state).toBe("Maharashtra");
  });

  it("falls back to coordinate label on failure", async () => {
    mockFetchReject(new Error("network error"));
    const r = await reverseGeocode(18.52, 73.85);
    expect(r.place).toContain("18.52");
    expect(r.place).toContain("73.85");
    expect(r.state).toBeNull();
  });

  it("uses locality when city is absent", async () => {
    mockFetchOnce({
      locality: "Kothrud",
      principalSubdivision: "Maharashtra",
    });
    const r = await reverseGeocode(18.52, 73.85);
    expect(r.place).toContain("Kothrud");
  });
});

describe("getWeatherSummary", () => {
  const validForecast = {
    current: {
      time: "2026-07-11T14:00",
      temperature_2m: 28.56,
      precipitation: 2.34,
      weather_code: 63,
      wind_speed_10m: 15.3,
    },
    hourly: {
      time: [
        "2026-07-11T14:00",
        "2026-07-11T15:00",
        "2026-07-11T16:00",
        "2026-07-11T17:00",
        "2026-07-11T18:00",
        "2026-07-11T19:00",
        "2026-07-11T20:00",
        "2026-07-11T21:00",
        "2026-07-11T22:00",
        "2026-07-11T23:00",
        "2026-07-12T00:00",
        "2026-07-12T01:00",
        "2026-07-12T02:00",
        "2026-07-12T03:00",
      ],
      precipitation: [0, 2, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      precipitation_probability: [0, 50, 80, 60, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  };

  it("returns correct WeatherSummary shape with rounded values", async () => {
    mockFetchOnce(validForecast);
    const summary = await getWeatherSummary(
      18.52,
      73.85,
      "Pune",
      "Maharashtra",
    );
    expect(summary.place).toBe("Pune");
    expect(summary.state).toBe("Maharashtra");
    expect(summary.latitude).toBe(18.52);
    expect(summary.longitude).toBe(73.85);
    expect(summary.tempC).toBe(28.6);
    expect(summary.currentRainMm).toBe(2.3);
    expect(summary.windKmh).toBe(15.3);
    expect(summary.next12hRainMm).toBe(11);
    // precip [0, 2, 5, 3, 1, 0, ...] → peak at idx 2, threshold 1.5
    // run: idx 1–3, window = 15:00–18:00
    expect(summary.peakWindow).toContain("15:00");
    expect(summary.peakWindow).toContain("18:00");
    expect(summary.hoursToPeak).toBe(2);
  });

  it("throws WeatherError when current is missing", async () => {
    mockFetchOnce({ hourly: { time: [], precipitation: [] } });
    await expect(
      getWeatherSummary(18.52, 73.85, "Pune", "Maharashtra"),
    ).rejects.toThrow(WeatherError);
  });

  it("throws WeatherError when hourly is empty", async () => {
    mockFetchOnce({
      current: {
        time: "2026-07-11T14:00",
        temperature_2m: 28,
        precipitation: 0,
        weather_code: 0,
        wind_speed_10m: 10,
      },
      hourly: { time: [], precipitation: [] },
    });
    await expect(
      getWeatherSummary(18.52, 73.85, "Pune", "Maharashtra"),
    ).rejects.toThrow(WeatherError);
  });

  it("throws WeatherError on network failure", async () => {
    mockFetchReject(new Error("network error"));
    await expect(
      getWeatherSummary(18.52, 73.85, "Pune", "Maharashtra"),
    ).rejects.toThrow(WeatherError);
  });
});
