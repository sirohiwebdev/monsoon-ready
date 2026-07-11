import { describe, it, expect, afterEach } from "vitest";
import { fetchAdvisories } from "./advisory";
import { mockFetchOnce, mockFetchReject, restoreFetch } from "./test-helpers";

afterEach(() => {
  restoreFetch();
});

function makeAlert(overrides: Record<string, unknown> = {}) {
  return {
    identifier: "123",
    severity_color: "orange",
    disaster_type: "Heavy Rain",
    area_description: "Maharashtra",
    warning_message: "Heavy rainfall expected",
    alert_source: "IMD",
    effective_start_time: "Sat Jul 11 12:00:00 IST 2026",
    effective_end_time: "Sat Jul 11 23:59:00 IST 2026",
    actual_lang: "en",
    ...overrides,
  };
}

describe("fetchAdvisories", () => {
  it("returns filtered and sorted advisories for matching state", async () => {
    mockFetchOnce([
      makeAlert({ identifier: 1, severity_color: "yellow" }),
      makeAlert({ identifier: 2, severity_color: "red" }),
      makeAlert({ identifier: 3, severity_color: "orange" }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(3);
    expect(result[0].severityColor).toBe("red");
    expect(result[1].severityColor).toBe("orange");
    expect(result[2].severityColor).toBe("yellow");
  });

  it("caps results at 5", async () => {
    const alerts = Array.from({ length: 7 }, (_, i) =>
      makeAlert({ identifier: i, severity_color: "yellow" }),
    );
    mockFetchOnce(alerts);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(5);
  });

  it("excludes non-English alerts", async () => {
    mockFetchOnce([
      makeAlert({ identifier: 1, actual_lang: "hi" }),
      makeAlert({ identifier: 2, actual_lang: "en" }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("excludes expired alerts", async () => {
    mockFetchOnce([
      makeAlert({
        identifier: 1,
        effective_end_time: "Sat Jul 11 00:00:00 IST 2020",
      }),
      makeAlert({ identifier: 2 }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("excludes alerts not matching the state", async () => {
    mockFetchOnce([
      makeAlert({ identifier: 1, area_description: "Karnataka" }),
      makeAlert({ identifier: 2, area_description: "Maharashtra" }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("returns [] on network failure", async () => {
    mockFetchReject(new Error("network error"));
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual([]);
  });

  it("returns [] on non-OK response", async () => {
    mockFetchOnce([], false, 500);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual([]);
  });

  it("returns [] on bad JSON / schema mismatch", async () => {
    mockFetchOnce({ not: "an array" });
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toEqual([]);
  });

  it("defaults unknown severity color to yellow", async () => {
    mockFetchOnce([
      makeAlert({ identifier: 1, severity_color: "purple" }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(1);
    expect(result[0].severityColor).toBe("yellow");
  });

  it("defaults missing severity_color to yellow", async () => {
    mockFetchOnce([
      makeAlert({ identifier: 1, severity_color: undefined }),
    ]);
    const result = await fetchAdvisories("Maharashtra");
    expect(result).toHaveLength(1);
    expect(result[0].severityColor).toBe("yellow");
  });

  it("maps advisory fields correctly", async () => {
    mockFetchOnce([makeAlert()]);
    const [adv] = await fetchAdvisories("Maharashtra");
    expect(adv.id).toBe("123");
    expect(adv.disasterType).toBe("Heavy Rain");
    expect(adv.areaDescription).toBe("Maharashtra");
    expect(adv.message).toBe("Heavy rainfall expected");
    expect(adv.source).toBe("IMD");
    expect(adv.effectiveEnd).not.toBeNull();
  });
});
