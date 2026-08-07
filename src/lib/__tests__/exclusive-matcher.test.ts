import { describe, it, expect, afterEach } from "vitest";
import {
  getOfferWindowMs,
  getMatchRadiusMeters,
  haversineDistance,
  isScheduleCompatible,
  type ExclusiveSpot,
} from "../matching/exclusive-matcher";

const DEFAULT_OFFER_WINDOW_MS = 90_000;
const DEFAULT_RADIUS = 200;

function makeSpot(overrides: Partial<ExclusiveSpot> = {}): ExclusiveSpot {
  return {
    id: "spot-1",
    user_id: "owner-1",
    latitude: 33.7637,
    longitude: -118.1679,
    departure_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    return_time: null,
    address: "123 Main St",
    vehicle_type: "car",
    relay_mode: "imminent",
    visibility: "exclusive",
    exclusive_attempts: 0,
    max_exclusive_attempts: 5,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<{ user_id: string; vehicle_type: string | null; created_at: string }> = {}) {
  return {
    id: "req-1",
    user_id: "seeker-1",
    latitude: 33.7642,
    longitude: -118.1682,
    vehicle_type: "car",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  delete process.env.MATCH_OFFER_WINDOW_MS;
  delete process.env.MATCH_RADIUS_METERS;
});

describe("getOfferWindowMs", () => {
  it("defaults to 90 seconds", () => {
    expect(getOfferWindowMs()).toBe(DEFAULT_OFFER_WINDOW_MS);
  });

  it("uses the configured window", () => {
    process.env.MATCH_OFFER_WINDOW_MS = "45000";
    expect(getOfferWindowMs()).toBe(45_000);
  });

  it("ignores invalid configuration", () => {
    process.env.MATCH_OFFER_WINDOW_MS = "not-a-number";
    expect(getOfferWindowMs()).toBe(DEFAULT_OFFER_WINDOW_MS);
  });
});

describe("getMatchRadiusMeters", () => {
  it("defaults to 200 meters", () => {
    expect(getMatchRadiusMeters()).toBe(DEFAULT_RADIUS);
  });

  it("uses the configured radius", () => {
    process.env.MATCH_RADIUS_METERS = "500";
    expect(getMatchRadiusMeters()).toBe(500);
  });
});

describe("haversineDistance", () => {
  it("is ~0 for identical coordinates", () => {
    expect(haversineDistance(33.7637, -118.1679, 33.7637, -118.1679)).toBeLessThan(1);
  });

  it("computes ~1 degree of latitude as ~111km", () => {
    const d = haversineDistance(33, -118, 34, -118);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it("is symmetric", () => {
    const a = haversineDistance(33.76, -118.16, 33.77, -118.17);
    const b = haversineDistance(33.77, -118.17, 33.76, -118.16);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe("isScheduleCompatible", () => {
  it("matches an imminent spot against an active seeker request", () => {
    const spot = makeSpot();
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(true);
  });

  it("rejects an imminent spot that departs beyond the 2h seeker window", () => {
    const spot = makeSpot({
      departure_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    });
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(false);
  });

  it("matches a scheduled relay when the request overlaps the availability window", () => {
    const departure = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const spot = makeSpot({
      relay_mode: "scheduled",
      departure_time: departure,
      return_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    });
    const req = makeRequest();
    expect(isScheduleCompatible(spot, req)).toBe(true);
  });
});
