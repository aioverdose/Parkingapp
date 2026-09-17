import { describe, expect, it } from "vitest";
import { isSyntheticAccount } from "../testing/synthetic-account";

describe("isSyntheticAccount", () => {
  it("recognizes reserved test identities case-insensitively", () => {
    expect(isSyntheticAccount("test-device-1@parkingmeeters.test")).toBe(true);
    expect(isSyntheticAccount(" TEST-DEVICE-2@PARKINGMEETERS.TEST ")).toBe(true);
  });

  it("does not classify ordinary or malformed emails as synthetic", () => {
    expect(isSyntheticAccount("member@example.com")).toBe(false);
    expect(isSyntheticAccount("parkingmeeters.test@member.example.com")).toBe(false);
    expect(isSyntheticAccount(null)).toBe(false);
  });
});
