import { describe, expect, it } from "vitest";
import { moderateMessengerMessage } from "../messenger-moderation";

describe("messenger moderation rules", () => {
  it.each([
    ["I will kill you", "threats_violence", "blocked"],
    ["Send me a deposit on Venmo first", "payment_deposit", "blocked"],
    ["What is your verification code?", "passwords_verification_codes", "blocked"],
    ["Text me at 415-555-1212", "contact_sharing", "flagged"],
    ["Click https://bit.ly/parking", "suspicious_links", "flagged"],
    ["Do it or else, idiot", "harassment_coercion", "flagged"],
    ["Park in front of the fire hydrant", "illegal_parking_instructions", "flagged"],
  ])("classifies %s", (content, label, decision) => {
    const result = moderateMessengerMessage(content);
    expect(result.labels).toContain(label);
    expect(result.decision).toBe(decision);
    expect(result.requires_human_review).toBe(true);
  });

  it("allows ordinary deterministic content", () => {
    expect(moderateMessengerMessage("I am leaving in five minutes")).toMatchObject({ decision: "allowed", severity: "low", labels: [], requires_human_review: false });
  });
});
