import type { SupabaseClient } from "@supabase/supabase-js";
import type { SimulatedPosition, RouteWaypoint, DeviceStatus, PlaybackState } from "./types";
import { PARKING_SPEED_THRESHOLD, AUTO_BROADCAST_INTERVAL_MS, IDLE_TIMEOUT_MS } from "./constants";

export class SimulatedDevice {
  private supabase: SupabaseClient;
  private userId: string;
  private position: SimulatedPosition;
  private broadcastTimer: ReturnType<typeof setInterval> | null = null;
  private routeTimer: ReturnType<typeof setInterval> | null = null;

  private route: RouteWaypoint[] | null = null;
  private routeIndex = 0;
  private routeSpeed = 1;
  private routePlaying = false;
  private playbackStartTime = 0;
  private playbackElapsed = 0;
  private dwellTimer: ReturnType<typeof setTimeout> | null = null;

  private gpsNoiseEnabled = false;
  private gpsNoiseMaxMeters = 50;
  private undergroundModeEnabled = false;

  private positionHistory: SimulatedPosition[] = [];
  private maxHistoryLength = 1800; // 30 min at 1/sec

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
    this.position = {
      lat: 33.7701,
      lng: -118.1937,
      speed: 0,
      heading: 0,
      accuracy: 10,
      timestamp: new Date().toISOString(),
    };
  }

  getUserId(): string {
    return this.userId;
  }

  getPosition(): SimulatedPosition {
    return { ...this.position };
  }

  getPositionHistory(): SimulatedPosition[] {
    return [...this.positionHistory];
  }

  getStatus(): DeviceStatus {
    const now = Date.now();
    const lastUpdate = new Date(this.position.timestamp).getTime();
    if (now - lastUpdate > IDLE_TIMEOUT_MS) return "offline";
    if (this.position.speed < PARKING_SPEED_THRESHOLD) {
      const recentHistory = this.positionHistory.slice(-30);
      const hasBeenSlow = recentHistory.length >= 10 && recentHistory.every((p) => p.speed < PARKING_SPEED_THRESHOLD);
      return hasBeenSlow ? "parked" : "idle";
    }
    return "driving";
  }

  /**
   * Synthesizes sensor features (GPS + motion) from the simulated device's
   * position so it can be fed straight into a BehaviorAgent for testing the
   * parking/handoff detection pipeline.
   */
  getSensorFeatures() {
    const now = Date.now();
    const speedMs = this.position.speed * 0.44704;
    let vibrationEnergy = 0.4;
    let stepCadence = 0;
    if (speedMs >= 0.5 && speedMs <= 3) {
      vibrationEnergy = 1.6;
      stepCadence = 1.7;
    } else if (speedMs > 3) {
      vibrationEnergy = 8;
      stepCadence = 0.1;
    }
    return {
      timestamp: now,
      gps: {
        lat: this.position.lat,
        lng: this.position.lng,
        speedMs,
        heading: this.position.heading,
        accuracy: this.position.accuracy,
        timestamp: now,
      },
      motion: { timestamp: now, vibrationEnergy, stepCadence, hasMotion: true },
    };
  }

  setPosition(lat: number, lng: number, speed?: number, heading?: number, accuracy?: number): void {
    this.position = {
      lat,
      lng,
      speed: speed ?? this.position.speed,
      heading: heading ?? this.position.heading,
      accuracy: accuracy ?? this.position.accuracy,
      timestamp: new Date().toISOString(),
    };
    this.recordHistory();
  }

  setSpeed(mps: number): void {
    this.position = { ...this.position, speed: mps, timestamp: new Date().toISOString() };
  }

  setHeading(degrees: number): void {
    this.position = { ...this.position, heading: degrees, timestamp: new Date().toISOString() };
  }

  async broadcast(): Promise<void> {
    let { lat, lng, accuracy } = this.position;

    if (this.gpsNoiseEnabled) {
      const noiseLat = (Math.random() - 0.5) * (this.gpsNoiseMaxMeters / 111_000);
      const noiseLng = (Math.random() - 0.5) * (this.gpsNoiseMaxMeters / (111_000 * Math.cos((lat * Math.PI) / 180)));
      lat += noiseLat;
      lng += noiseLng;
      accuracy = Math.min(accuracy + Math.random() * this.gpsNoiseMaxMeters, 500);
    }

    if (this.undergroundModeEnabled) {
      accuracy = 500;
      lat += (Math.random() - 0.5) * 0.001;
      lng += (Math.random() - 0.5) * 0.001;
    }

    await this.supabase.from("driver_locations").insert({
      user_id: this.userId,
      latitude: lat,
      longitude: lng,
      heading: this.position.heading,
      speed: this.position.speed,
      accuracy,
      recorded_at: new Date().toISOString(),
    });

    this.recordHistory();
  }

  startAutoBroadcast(intervalMs: number = AUTO_BROADCAST_INTERVAL_MS): void {
    this.stopAutoBroadcast();
    this.broadcastTimer = setInterval(() => {
      this.broadcast().catch(() => {});
    }, intervalMs);
  }

  stopAutoBroadcast(): void {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
  }

  isAutoBroadcasting(): boolean {
    return this.broadcastTimer !== null;
  }

  // Route playback

  loadRoute(waypoints: RouteWaypoint[]): void {
    this.stopPlayback();
    this.route = waypoints;
    this.routeIndex = 0;
    this.routePlaying = false;
  }

  getRoute(): RouteWaypoint[] | null {
    return this.route ? [...this.route] : null;
  }

  startPlayback(speedMultiplier: number = 1): void {
    if (!this.route || this.route.length < 2) return;
    this.routeSpeed = speedMultiplier;
    this.routePlaying = true;
    this.playbackStartTime = Date.now() - this.playbackElapsed;

    this.routeTimer = setInterval(() => {
      this.advancePlayback();
    }, 100);
  }

  pausePlayback(): void {
    this.routePlaying = false;
    this.playbackElapsed = Date.now() - this.playbackStartTime;
    if (this.routeTimer) {
      clearInterval(this.routeTimer);
      this.routeTimer = null;
    }
  }

  stopPlayback(): void {
    this.routePlaying = false;
    this.routeIndex = 0;
    this.playbackElapsed = 0;
    if (this.routeTimer) {
      clearInterval(this.routeTimer);
      this.routeTimer = null;
    }
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }
  }

  stepForward(): void {
    if (!this.route) return;
    this.routeIndex = Math.min(this.routeIndex + 1, this.route.length - 1);
    this.applyWaypoint(this.routeIndex);
  }

  stepBackward(): void {
    if (!this.route) return;
    this.routeIndex = Math.max(this.routeIndex - 1, 0);
    this.applyWaypoint(this.routeIndex);
  }

  getPlaybackState(): PlaybackState {
    const total = this.route?.length ?? 0;
    return {
      playing: this.routePlaying,
      currentIndex: this.routeIndex,
      totalWaypoints: total,
      speedMultiplier: this.routeSpeed,
      percent: total > 0 ? (this.routeIndex / (total - 1)) * 100 : 0,
    };
  }

  private advancePlayback(): void {
    if (!this.route || !this.routePlaying) return;

    const wp = this.route[this.routeIndex];
    if (wp.dwellTimeMs && wp.dwellTimeMs > 0) {
      if (!this.dwellTimer) {
        this.routePlaying = false;
        this.dwellTimer = setTimeout(() => {
          this.dwellTimer = null;
          this.routeIndex++;
          if (this.routeIndex >= this.route!.length) {
            this.stopPlayback();
            return;
          }
          this.routePlaying = true;
          this.applyWaypoint(this.routeIndex);
        }, wp.dwellTimeMs / this.routeSpeed);
      }
      return;
    }

    if (this.routeIndex >= this.route.length - 1) {
      this.stopPlayback();
      return;
    }

    const nextIndex = this.routeIndex + 1;
    const current = this.route[this.routeIndex];
    const next = this.route[nextIndex];

    const distance = this.haversine(current.lat, current.lng, next.lat, next.lng);
    const speed = (wp.speed ?? 8) * this.routeSpeed;
    const intervalMs = 100;
    const metersPerTick = speed * (intervalMs / 1000);

    if (distance <= metersPerTick * 2) {
      this.routeIndex = nextIndex;
      this.applyWaypoint(nextIndex);
    } else {
      const fraction = metersPerTick / distance;
      const newLat = current.lat + (next.lat - current.lat) * fraction;
      const newLng = current.lng + (next.lng - current.lng) * fraction;
      const heading = this.calcHeading(current.lat, current.lng, next.lat, next.lng);
      this.setPosition(newLat, newLng, wp.speed ?? 8, heading);
    }
  }

  private applyWaypoint(index: number): void {
    if (!this.route) return;
    const wp = this.route[index];
    const heading = index < this.route.length - 1
      ? this.calcHeading(wp.lat, wp.lng, this.route[index + 1].lat, this.route[index + 1].lng)
      : this.position.heading;
    this.setPosition(wp.lat, wp.lng, wp.speed ?? 0, heading);
  }

  // GPS simulation

  enableGpsNoise(maxMeters: number = 50): void {
    this.gpsNoiseEnabled = true;
    this.gpsNoiseMaxMeters = maxMeters;
  }

  disableGpsNoise(): void {
    this.gpsNoiseEnabled = false;
  }

  isGpsNoiseEnabled(): boolean {
    return this.gpsNoiseEnabled;
  }

  enableUndergroundMode(): void {
    this.undergroundModeEnabled = true;
  }

  disableUndergroundMode(): void {
    this.undergroundModeEnabled = false;
  }

  isUndergroundModeEnabled(): boolean {
    return this.undergroundModeEnabled;
  }

  // Cleanup

  destroy(): void {
    this.stopAutoBroadcast();
    this.stopPlayback();
  }

  private recordHistory(): void {
    this.positionHistory.push({ ...this.position });
    if (this.positionHistory.length > this.maxHistoryLength) {
      this.positionHistory = this.positionHistory.slice(-this.maxHistoryLength);
    }
  }

  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calcHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
}
