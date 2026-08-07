import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, checkRateLimitLocal, clearRateLimitStore, isDistributedRateLimitEnabled } from "../api/rate-limit";

beforeEach(() => {
  clearRateLimitStore();
});

describe("checkRateLimitLocal", () => {
  it("allows requests within the limit", () => {
    const result = checkRateLimitLocal("test-key", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests exceeding the limit", () => {
    checkRateLimitLocal("test-exceed", 2, 60_000);
    checkRateLimitLocal("test-exceed", 2, 60_000);
    const result = checkRateLimitLocal("test-exceed", 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    checkRateLimitLocal("test-reset", 1, -1); // already expired window
    const result = checkRateLimitLocal("test-reset", 1, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("tracks remaining count correctly", () => {
    const r1 = checkRateLimitLocal("test-remaining", 5, 60_000);
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimitLocal("test-remaining", 5, 60_000);
    expect(r2.remaining).toBe(3);
    const r3 = checkRateLimitLocal("test-remaining", 5, 60_000);
    expect(r3.remaining).toBe(2);
  });
});

describe("checkRateLimit (distributed wrapper)", () => {
  it("falls back to the local store when the distributed store is unavailable", async () => {
    // Tests run without Supabase env vars, so this exercises the fallback path.
    expect(isDistributedRateLimitEnabled()).toBe(false);
    const result = await checkRateLimit("async-key", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
