import { describe, expect, it } from "vitest";
import { appDateKey, nextAppOccurrence } from "../schedule-time";

describe("application schedule timezone", () => {
  it("uses the Long Beach calendar date instead of UTC", () => {
    expect(appDateKey(new Date("2026-09-17T01:00:00.000Z"))).toBe("2026-09-16");
  });

  it("does not move a local afternoon schedule to the next day", () => {
    const now = new Date("2026-09-16T19:00:00.000Z");
    const occurrence = nextAppOccurrence("17:00", [3], now);
    expect(occurrence.toISOString()).toBe("2026-09-17T00:00:00.000Z");
  });
});
