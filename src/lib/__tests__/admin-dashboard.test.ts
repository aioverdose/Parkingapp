import { describe, expect, it } from "vitest";
import { mapAdminDashboardMetrics } from "../admin-dashboard";

describe("admin dashboard metrics", () => {
  it("maps live counts and defaults missing values", () => {
    expect(mapAdminDashboardMetrics({ activeMatches: 4, pendingMatches: 2, flaggedMembers: 1, flaggedMessages: 3 })).toEqual({ activeMatches: 4, pendingMatches: 2, flaggedMembers: 1, flaggedMessages: 3 });
    expect(mapAdminDashboardMetrics({ activeMatches: 4 })).toEqual({ activeMatches: 4, pendingMatches: 0, flaggedMembers: 0, flaggedMessages: 0 });
  });
});
