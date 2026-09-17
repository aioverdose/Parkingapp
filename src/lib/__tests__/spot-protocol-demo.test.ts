import { describe, expect, it } from "vitest";
import { getSpotDemoStage, SPOT_DEMO_STAGES } from "@/lib/testing/spot-protocol-demo";

describe("SPOT Protocol live demo", () => {
  it("walks through the private handoff in order", () => {
    expect(SPOT_DEMO_STAGES.map((stage) => stage.key)).toEqual([
      "destination", "geofence", "searching", "offered", "accepted",
      "approach", "nearby", "owner_ready", "departed", "complete",
    ]);
  });

  it("ends at the completed handoff stage", () => {
    const total = SPOT_DEMO_STAGES.reduce((sum, stage) => sum + stage.durationMs, 0);
    expect(getSpotDemoStage(total).stage.key).toBe("complete");
  });
});
