import { describe, expect, it } from "vitest";
import { getVehicleAvatarIcon, getVehicleAvatarLabel } from "@/components/VehicleAvatar";

describe("vehicle avatar mapping", () => {
  it.each([["compact", "Compact vehicle"], ["sedan", "Sedan"], ["suv", "SUV or crossover"], ["truck", "Truck or pickup"], ["van", "Van or minivan"], ["motorcycle", "Motorcycle"]])("labels %s", (type, label) => {
    expect(getVehicleAvatarLabel(type)).toBe(label);
    expect(getVehicleAvatarIcon(type)).toBeDefined();
  });

  it("falls back to a car icon", () => {
    expect(getVehicleAvatarIcon(null)).toBe(getVehicleAvatarIcon("unknown"));
  });
});
