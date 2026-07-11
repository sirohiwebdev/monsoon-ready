"use client";

import { useEffect, useState } from "react";
import { CloudRain } from "lucide-react";

interface LoaderProps {
  /** Rotating status lines; each shows for ~1.6s. */
  messages: string[];
}

export default function Loader({ messages }: LoaderProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIdx((i) => Math.min(i + 1, messages.length - 1));
    }, 1600);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-24"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <CloudRain size={26} strokeWidth={2} aria-hidden />
      </span>
      <div className="h-1 w-56 overflow-hidden rounded-full bg-slate-200">
        <div className="bar-indeterminate h-full w-2/5 rounded-full bg-blue-600" />
      </div>
      <p className="text-center text-[15px] font-medium text-slate-600">{messages[idx]}</p>
    </div>
  );
}
