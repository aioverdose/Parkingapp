import { describe, expect, it } from "vitest";
import { SPOT_PROTOCOL } from "@/lib/spot-protocol";

describe("SPOT Protocol", () => {
  it("names the safety-first parking handoff", () => {
    expect(SPOT_PROTOCOL.name).toBe("SPOT Protocol");
    expect(SPOT_PROTOCOL.acronym).toBe("Safe Proximity Offer Transfer");
  });

  it("keeps the handoff stages ordered from offer to owner-ready transfer", () => {
    expect(SPOT_PROTOCOL.stages).toEqual([
      "Private offer",
      "Safe acceptance",
      "Hands-free approach",
      "Nearby verification",
      "Owner-ready handoff",
    ]);
  });
});
