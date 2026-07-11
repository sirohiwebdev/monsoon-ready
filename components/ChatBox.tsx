"use client";

import { useRef, useState } from "react";
import { MessageCircle, SendHorizontal } from "lucide-react";
import type { ChatMessage, Lang, Profile, WeatherSummary } from "@/lib/types";
import { STRINGS } from "@/lib/i18n";
import { fetchChatAnswer } from "@/lib/client";

interface ChatBoxProps {
  lang: Lang;
  profile: Profile;
  weather: WeatherSummary;
}

export default function ChatBox({ lang, profile, weather }: ChatBoxProps) {
  const t = STRINGS[lang];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const question = input.trim();
    if (!question || busy) return;

    setError(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: question },
    ]);
    setBusy(true);

    try {
      const answer = await fetchChatAnswer(question, profile, weather, lang);
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: answer },
      ]);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <MessageCircle
          size={18}
          strokeWidth={2.25}
          className="text-blue-700"
          aria-hidden
        />
        {t.chatTitle}
      </h2>

      {messages.length > 0 && (
        <div
          ref={scrollRef}
          className="mb-3 flex max-h-64 flex-col gap-2 overflow-y-auto"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "self-end bg-blue-700 text-white"
                  : "self-start bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="self-start rounded-2xl bg-slate-100 px-3.5 py-2 text-[15px] text-slate-500">
              {t.chatThinking}
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder={t.chatPlaceholder}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          aria-label={t.chatSend}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-3.5 font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-40"
        >
          <SendHorizontal size={18} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
