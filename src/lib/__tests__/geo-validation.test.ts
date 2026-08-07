import { describe, it, expect } from "vitest";
import {
  isValidLatitude,
  isValidLongitude,
  isValidCoords,
  isValidSpeed,
  isValidAccuracy,
  isValidHeading,
} from "../geo-validation";

describe("geo-validation", () => {
  it("accepts valid coordinates", () => {
    expect(isValidCoords(37.7749, -122.4194)).toBe(true);
    expect(isValidCoords(90, 180)).toBe(true);
    expect(isValidCoords(-90, -180)).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(isValidCoords(90.1, 0)).toBe(false);
    expect(isValidCoords(0, 180.1)).toBe(false);
    expect(isValidCoords(NaN, 0)).toBe(false);
    expect(isValidCoords("37", -122)).toBe(false);
    expect(isValidCoords(null, -122)).toBe(false);
  });

  it("rejects partial or malformed coordinates", () => {
    expect(isValidLatitude(Infinity)).toBe(false);
    expect(isValidLongitude(undefined)).toBe(false);
    expect(isValidLatitude(37)).toBe(true);
  });

  it("validates telemetry ranges", () => {
    expect(isValidSpeed(35)).toBe(true);
    expect(isValidSpeed(-1)).toBe(false);
    expect(isValidSpeed(201)).toBe(false);
    expect(isValidSpeed(undefined)).toBe(true);

    expect(isValidAccuracy(25)).toBe(true);
    expect(isValidAccuracy(-5)).toBe(false);
    expect(isValidAccuracy(5001)).toBe(false);
    expect(isValidAccuracy(null)).toBe(true);

    expect(isValidHeading(180)).toBe(true);
    expect(isValidHeading(361)).toBe(false);
    expect(isValidHeading(undefined)).toBe(true);
  });
});
