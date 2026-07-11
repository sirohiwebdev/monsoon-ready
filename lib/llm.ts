import OpenAI from "openai";

// Model kept in one place so it can be swapped without touching prompt logic.
// gpt-4o-mini per spec §3; override with OPENAI_MODEL if a newer fast mini model exists.
export const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export class MissingKeyError extends Error {
  constructor() {
    super(
      "The AI service isn't configured yet. Add OPENAI_API_KEY to run plans.",
    );
    this.name = "MissingKeyError";
  }
}

/**
 * Returns a server-side OpenAI client. Throws MissingKeyError (friendly, user-facing)
 * when the key is absent so routes can return a clean message instead of a 500 stack.
 * The key never leaves the server.
 */
let _client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new MissingKeyError();
  _client = new OpenAI({ apiKey });
  return _client;
}
