import { describe, expect, it } from "vitest";
import { MAX_POTENTIAL_MESSAGE_LENGTH, sanitizePotentialMessage } from "../potential-messenger";

describe("potential messenger safety", () => {
  it("removes HTML and control characters while preserving text", () => {
    expect(sanitizePotentialMessage(" <b>Meet</b> at 5:00\nplease ")).toBe("Meet at 5:00 please");
  });

  it("caps messages at 500 characters", () => {
    expect(sanitizePotentialMessage("x".repeat(600))).toHaveLength(MAX_POTENTIAL_MESSAGE_LENGTH);
  });
});
