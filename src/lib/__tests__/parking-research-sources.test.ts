import { describe, expect, it } from "vitest";
import { htmlToResearchText, validateResearchUrl } from "@/lib/parking-research-sources";

describe("parking research sources", () => {
  it("blocks private, credentialed, and unsafe URLs", async () => {
    await expect(validateResearchUrl("http://127.0.0.1/rules")).resolves.toBeNull();
    await expect(validateResearchUrl("https://user:pass@example.com/rules")).resolves.toBeNull();
    await expect(validateResearchUrl("https://example.com:22/rules")).resolves.toBeNull();
  });

  it("extracts title and readable text while removing active content", () => {
    expect(htmlToResearchText("<html><title>City &amp; Rules</title><style>x</style><script>alert(1)</script><h1>Street sweeping</h1><p>Tuesday &amp; Thursday</p></html>")).toEqual({ title: "City & Rules", snippet: "Street sweeping Tuesday & Thursday" });
  });
});
