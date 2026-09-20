import { describe, expect, it } from "vitest";
import { distanceMeters } from "../matching/area-distance";
import { windowOverlapMinutes, windowsAreCompatible } from "../matching/time-window";
import { vehiclesCompatible } from "../matching/vehicle-compatibility";

describe("neutral potential matching utilities", () => {
  it("uses the 300 foot boundary for area calculations", () => {
    const distance = distanceMeters(33.7701, -118.1937, 33.7709, -118.1937);
    expect(distance).toBeGreaterThan(80);
    expect(distance).toBeLessThan(91.44);
  });

  it("requires at least five minutes of overlap", () => {
    expect(windowOverlapMinutes("16:55", "17:05", "17:00", "17:10")).toBe(5);
    expect(windowsAreCompatible({ window_start: "16:55", window_end: "17:05" }, { window_start: "17:00", window_end: "17:10" }, 5)).toBe(true);
    expect(windowsAreCompatible({ window_start: "16:55", window_end: "16:59" }, { window_start: "17:00", window_end: "17:10" }, 5)).toBe(false);
  });

  it("accepts compatible vehicles and rejects incompatible vehicles", () => {
    expect(vehiclesCompatible("sedan", "sedan")).toBe(true);
    expect(vehiclesCompatible("any", "truck")).toBe(true);
    expect(vehiclesCompatible("compact", "truck")).toBe(false);
  });
});
