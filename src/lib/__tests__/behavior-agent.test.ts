import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BehaviorAgent } from "../behavior/agent";
import type {
  BehaviorAgentEvent,
  GpsSample,
  MotionFeatures,
} from "../behavior/types";

function gps(lat: number, lng: number, speedMs: number, timestamp: number): GpsSample {
  return { lat, lng, speedMs, heading: null, accuracy: 5, timestamp };
}

function motion(
  timestamp: number,
  vibrationEnergy: number,
  stepCadence: number,
): MotionFeatures {
  return { timestamp, vibrationEnergy, stepCadence, hasMotion: true };
}

const BASE_LAT = 40.0;
const BASE_LNG = -105.0;
const METERS_PER_DEG_LAT = 111320;

let events: BehaviorAgentEvent[];
let agent: BehaviorAgent;

beforeEach(() => {
  vi.useFakeTimers();
  events = [];
  agent = new BehaviorAgent({}, (e) => events.push(e));
});

afterEach(() => {
  vi.useRealTimers();
});

function parkVehicle(): void {
  let t = Date.now();
  for (let i = 0; i < 12; i++) {
    agent.ingest({ timestamp: t, gps: gps(BASE_LAT, BASE_LNG, 0, t), motion: null });
    t += 2000;
    vi.setSystemTime(t);
  }
}

describe("BehaviorAgent — parking detection", () => {
  it("confirms parking after a stationary window", () => {
    parkVehicle();
    expect(events.some((e) => e.type === "PARK_CONFIRMED")).toBe(true);
    expect(agent.getState()).toBe("parked");
    const snap = agent.getSnapshot();
    expect(snap.parkedLocation?.lat).toBeCloseTo(BASE_LAT, 5);
    expect(snap.parkingProgress).toBe(1);
  });

  it("does not confirm parking while moving", () => {
    let t = Date.now();
    for (let i = 0; i < 20; i++) {
      agent.ingest({ timestamp: t, gps: gps(BASE_LAT + 0.0001 * i, BASE_LNG, 8, t), motion: null });
      t += 1000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "PARK_CONFIRMED")).toBe(false);
    expect(agent.getState()).not.toBe("parked");
  });
});

describe("BehaviorAgent — walking away", () => {
  it("confirms walking away once far enough", () => {
    parkVehicle();
    events = [];
    let lat = BASE_LAT;
    let t = Date.now();
    for (let i = 0; i < 12; i++) {
      lat += (2.5 * 2) / METERS_PER_DEG_LAT;
      agent.ingest({ timestamp: t, gps: gps(lat, BASE_LNG, 2.5, t), motion: null });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "WALKING_AWAY_CONFIRMED")).toBe(true);
    expect(agent.getState()).toBe("walking_away");
  });
});

describe("BehaviorAgent — return to car", () => {
  it("confirms returning then near-car", () => {
    parkVehicle();
    events = [];

    let lat = BASE_LAT;
    let t = Date.now();
    for (let i = 0; i < 12; i++) {
      lat += (2.5 * 2) / METERS_PER_DEG_LAT;
      agent.ingest({ timestamp: t, gps: gps(lat, BASE_LNG, 2.5, t), motion: null });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "WALKING_AWAY_CONFIRMED")).toBe(true);
    events = [];

    agent.ingest({ timestamp: Date.now(), gps: gps(lat, BASE_LNG, 0, Date.now()), motion: null });
    expect(agent.getState()).toBe("away");

    for (let i = 0; i < 14; i++) {
      lat -= (2.5 * 2) / METERS_PER_DEG_LAT;
      agent.ingest({ timestamp: Date.now(), gps: gps(lat, BASE_LNG, 2.5, Date.now()), motion: null });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "RETURNING_CONFIRMED")).toBe(true);

    for (let i = 0; i < 12; i++) {
      lat -= (1.0 * 2) / METERS_PER_DEG_LAT;
      agent.ingest({ timestamp: Date.now(), gps: gps(lat, BASE_LNG, 1.0, Date.now()), motion: null });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "NEAR_CAR_CONFIRMED")).toBe(true);
  });
});

describe("BehaviorAgent — vehicle moved", () => {
  it("confirms the car pulled out via GPS", () => {
    parkVehicle();
    events = [];
    let t = Date.now();
    for (let i = 0; i < 6; i++) {
      agent.ingest({ timestamp: t, gps: gps(BASE_LAT, BASE_LNG, 6, t), motion: null });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "CAR_MOVED_CONFIRMED")).toBe(true);
    expect(agent.getState()).toBe("vehicle_moved");
  });

  it("confirms the car pulled out via motion only (engine vibration)", () => {
    parkVehicle();
    events = [];
    let t = Date.now();
    for (let i = 0; i < 6; i++) {
      agent.ingest({ timestamp: t, gps: null, motion: motion(t, 8, 0.1) });
      t += 2000;
      vi.setSystemTime(t);
    }
    expect(events.some((e) => e.type === "CAR_MOVED_CONFIRMED")).toBe(true);
    expect(agent.getState()).toBe("vehicle_moved");
  });
});
