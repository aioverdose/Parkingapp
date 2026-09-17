import { describe, expect, it } from "vitest";
import { isChatParticipant, isChatUsable, validateMessengerMessage } from "../messenger-policy";

describe("messenger policy", () => {
  it("requires non-empty, short, non-threatening messages", () => {
    expect(validateMessengerMessage("  ")).toBeTruthy();
    expect(validateMessengerMessage("Please meet by the car")).toBeNull();
    expect(validateMessengerMessage("I will hurt you")).toBeTruthy();
    expect(validateMessengerMessage("x".repeat(501))).toBeTruthy();
  });

  it("only recognizes chat participants", () => {
    const chat = { sender_id: "a", receiver_id: "b" };
    expect(isChatParticipant("a", chat)).toBe(true);
    expect(isChatParticipant("c", chat)).toBe(false);
  });

  it("rejects closed and expired chats", () => {
    expect(isChatUsable({ status: "completed", expires_at: future() })).toBeTruthy();
    expect(isChatUsable({ status: "active", expires_at: new Date(0).toISOString() })).toBeTruthy();
    expect(isChatUsable({ status: "active", expires_at: future() })).toBeNull();
  });
});

function future(): string {
  return new Date(Date.now() + 60_000).toISOString();
}
