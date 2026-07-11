import { describe, it, expect } from "vitest";
import {
  buildPlanMessages,
  buildChatMessages,
  buildChatContext,
} from "./prompts";
import type { Profile, WeatherSummary } from "./types";

const profile: Profile = {
  householdSize: 4,
  floor: "ground",
  hasKids: true,
  hasElderly: false,
  hasVehicle: true,
  hasPets: false,
};

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

describe("buildPlanMessages", () => {
  it("returns two messages with system and user roles", () => {
    const msgs = buildPlanMessages(profile, weather, "en");
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("system content includes safety instructions", () => {
    const msgs = buildPlanMessages(profile, weather, "en");
    const sys = msgs[0].content as string;
    expect(sys).toContain("emergency-preparedness");
    expect(sys).toContain("JSON");
  });

  it("user content includes weather numbers", () => {
    const msgs = buildPlanMessages(profile, weather, "en");
    const user = msgs[1].content as string;
    expect(user).toContain("28.5");
    expect(user).toContain("45");
    expect(user).toContain("15");
    expect(user).toContain("Pune, Maharashtra");
  });

  it("user content includes profile data", () => {
    const msgs = buildPlanMessages(profile, weather, "en");
    const user = msgs[1].content as string;
    expect(user).toContain("4");
    expect(user).toContain("ground");
    expect(user).toContain("kids: true");
    expect(user).toContain("elderly: false");
  });

  it("user content includes language name", () => {
    const msgs = buildPlanMessages(profile, weather, "hi");
    const user = msgs[1].content as string;
    expect(user).toContain("हिन्दी");
  });
});

describe("buildChatMessages", () => {
  it("returns two messages with system and user roles", () => {
    const msgs = buildChatMessages("Is it safe?", "some context", "en");
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("system content includes language name", () => {
    const msgs = buildChatMessages("test", "ctx", "mr");
    const sys = msgs[0].content as string;
    expect(sys).toContain("मराठी");
  });

  it("user content includes context and question", () => {
    const msgs = buildChatMessages("What should I do?", "Place: Pune", "en");
    const user = msgs[1].content as string;
    expect(user).toContain("SITUATION CONTEXT:");
    expect(user).toContain("Place: Pune");
    expect(user).toContain("QUESTION:");
    expect(user).toContain("What should I do?");
  });
});

describe("buildChatContext", () => {
  it("returns a compact string with place, temp, rain, wind", () => {
    const ctx = buildChatContext(profile, weather);
    expect(ctx).toContain("Place: Pune, Maharashtra");
    expect(ctx).toContain("28.5");
    expect(ctx).toContain("2.3");
    expect(ctx).toContain("15");
  });

  it("includes next 12h rain and peak window", () => {
    const ctx = buildChatContext(profile, weather);
    expect(ctx).toContain("45");
    expect(ctx).toContain("20:00–02:00");
    expect(ctx).toContain("3");
  });

  it("includes household fields", () => {
    const ctx = buildChatContext(profile, weather);
    expect(ctx).toContain("4 people");
    expect(ctx).toContain("ground");
    expect(ctx).toContain("kids=true");
    expect(ctx).toContain("elderly=false");
    expect(ctx).toContain("vehicle=true");
    expect(ctx).toContain("pets=false");
  });
});
