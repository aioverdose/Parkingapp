import { describe, expect, it } from "vitest";
import { parseResearchJson, researchChecklist } from "@/lib/parking-research";
import { redactCommunityArea } from "@/lib/community";

describe("parking research safety", () => {
  it("rejects malformed provider JSON and records", () => {
    expect(() => parseResearchJson({ records: [{ record_type: "sweeping", name: "Missing source" }] })).toThrow();
    expect(() => parseResearchJson("not json")).toThrow();
  });

  it("creates a transparent checklist when no provider is available", () => {
    const draft = researchChecklist("Long Beach", "CA", ["street sweeping"], []);
    expect(draft.records).toEqual([]);
    expect(draft.notes).toContain("verify official street sweeping sources");
    expect(draft.notes).toContain("No source URLs supplied");
  });

  it("preserves supplied source links in the checklist", () => {
    expect(researchChecklist("Austin", "TX", ["parking meters"], ["https://austin.gov/parking"]).notes).toContain("https://austin.gov/parking");
  });

  it("redacts exact community locations for moderation views", () => {
    expect(redactCommunityArea("123 Main Street, Downtown")).not.toContain("123 Main Street");
    expect(redactCommunityArea("33.7701, -118.1937")).toContain("specific coordinates");
  });
});
