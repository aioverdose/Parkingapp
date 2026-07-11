import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("combines class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("returns empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("filters out falsy values", () => {
    const result = cn("a", false && "b", null, undefined, "c");
    expect(result).toBe("a c");
  });
});
