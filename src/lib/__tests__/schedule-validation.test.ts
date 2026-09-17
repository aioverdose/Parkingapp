import { describe, expect, it } from "vitest";
import { isValidDate, isValidTime, validateScheduleFields } from "@/lib/schedule-validation";

describe("schedule planner validation", () => {
  it("rejects impossible dates and malformed times", () => { expect(isValidDate("2026-02-30")).toBe(false); expect(isValidTime("25:00")).toBe(false); });
  it("accepts a valid recurring schedule and rejects reversed dates", () => {
    const base = { latitude: 33.77, longitude: -118.19, departure_time: "17:00", return_time: "08:00", days_of_week: [1, 2, 3] };
    expect(validateScheduleFields({ ...base, start_date: "2026-01-01", end_date: "2026-12-31" })).toBeNull();
    expect(validateScheduleFields({ ...base, start_date: "2026-12-31", end_date: "2026-01-01" })).toContain("End date");
  });
  it("rejects invalid coordinates and vehicle ids", () => { expect(validateScheduleFields({ latitude: 91, longitude: 0, departure_time: "17:00", return_time: "08:00" })).toContain("latitude"); expect(validateScheduleFields({ latitude: 0, longitude: 0, departure_time: "17:00", return_time: "08:00", vehicle_id: "not-a-uuid" })).toContain("vehicle_id"); });
});
