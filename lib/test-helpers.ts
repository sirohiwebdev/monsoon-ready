import { vi, afterEach } from "vitest";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

export function mockFetchOnce(
  data: unknown,
  ok = true,
  status = ok ? 200 : 500,
): typeof fetch {
  const mock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
  }) as unknown as typeof fetch;
  globalThis.fetch = mock;
  return mock;
}

export function mockFetchSequence(
  responses: Array<{ data: unknown; ok?: boolean; status?: number }>,
): typeof fetch {
  const mocks = responses.map(
    (r) =>
      ({
        ok: r.ok ?? true,
        status: r.status ?? (r.ok === false ? 500 : 200),
        json: () => Promise.resolve(r.data),
        text: () =>
          Promise.resolve(
            typeof r.data === "string" ? r.data : JSON.stringify(r.data),
          ),
      }) as Response,
  );
  let callIdx = 0;
  const mock = vi.fn().mockImplementation(() => {
    const res = mocks[callIdx] ?? mocks[mocks.length - 1];
    callIdx++;
    return Promise.resolve(res);
  }) as unknown as typeof fetch;
  globalThis.fetch = mock;
  return mock;
}

export function mockFetchReject(error: Error): typeof fetch {
  const mock = vi.fn().mockRejectedValue(error) as unknown as typeof fetch;
  globalThis.fetch = mock;
  return mock;
}

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}
