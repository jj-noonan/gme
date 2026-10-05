import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientError, fetchStatusApi } from "./statusApi.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchStatusApi", () => {
  it("retries through a cold start: a refused connection, then a 503", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ trips: { a: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = fetchStatusApi<{ trips: Record<string, number> }>("/transit?legs=a");
    await vi.runAllTimersAsync();
    expect(await result).toEqual({ trips: { a: 1 } });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after a few tries", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const result = fetchStatusApi("/drive?legs=a");
    const settled = expect(result).rejects.toThrow("Failed to fetch");
    await vi.runAllTimersAsync();
    await settled;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("doesn't retry a 4xx", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await fetchStatusApi("/geocode?q=x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ClientError);
    expect((error as ClientError).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
