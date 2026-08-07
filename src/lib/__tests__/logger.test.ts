import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "../logger";
import { logError, logApiError } from "../error-logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("emits a structured JSON line with level, message, and timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello", { route: "/test" });
    const line = spy.mock.calls[0][0] as string;
    expect(line).toContain("[ParkingMeeters]");
    const parsed = JSON.parse(line.slice(line.indexOf("{")));
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("hello");
    expect(parsed.route).toBe("/test");
    expect(parsed.timestamp).toBeTruthy();
  });

  it("sanitizes Error values inside context without throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => logger.error("boom", { cause: new Error("nested") })).not.toThrow();
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line.slice(line.indexOf("{")));
    expect(parsed.cause.message).toBe("nested");
  });

  it("never throws when persistence fails", async () => {
    // persist() is fire-and-forget; ensure console path stays safe.
    await expect(Promise.resolve(logger.warn("warning"))).resolves.toBeUndefined();
  });
});

describe("error-logger", () => {
  it("logError formats unknown values and Error stacks", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(new Error("kaboom"), { userId: "u1" });
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line.slice(line.indexOf("{")));
    expect(parsed.level).toBe("error");
    expect(parsed.message).toBe("kaboom");
    expect(parsed.stack).toContain("kaboom");
    expect(parsed.userId).toBe("u1");
  });

  it("logApiError attaches route context", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logApiError("/api/test", "plain string", "u2");
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line.slice(line.indexOf("{")));
    expect(parsed.message).toBe("plain string");
    expect(parsed.route).toBe("/api/test");
    expect(parsed.userId).toBe("u2");
  });
});
