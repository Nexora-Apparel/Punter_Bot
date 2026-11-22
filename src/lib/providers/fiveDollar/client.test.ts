import { afterEach, describe, expect, it, vi } from "vitest";
import { FiveDollarApiError, FiveDollarClient } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("5DollarFootballAPI client", () => {
  it("sends the API key as a Bearer token and reads rate-limit headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: 1, data: { plan: "community" } }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "x-ratelimit-limit": "300",
          "x-ratelimit-remaining": "298",
          "x-ratelimit-reset": "2026-11-22T08:00:00Z"
        }
      }
    ));
    vi.stubGlobal("fetch", fetchMock);

    const client = new FiveDollarClient({ apiKey: "test-secret" });
    const result = await client.get<{ plan: string }>("status");

    expect(result.data.plan).toBe("community");
    expect(result.rateLimit.limit).toBe(300);
    expect(result.rateLimit.remaining).toBe(298);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-secret"
        })
      })
    );
  });

  it("preserves provider 429 retry information", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({
        success: 0,
        error: { code: "rate_limit_exceeded", message: "Too many requests" }
      }),
      { status: 429, headers: { "retry-after": "30" } }
    )));

    const client = new FiveDollarClient({ apiKey: "test-secret" });
    await expect(client.get("status")).rejects.toMatchObject({
      name: "FiveDollarApiError",
      status: 429,
      code: "rate_limit_exceeded",
      retryAfterSeconds: 30
    });
  });

  it("refuses to construct without an API key", () => {
    expect(() => new FiveDollarClient({ apiKey: "" })).toThrow(/FOOTBALL_API_KEY/);
  });
});