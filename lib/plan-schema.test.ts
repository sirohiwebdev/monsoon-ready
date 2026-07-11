import { describe, it, expect } from "vitest";
import { planSchema } from "./plan-schema";

const validPlan = {
  headline: "Heavy rain expected in Pune",
  severity_reason: "45mm rain in 12 hours with ground floor exposure",
  do_now: ["Move valuables to upper floor"],
  prepare: ["Charge phones and power banks"],
  avoid: ["Avoid riverside roads"],
  kit: ["Water bottles", "First aid kit"],
  contacts: [{ label: "Police", number: "100" }],
};

describe("planSchema", () => {
  it("passes for a valid plan", () => {
    const result = planSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("fails when a required field is missing", () => {
    const missingHeadline = { ...validPlan, headline: undefined };
    expect(planSchema.safeParse(missingHeadline).success).toBe(false);
  });

  it("fails when a list is empty (min 1)", () => {
    expect(planSchema.safeParse({ ...validPlan, do_now: [] }).success).toBe(
      false,
    );
  });

  it("fails when a list has more than 10 items (max 10)", () => {
    const eleven = Array(11).fill("item");
    expect(planSchema.safeParse({ ...validPlan, do_now: eleven }).success).toBe(
      false,
    );
  });

  it("fails when a list item is an empty string", () => {
    expect(planSchema.safeParse({ ...validPlan, do_now: [""] }).success).toBe(
      false,
    );
  });

  it("fails when contacts array is empty", () => {
    expect(planSchema.safeParse({ ...validPlan, contacts: [] }).success).toBe(
      false,
    );
  });

  it("fails when a contact has empty label", () => {
    expect(
      planSchema.safeParse({
        ...validPlan,
        contacts: [{ label: "", number: "100" }],
      }).success,
    ).toBe(false);
  });

  it("fails when a contact has empty number", () => {
    expect(
      planSchema.safeParse({
        ...validPlan,
        contacts: [{ label: "Police", number: "" }],
      }).success,
    ).toBe(false);
  });

  it("fails when headline is empty string", () => {
    expect(planSchema.safeParse({ ...validPlan, headline: "  " }).success).toBe(
      false,
    );
  });

  it("passes with maximum allowed items (10) in lists", () => {
    const ten = Array(10).fill("item");
    expect(
      planSchema.safeParse({
        ...validPlan,
        do_now: ten,
        prepare: ten,
        avoid: ten,
        kit: ten,
      }).success,
    ).toBe(true);
  });
});
