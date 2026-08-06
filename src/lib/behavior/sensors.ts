import type {
  GpsSample,
  MotionFeatures,
  MotionPermissionState,
} from "./types";

const MOTION_BUFFER_SIZE = 40;
const STEP_THRESHOLD_MPS2 = 9.5;
const STEP_WINDOW_MS = 2000;

export function isMotionSensorSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "DeviceMotionEvent" in window;
}

export function hasMotionPermissionApi(): boolean {
  if (typeof window === "undefined") return false;
  const dme = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  return !!dme && typeof dme.requestPermission === "function";
}

export async function requestMotionPermission(): Promise<MotionPermissionState> {
  if (!isMotionSensorSupported()) return "unknown";

  if (hasMotionPermissionApi()) {
    try {
      const result = await (window as unknown as { DeviceMotionEvent: { requestPermission: () => Promise<string> } }).DeviceMotionEvent.requestPermission();
      if (result === "granted") return "granted";
      if (result === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  const permissions = (navigator as unknown as { permissions?: Permissions }).permissions;
  if (permissions?.query) {
    try {
      const status = await permissions.query({ name: "accelerometer" as PermissionName });
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  return "granted";
}

function accelerationMagnitude(event: DeviceMotionEvent): { highPassed: number; gravityIncluded: number } {
  const linear = event.acceleration;
  const withGravity = event.accelerationIncludingGravity;
  const a = (v: number | null | undefined) => v ?? 0;
  const magnitude = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);
  const highPassed = linear ? magnitude(a(linear.x), a(linear.y), a(linear.z)) : 0;
  const gravityIncluded = withGravity ? magnitude(a(withGravity.x), a(withGravity.y), a(withGravity.z)) : 0;
  return { highPassed, gravityIncluded };
}

export class MotionFeatureExtractor {
  private magnitudes: number[] = [];
  private peaks: number[] = [];
  private previousMagnitude = 0;
  private rising = false;
  private peakWindowStart = 0;
  private peakCount = 0;

  add(event: DeviceMotionEvent): MotionFeatures {
    const { highPassed, gravityIncluded } = accelerationMagnitude(event);
    const magnitude = highPassed > 0 ? highPassed : gravityIncluded;

    this.magnitudes.push(magnitude);
    if (this.magnitudes.length > MOTION_BUFFER_SIZE) {
      this.magnitudes.shift();
    }

    const now = Date.now();

    if (now - this.peakWindowStart > STEP_WINDOW_MS) {
      this.peakWindowStart = now;
      this.peakCount = 0;
    }

    if (magnitude >= STEP_THRESHOLD_MPS2 && !this.rising) {
      this.rising = true;
      this.peaks.push(now);
      if (this.peaks.length > 20) this.peaks.shift();
      this.peakCount++;
    } else if (magnitude < STEP_THRESHOLD_MPS2 * 0.5 && this.rising) {
      this.rising = false;
    }

    this.previousMagnitude = magnitude;

    const vibrationEnergy = this.magnitudes.length > 0
      ? Math.sqrt(this.magnitudes.reduce((sum, m) => sum + m * m, 0) / this.magnitudes.length)
      : 0;

    const recentPeaks = this.peaks.filter((p) => now - p <= STEP_WINDOW_MS);

    return {
      timestamp: now,
      vibrationEnergy,
      stepCadence: recentPeaks.length / (STEP_WINDOW_MS / 1000),
      hasMotion: true,
    };
  }

  reset(): void {
    this.magnitudes = [];
    this.peaks = [];
    this.previousMagnitude = 0;
    this.rising = false;
    this.peakWindowStart = 0;
    this.peakCount = 0;
  }
}

export class GpsSensor {
  private watchId: number | null = null;
  private running = false;

  constructor(
    private readonly onSample: (sample: GpsSample) => void,
    private readonly onError?: (error: GeolocationPositionError) => void,
  ) {}

  start(): void {
    if (typeof navigator === "undefined" || !navigator.geolocation || this.running) return;
    this.running = true;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        this.onSample({
          lat: latitude,
          lng: longitude,
          speedMs: speed != null ? speed : null,
          heading: heading != null ? heading : null,
          accuracy: accuracy != null ? accuracy : null,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        this.onError?.(error);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  }

  stop(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}

export class MotionSensor {
  private running = false;
  private handler: ((event: DeviceMotionEvent) => void) | null = null;
  private readonly extractor = new MotionFeatureExtractor();

  constructor(private readonly onFeatures: (features: MotionFeatures) => void) {}

  start(): void {
    if (typeof window === "undefined" || !isMotionSensorSupported() || this.running) return;
    this.running = true;
    this.handler = (event) => {
      this.onFeatures(this.extractor.add(event));
    };
    window.addEventListener("devicemotion", this.handler as EventListener);
  }

  stop(): void {
    if (this.handler && typeof window !== "undefined") {
      window.removeEventListener("devicemotion", this.handler as EventListener);
    }
    this.handler = null;
    this.running = false;
    this.extractor.reset();
  }

  isRunning(): boolean {
    return this.running;
  }
}
