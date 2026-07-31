import { describe, it, expect } from "vitest";
import { VEHICLE_TYPES } from "../vehicle-types";

describe("VEHICLE_TYPES", () => {
  it("contains all expected vehicle types", () => {
    const types = VEHICLE_TYPES.map((v: any) => v.value);
    expect(types).toContain("compact");
    expect(types).toContain("sedan");
    expect(types).toContain("suv");
    expect(types).toContain("truck");
    expect(types).toContain("van");
    expect(types).toContain("motorcycle");
  });

  it("has labels for all types", () => {
    VEHICLE_TYPES.forEach((v: any) => {
      expect(v.label).toBeTruthy();
    });
  });
});
