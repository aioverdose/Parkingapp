import { describe, expect, it } from "vitest";
import { getMatchProtocolHref } from "../match-protocol";

describe("Match Protocol navigation", () => {
  it("targets Messages with the match query parameter", () => {
    expect(getMatchProtocolHref("match-123")).toBe("/messages?match=match-123");
    expect(getMatchProtocolHref("match/123")).not.toContain("/match/match/123");
  });
});
