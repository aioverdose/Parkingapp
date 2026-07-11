import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../api/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", () => {
    const result = checkRateLimit("test-key", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-exceed-${Date.now()}`;
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const result = checkRateLimit(key, 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the window expires", () => {
    const key = `test-reset-${Date.now()}`;
    checkRateLimit(key, 1, -1); // already expired window
    const result = checkRateLimit(key, 1, 60_000);
    expect(result.allowed).toBe(true);
  });

  it("tracks remaining count correctly", () => {
    const key = `test-remaining-${Date.now()}`;
    const r1 = checkRateLimit(key, 5, 60_000);
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit(key, 5, 60_000);
    expect(r2.remaining).toBe(3);
    const r3 = checkRateLimit(key, 5, 60_000);
    expect(r3.remaining).toBe(2);
  });
});
