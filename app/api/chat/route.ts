import { NextResponse } from "next/server";
import { z } from "zod";
import { getClient, MissingKeyError, MODEL } from "@/lib/llm";
import { buildChatContext, buildChatMessages } from "@/lib/prompts";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500),
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
  lang: z.enum(["en", "hi", "mr"]),
});

// POST /api/chat  { question, profile, weather, lang } -> { answer: string }
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
      { error: "Please type a question." },
      { status: 400 },
    );
  }
  const { question, profile, weather, lang } = parsed.data;

  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  try {
    const context = buildChatContext(profile, weather);
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 300,
      messages: buildChatMessages(question, context, lang),
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json(
        { error: "No answer came back. Try rephrasing." },
        { status: 502 },
      );
    }

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof Error && "status" in err) {
      const status = (err as { status: number }).status;
      if (status === 404) {
        console.error("[/api/chat] model not found:", MODEL);
        return NextResponse.json(
          { error: "The AI model is unavailable. Please contact support." },
          { status: 502 },
        );
      }
      if (status === 429) {
        console.error("[/api/chat] OpenAI rate limit hit");
        return NextResponse.json(
          { error: "The AI service is busy. Please try again in a moment." },
          { status: 503 },
        );
      }
    }
    console.error("[/api/chat] unexpected error:", err);
    return NextResponse.json(
      { error: "Couldn't answer right now. Please try again." },
      { status: 500 },
    );
  }
}
