import { describe, it, expect } from "vitest";
import { getContactsFor, NATIONAL_CONTACTS } from "./emergency-contacts";

describe("getContactsFor", () => {
  it("always returns national contacts", () => {
    const { national } = getContactsFor("Unknown Place", null);
    expect(national).toEqual(NATIONAL_CONTACTS);
    expect(national.length).toBeGreaterThan(0);
  });

  it("includes state control room for Maharashtra", () => {
    const { local } = getContactsFor("Some City", "Maharashtra");
    expect(local).toContainEqual({
      label: "State Disaster Mgmt Control Room",
      number: "1077",
    });
  });

  it("includes city contacts for Mumbai", () => {
    const { local } = getContactsFor("Mumbai", "Maharashtra");
    expect(local).toContainEqual({
      label: "BMC Disaster Control Room",
      number: "1916",
    });
  });

  it("includes Pune city contact (deduped with state since both use 1077)", () => {
    const { local } = getContactsFor("Pune", "Maharashtra");
    // Both state and Pune city use "1077", so dedup keeps only the first (state)
    const numbers = local.map((c) => c.number);
    expect(numbers).toContain("1077");
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("returns only national contacts for unknown place and state", () => {
    const { national, local } = getContactsFor("Nowhere", "Unknown State");
    expect(local).toEqual([]);
    expect(national).toEqual(NATIONAL_CONTACTS);
  });

  it("deduplicates contacts with the same number", () => {
    const { local } = getContactsFor("Pune", "Maharashtra");
    const numbers = local.map((c) => c.number);
    const unique = new Set(numbers);
    expect(numbers.length).toBe(unique.size);
  });

  it("matches city case-insensitively", () => {
    const { local: lower } = getContactsFor("mumbai", "Maharashtra");
    const { local: upper } = getContactsFor("MUMBAI", "Maharashtra");
    const { local: mixed } = getContactsFor("MuMbAi", "Maharashtra");
    expect(lower).toContainEqual({
      label: "BMC Disaster Control Room",
      number: "1916",
    });
    expect(upper).toContainEqual({
      label: "BMC Disaster Control Room",
      number: "1916",
    });
    expect(mixed).toContainEqual({
      label: "BMC Disaster Control Room",
      number: "1916",
    });
  });

  it("matches city as substring of a longer place name", () => {
    const { local } = getContactsFor("Kothrud, Pune", "Maharashtra");
    expect(local.some((c) => c.number === "1077")).toBe(true);
  });
});
