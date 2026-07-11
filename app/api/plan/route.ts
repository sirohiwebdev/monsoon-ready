import { NextResponse } from "next/server";
import { z } from "zod";
import { getClient, MissingKeyError, MODEL } from "@/lib/llm";
import { buildPlanMessages } from "@/lib/prompts";
import { planSchema } from "@/lib/plan-schema";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("/api/plan");

// Validate the client request so a bad body fails fast with a clear message.
const requestSchema = z.object({
  lang: z.enum(["en", "hi", "mr"]),
  profile: z.object({
    householdSize: z.number().int().positive().max(50),
    floor: z.enum(["ground", "upper"]),
    hasKids: z.boolean(),
    hasElderly: z.boolean(),
    hasVehicle: z.boolean(),
    hasPets: z.boolean(),
  }),
  weather: z.object({
    place: z.string().trim().min(1).max(200),
    state: z.string().nullable(),
    latitude: z.number(),
    longitude: z.number(),
    tempC: z.number(),
    currentRainMm: z.number(),
    windKmh: z.number(),
    next12hRainMm: z.number(),
    peakWindow: z.string(),
    hoursToPeak: z.number(),
  }),
});

// POST /api/plan  { profile, weather, lang } -> Plan (JSON)
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid plan inputs." },
      { status: 400 },
    );
  }
  const { profile, weather, lang } = parsed.data;

  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      // JSON mode — the model must return a single JSON object.
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1200,
      messages: buildPlanMessages(profile, weather, lang),
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "The AI returned an empty plan. Try again." },
        { status: 502 },
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "The AI returned malformed JSON. Try again." },
        { status: 502 },
      );
    }

    const plan = planSchema.safeParse(json);
    if (!plan.success) {
      log.error("plan failed schema validation", { issues: plan.error.issues });
      return NextResponse.json(
        { error: "The AI plan was incomplete. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json(plan.data);
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof Error && "status" in err) {
      const status = (err as { status: number }).status;
      if (status === 404) {
        log.error("model not found", { model: MODEL });
        return NextResponse.json(
          { error: "The AI model is unavailable. Please contact support." },
          { status: 502 },
        );
      }
      if (status === 429) {
        log.warn("OpenAI rate limit hit");
        return NextResponse.json(
          { error: "The AI service is busy. Please try again in a moment." },
          { status: 503 },
        );
      }
    }
    log.error("unexpected error", { error: String(err) });
    return NextResponse.json(
      { error: "Couldn't generate your plan right now. Please try again." },
      { status: 500 },
    );
  }
}
