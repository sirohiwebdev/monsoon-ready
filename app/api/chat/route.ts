import { NextResponse } from "next/server";
import { z } from "zod";
import { getClient, MissingKeyError, MODEL } from "@/lib/llm";
import { buildChatMessages } from "@/lib/prompts";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(500),
  context: z.string().max(2000),
  lang: z.enum(["en", "hi", "mr"]),
});

// POST /api/chat  { question, context, lang } -> { answer: string }
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  }
  const { question, context, lang } = parsed.data;

  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 300,
      messages: buildChatMessages(question, context, lang),
    });

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: "No answer came back. Try rephrasing." }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof MissingKeyError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error("[/api/chat] unexpected error:", err);
    return NextResponse.json(
      { error: "Couldn't answer right now. Please try again." },
      { status: 500 },
    );
  }
}
