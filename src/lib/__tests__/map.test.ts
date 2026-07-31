import { describe, it, expect, vi } from "vitest";
import { formatLeavingCountdown } from "../map";

describe("formatLeavingCountdown", () => {
  it('returns "Unknown" for null', () => {
    expect(formatLeavingCountdown(null)).toBe("Unknown");
  });

  it('returns "Unknown" for undefined', () => {
    expect(formatLeavingCountdown(undefined)).toBe("Unknown");
  });

  it('returns "Now" for past time', () => {
    expect(formatLeavingCountdown(new Date(Date.now() - 60000).toISOString())).toBe("Now");
  });

  it("formats minutes and seconds correctly", () => {
    const future = new Date(Date.now() + 5 * 60000 + 30000).toISOString();
    const result = formatLeavingCountdown(future);
    expect(result).toMatch(/^\d+m \d{2}s$/);
  });
});
