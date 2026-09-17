import { describe, expect, it } from "vitest";
import { SAFE_PRIVACY_DEFAULTS, validateCategory } from "@/lib/experience-validation";

describe("experience management validation", () => {
  it("rejects unsafe category slugs and unapproved themes", () => {
    expect(validateCategory({ slug: "Bad Slug", name: "Parking", description: "Useful", theme: "red" })).toContain("slug");
    expect(validateCategory({ slug: "parking", name: "Parking", description: "Useful", theme: "red" })).toContain("theme");
  });
  it("accepts a safe category", () => {
    expect(validateCategory({ slug: "live-signals", name: "Live signals", description: "Helpful signals", theme: "coral", status: "draft" })).toBeNull();
  });
  it("keeps sensitive privacy defaults private", () => {
    expect(SAFE_PRIVACY_DEFAULTS.exact_location).toBe("private");
    expect(SAFE_PRIVACY_DEFAULTS.address).toBe("private");
    expect(SAFE_PRIVACY_DEFAULTS.private_network).toBe("network_only");
  });
});
