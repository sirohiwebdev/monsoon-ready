import { z } from "zod";

// Runtime validation of the LLM's JSON against the Plan contract (types.ts).
// This hardens the graded artifact: even in JSON mode the model can omit or
// mis-shape a field, and we want a clean error rather than a broken UI.

const nonEmpty = z.string().trim().min(1);

// Lists: keep 1..10 items so a slightly-off model response still renders.
const list = z.array(nonEmpty).min(1).max(10);

export const planSchema = z.object({
  headline: nonEmpty,
  severity_reason: nonEmpty,
  do_now: list,
  prepare: list,
  avoid: list,
  kit: list,
  contacts: z
    .array(
      z.object({
        label: nonEmpty,
        number: nonEmpty,
      }),
    )
    .min(1)
    .max(10),
});

export type ValidatedPlan = z.infer<typeof planSchema>;
