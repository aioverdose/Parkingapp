import type {
  BehaviorAgentConfig,
  BehaviorAgentEvent,
  BehaviorAgentSnapshot,
  BehaviorAgentState,
  GpsSample,
  SensorFeatures,
} from "./types";
import { DEFAULT_BEHAVIOR_AGENT_CONFIG } from "./types";

function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceTo(gps: GpsSample, parked: { lat: number; lng: number }): number {
  return haversine(gps.lat, gps.lng, parked.lat, parked.lng);
}

interface SpeedSample {
  t: number;
  speedMs: number;
}

interface WalkSample {
  t: number;
  dist: number;
}

export class BehaviorAgent {
  private state: BehaviorAgentState = "unknown";
  private config: BehaviorAgentConfig;
  private onEvent: ((event: BehaviorAgentEvent) => void) | null;

  private parkedLocation: { lat: number; lng: number } | null = null;
  private parkedAt: number | null = null;
  private lastGps: GpsSample | null = null;
  private lastMotionActive = false;

  private speedBuffer: SpeedSample[] = [];
  private walkSamples: WalkSample[] = [];
  private returnSamples: WalkSample[] = [];
  private movingSamples: number[] = [];
  private lastDist: number | null = null;
  private lastEvent: BehaviorAgentEvent | null = null;
  private pendingEvents: BehaviorAgentEvent[] = [];

  constructor(
    config: Partial<BehaviorAgentConfig> = {},
    onEvent: ((event: BehaviorAgentEvent) => void) | null = null,
  ) {
    this.config = { ...DEFAULT_BEHAVIOR_AGENT_CONFIG, ...config };
    this.onEvent = onEvent;
  }

  getConfig(): BehaviorAgentConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<BehaviorAgentConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  getState(): BehaviorAgentState {
    return this.state;
  }

  getSnapshot(): BehaviorAgentSnapshot {
    const dist =
      this.lastGps && this.parkedLocation
        ? distanceTo(this.lastGps, this.parkedLocation)
        : null;
    const recent = this.recentSpeedSamples();
    const parkingProgress =
      this.state === "parked"
        ? 1
        : this.state === "parking_in_progress" ||
            this.state === "unknown" ||
            this.state === "driving"
          ? Math.min(1, recent.length / (this.config.parkingWindowMs / 1000))
          : 0;
    return {
      state: this.state,
      parkedLocation: this.parkedLocation ? { ...this.parkedLocation } : null,
      parkedAt: this.parkedAt,
      speedMs: this.lastGps?.speedMs ?? null,
      distanceToCarMeters: dist,
      walkingEtaSeconds:
        dist != null && this.state === "returning"
          ? Math.round(dist / 1.4)
          : null,
      parkingProgress,
      lastEvent: this.lastEvent,
      motionAvailable: this.lastMotionActive,
      gpsAvailable: this.lastGps !== null,
    };
  }

  reset(): void {
    this.state = "unknown";
    this.parkedLocation = null;
    this.parkedAt = null;
    this.lastGps = null;
    this.lastMotionActive = false;
    this.speedBuffer = [];
    this.walkSamples = [];
    this.returnSamples = [];
    this.movingSamples = [];
    this.lastDist = null;
    this.lastEvent = null;
  }

  ingest(features: SensorFeatures): BehaviorAgentEvent[] {
    if (features.gps) this.lastGps = features.gps;
    if (features.motion) this.lastMotionActive = true;

    if (features.gps) {
      this.handleGps(features);
    } else if (features.motion) {
      this.handleMotionOnly(features);
    }

    const events = this.pendingEvents;
    this.pendingEvents = [];
    for (const event of events) {
      this.lastEvent = event;
      this.onEvent?.(event);
    }
    return events;
  }

  private emit(
    type: BehaviorAgentEvent["type"],
    lat: number | null,
    lng: number | null,
    confidence: number,
  ): void {
    this.pendingEvents.push({
      type,
      timestamp: Date.now(),
      state: this.state,
      lat,
      lng,
      confidence,
    });
  }

  private recentSpeedSamples(): SpeedSample[] {
    const cutoff = Date.now() - this.config.parkingWindowMs;
    return this.speedBuffer.filter((s) => s.t >= cutoff);
  }

  private handleGps(features: SensorFeatures): void {
    const gps = features.gps as GpsSample;
    const speed = gps.speedMs != null ? gps.speedMs : 99;
    this.speedBuffer.push({ t: gps.timestamp, speedMs: speed });
    if (this.speedBuffer.length > 120) this.speedBuffer.shift();

    const recent = this.recentSpeedSamples();
    const isWalking =
      gps.speedMs != null &&
      gps.speedMs >= this.config.walkingSpeedMinMs &&
      gps.speedMs <= this.config.walkingSpeedMaxMs;
    const isStationary = gps.speedMs != null && gps.speedMs < this.config.parkingSpeedThresholdMs;
    const isMoving = gps.speedMs != null && gps.speedMs >= this.config.vehicleMovedSpeedMs;

    const dist = this.parkedLocation ? distanceTo(gps, this.parkedLocation) : null;
    const prevDist = this.lastDist;
    this.lastDist = dist;

    if (this.state === "parked" || this.state === "near_car") {
      if (isMoving) {
        this.movingSamples.push(gps.timestamp);
        const span = this.lastSampleSpan(this.movingSamples);
        if (span >= this.config.vehicleMovedWindowMs) {
          this.transitionTo("vehicle_moved");
          this.emit("CAR_MOVED_CONFIRMED", gps.lat, gps.lng, 0.9);
          this.movingSamples = [];
          this.walkSamples = [];
          this.returnSamples = [];
        }
        return;
      }
      this.movingSamples = [];

      if (isWalking && dist != null) {
        this.walkSamples.push({ t: gps.timestamp, dist });
        this.trimSamples(this.walkSamples);
        const span = this.lastSampleSpan(this.walkSamples);
        if (span >= this.config.walkingConfirmMs) {
          if (dist >= this.config.leavingDistanceMeters) {
            this.transitionTo("walking_away");
            this.emit("WALKING_AWAY_CONFIRMED", gps.lat, gps.lng, 0.8);
            this.walkSamples = [];
            this.returnSamples = [];
          } else if (dist < this.config.nearCarMeters) {
            this.transitionTo("near_car");
            this.emit("NEAR_CAR_CONFIRMED", gps.lat, gps.lng, 0.85);
            this.walkSamples = [];
          }
        }
      } else {
        this.walkSamples = [];
      }
      return;
    }

    if (this.state === "walking_away") {
      if (dist != null && dist < this.config.nearCarMeters && isWalking) {
        this.transitionTo("near_car");
        this.emit("NEAR_CAR_CONFIRMED", gps.lat, gps.lng, 0.85);
        return;
      }
      if (isMoving) {
        this.transitionTo("vehicle_moved");
        this.emit("CAR_MOVED_CONFIRMED", gps.lat, gps.lng, 0.85);
        this.movingSamples = [];
        this.returnSamples = [];
        return;
      }
      if (!isWalking) {
        this.transitionTo("away");
      }
      return;
    }

    if (this.state === "away") {
      if (isWalking && dist != null && prevDist != null && dist < prevDist - 2) {
        this.returnSamples.push({ t: gps.timestamp, dist });
        this.trimSamples(this.returnSamples);
        if (this.lastSampleSpan(this.returnSamples) >= this.config.walkingConfirmMs) {
          this.transitionTo("returning");
          this.emit("RETURNING_CONFIRMED", gps.lat, gps.lng, 0.8);
          this.returnSamples = [];
        }
      } else {
        this.returnSamples = [];
      }
      return;
    }

    if (this.state === "returning") {
      if (dist != null && dist < this.config.nearCarMeters && isWalking) {
        this.transitionTo("near_car");
        this.emit("NEAR_CAR_CONFIRMED", gps.lat, gps.lng, 0.85);
        return;
      }
      if (isMoving) {
        this.transitionTo("vehicle_moved");
        this.emit("CAR_MOVED_CONFIRMED", gps.lat, gps.lng, 0.9);
        this.movingSamples = [];
        return;
      }
      if (!isWalking) {
        this.transitionTo("away");
      }
      return;
    }

    if (this.state === "parking_in_progress") {
      if (this.parkingConfirmed(recent)) {
        this.confirmParked(gps, recent.length / (this.config.parkingWindowMs / 1000));
      } else if (isMoving || (isWalking && dist == null)) {
        this.transitionTo("driving");
        this.movingSamples = [];
      }
      return;
    }

    if (this.state === "unknown" || this.state === "driving") {
      if (this.parkingConfirmed(recent)) {
        this.confirmParked(gps, recent.length / (this.config.parkingWindowMs / 1000));
      } else if (this.state === "driving" && isStationary) {
        this.transitionTo("parking_in_progress");
      }
      return;
    }
  }

  private handleMotionOnly(features: SensorFeatures): void {
    const motion = features.motion;
    if (!motion) return;
    const now = motion.timestamp;
    const lowVibration = motion.vibrationEnergy < 3.0;
    const stationaryOnFoot = lowVibration && motion.stepCadence < 0.4;
    const walking = motion.stepCadence >= 0.6;
    const vehicleRunning = motion.vibrationEnergy >= 6.0;

    if (this.state === "parked" || this.state === "near_car") {
      if (vehicleRunning) {
        this.movingSamples.push(now);
        if (this.lastSampleSpan(this.movingSamples) >= this.config.vehicleMovedWindowMs) {
          this.transitionTo("vehicle_moved");
          this.emit("CAR_MOVED_CONFIRMED", null, null, 0.7);
          this.movingSamples = [];
        }
      } else {
        this.movingSamples = [];
        if (walking) {
          this.walkSamples.push({ t: now, dist: 0 });
          this.trimSamples(this.walkSamples);
          if (this.lastSampleSpan(this.walkSamples) >= this.config.walkingConfirmMs) {
            this.transitionTo("walking_away");
            this.emit("WALKING_AWAY_CONFIRMED", null, null, 0.6);
            this.walkSamples = [];
          }
        } else {
          this.walkSamples = [];
        }
      }
      return;
    }

    if (this.state === "unknown" || this.state === "parking_in_progress") {
      this.speedBuffer.push({ t: now, speedMs: stationaryOnFoot ? 0 : 1.5 });
      if (this.speedBuffer.length > 120) this.speedBuffer.shift();
      const recent = this.recentSpeedSamples();
      if (this.parkingConfirmed(recent)) {
        this.parkedLocation = this.lastGps ? { lat: this.lastGps.lat, lng: this.lastGps.lng } : null;
        this.transitionTo("parked");
        this.emit("PARK_CONFIRMED", this.lastGps?.lat ?? null, this.lastGps?.lng ?? null, 0.5);
        this.speedBuffer = [];
      }
    }
  }

  private parkingConfirmed(recent: SpeedSample[]): boolean {
    return (
      recent.length >= this.config.parkingMinSamples &&
      recent.every((s) => s.speedMs < this.config.parkingSpeedThresholdMs)
    );
  }

  private confirmParked(gps: GpsSample, confidence: number): void {
    this.parkedLocation = { lat: gps.lat, lng: gps.lng };
    this.parkedAt = Date.now();
    this.transitionTo("parked");
    this.emit("PARK_CONFIRMED", gps.lat, gps.lng, Math.min(1, Math.max(0.5, confidence)));
    this.speedBuffer = [];
    this.walkSamples = [];
    this.returnSamples = [];
    this.movingSamples = [];
  }

  private transitionTo(state: BehaviorAgentState): void {
    this.state = state;
  }

  private lastSampleSpan(samples: { t: number }[] | number[]): number {
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    const first = samples[0];
    const lastT = typeof last === "number" ? last : last.t;
    const firstT = typeof first === "number" ? first : first.t;
    return lastT - firstT;
  }

  private trimSamples(samples: WalkSample[]): void {
    // Trim to a window slightly wider than the confirm window so the span can
    // actually reach walkingConfirmMs between the oldest and newest sample.
    const cutoff = Date.now() - this.config.walkingConfirmMs - 5000;
    while (samples.length > 0 && samples[0].t < cutoff) {
      samples.shift();
    }
    if (samples.length > 120) {
      samples.splice(0, samples.length - 120);
    }
  }
}
