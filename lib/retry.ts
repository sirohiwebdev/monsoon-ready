/**
 * Retry an async operation with exponential backoff.
 * Only retries on transient failures (network errors, 429, 5xx).
 * Returns the result on success or throws the last error after max attempts.
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Called on each retry with attempt number and the error. */
  onRetry?: (attempt: number, error: unknown) => void;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    // OpenAI SDK errors carry a `status` property
    const status = (err as { status?: number }).status;
    if (status === 429 || (status !== undefined && status >= 500)) return true;
    // Network / timeout errors (TypeError: fetch failed, AbortError)
    if (err.name === "TypeError" || err.name === "AbortError") return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 4000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts || !isRetryableError(err)) throw err;

      const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.random() * backoff * 0.1;
      opts.onRetry?.(attempt, err);
      await delay(backoff + jitter);
    }
  }

  throw lastError;
}
