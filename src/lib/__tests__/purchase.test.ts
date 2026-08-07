import { describe, it, expect } from "vitest";
import { parsePurchaseMetadata, MAX_CREDIT_QUANTITY } from "../purchase";

describe("parsePurchaseMetadata", () => {
  it("parses valid metadata", () => {
    expect(parsePurchaseMetadata({ userId: "u1", quantity: "3" })).toEqual({
      userId: "u1",
      quantity: 3,
    });
  });

  it("defaults quantity to 1 when omitted", () => {
    expect(parsePurchaseMetadata({ userId: "u1" })).toEqual({
      userId: "u1",
      quantity: 1,
    });
  });

  it("rejects missing user id", () => {
    expect(parsePurchaseMetadata({ quantity: "2" })).toBeNull();
    expect(parsePurchaseMetadata(null)).toBeNull();
    expect(parsePurchaseMetadata(undefined)).toBeNull();
  });

  it("rejects non-integer and out-of-range quantities", () => {
    expect(parsePurchaseMetadata({ userId: "u1", quantity: "abc" })).toBeNull();
    expect(parsePurchaseMetadata({ userId: "u1", quantity: "0" })).toBeNull();
    expect(parsePurchaseMetadata({ userId: "u1", quantity: "-5" })).toBeNull();
    expect(parsePurchaseMetadata({ userId: "u1", quantity: "1.5" })).toBeNull();
    expect(parsePurchaseMetadata({ userId: "u1", quantity: String(MAX_CREDIT_QUANTITY + 1) })).toBeNull();
  });

  it("allows the maximum quantity", () => {
    expect(parsePurchaseMetadata({ userId: "u1", quantity: String(MAX_CREDIT_QUANTITY) })).toEqual({
      userId: "u1",
      quantity: MAX_CREDIT_QUANTITY,
    });
  });
});
