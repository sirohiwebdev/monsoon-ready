"use client";

import { useEffect } from "react";
import { createLogger } from "@/lib/logger";

const log = createLogger("error-boundary");

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    log.error("unhandled error", {
      error: String(error),
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          An unexpected error occurred. Try reloading — your location and plan
          will be lost, but emergency contacts are always available.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-700 px-5 font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
