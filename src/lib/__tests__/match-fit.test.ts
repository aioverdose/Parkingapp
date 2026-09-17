import { describe, expect, it } from "vitest";
import { getMatchFitSummary } from "@/lib/match-fit";

describe("match fit summary", () => {
  it("uses honest compatibility labels when exact participant data is missing", () => {
    expect(getMatchFitSummary({ relayMode: "scheduled", spotVehicleType: "suv", areaLabel: "shared area" })).toEqual({
      schedule: "Scheduled coordination available",
      vehicle: "Vehicle fit: SUV / Crossover",
      location: "Approximate area: shared area",
    });
  });

  it("reports compatible vehicles and approximate distance without scoring", () => {
    expect(getMatchFitSummary({ departureTime: "2026-09-05T12:00:00Z", spotVehicleType: "sedan", participantVehicleType: "sedan", distanceMeters: 1250 })).toEqual({
      schedule: "Departure timing available",
      vehicle: "Vehicle compatible",
      location: "about 1.3 km away",
    });
  });
});
