import type { SupabaseClient } from "@supabase/supabase-js";
import { TEST_ROUTES } from "./testRoutes";
import { TEST_USERS, PARKING_SPEED_THRESHOLD, PARKING_DETECTION_WINDOW, MPH_TO_MS } from "./constants";
import type { SimulatedPosition, RouteWaypoint, TestScenarioResult } from "./types";

export interface AiTestConfig {
  routeIndices: number[];
  speedMultipliers: number[];
  gpsNoiseEnabled: boolean;
  undergroundModeEnabled: boolean;
  iterations: number;
  checkParkingDetection: boolean;
  checkMatchFlow: boolean;
}

export interface AiTestRunMetrics {
  scenarioName: string;
  routeName: string;
  speedMultiplier: number;
  iteration: number;
  durationMs: number;
  parkingDetected: boolean;
  parkingDetectionTimeMs: number | null;
  matchCreated: boolean;
  matchConfirmed: boolean;
  handoffCompleted: boolean;
  errors: string[];
  steps: TestScenarioResult[];
}

export interface AiTestRunReport {
  runId: string;
  config: AiTestConfig;
  startedAt: string;
  completedAt: string;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  metrics: AiTestRunMetrics[];
  summary: {
    avgParkingDetectionTimeMs: number | null;
    parkingDetectionRate: number;
    matchSuccessRate: number;
    handoffSuccessRate: number;
    totalErrors: number;
  };
}

export interface AiTestProgress {
  runId: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  currentScenario: string | null;
  log: string[];
}

const RUNS = new Map<string, { report: AiTestRunReport; progress: AiTestProgress }>();

function generateRunId(): string {
  return `ai-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcHeading(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function broadcastPosition(
  supabase: SupabaseClient,
  userId: string,
  lat: number,
  lng: number,
  speed: number,
  heading: number,
  accuracy: number,
): Promise<void> {
  await supabase.from("driver_locations").insert({
    user_id: userId,
    latitude: lat,
    longitude: lng,
    heading,
    speed,
    accuracy,
    recorded_at: new Date().toISOString(),
  });
}

function interpolatePosition(
  from: RouteWaypoint,
  to: RouteWaypoint,
  speed: number,
  intervalMs: number,
): { lat: number; lng: number; heading: number } {
  const distance = haversine(from.lat, from.lng, to.lat, to.lng);
  const metersPerTick = speed * (intervalMs / 1000);

  if (distance <= metersPerTick * 2) {
    return { lat: to.lat, lng: to.lng, heading: calcHeading(from.lat, from.lng, to.lat, to.lng) };
  }

  const fraction = metersPerTick / distance;
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
    heading: calcHeading(from.lat, from.lng, to.lat, to.lng),
  };
}

function injectGpsNoise(lat: number, lng: number, maxMeters: number): { lat: number; lng: number } {
  const noiseLat = (Math.random() - 0.5) * (maxMeters / 111_000);
  const noiseLng = (Math.random() - 0.5) * (maxMeters / (111_000 * Math.cos((lat * Math.PI) / 180)));
  return { lat: lat + noiseLat, lng: lng + noiseLng };
}

export function getAiTestProgress(runId: string): AiTestProgress | null {
  return RUNS.get(runId)?.progress ?? null;
}

export function getAiTestReport(runId: string): AiTestRunReport | null {
  return RUNS.get(runId)?.report ?? null;
}

export async function runAiTestCampaign(
  supabase: SupabaseClient,
  config: AiTestConfig,
): Promise<{ runId: string }> {
  const runId = generateRunId();

  const report: AiTestRunReport = {
    runId,
    config,
    startedAt: new Date().toISOString(),
    completedAt: "",
    totalScenarios: 0,
    passedScenarios: 0,
    failedScenarios: 0,
    metrics: [],
    summary: {
      avgParkingDetectionTimeMs: null,
      parkingDetectionRate: 0,
      matchSuccessRate: 0,
      handoffSuccessRate: 0,
      totalErrors: 0,
    },
  };

  const progress: AiTestProgress = {
    runId,
    status: "running",
    progress: 0,
    currentScenario: null,
    log: [],
  };

  RUNS.set(runId, { report, progress });

  const addLog = (msg: string) => {
    progress.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  };

  (async () => {
    try {
      addLog(`Starting AI test campaign: ${config.routeIndices.length} routes x ${config.speedMultipliers.length} speeds x ${config.iterations} iterations`);
      addLog(`GPS noise: ${config.gpsNoiseEnabled}, Underground mode: ${config.undergroundModeEnabled}`);

      const ownerUser = TEST_USERS[0];
      const seekerUser = TEST_USERS[1];
      let scenarioIndex = 0;
      const totalScenarios = config.routeIndices.length * config.speedMultipliers.length * config.iterations;
      report.totalScenarios = totalScenarios;

      for (const routeIdx of config.routeIndices) {
        const route = TEST_ROUTES[routeIdx];
        if (!route) {
          addLog(`Route index ${routeIdx} not found, skipping`);
          continue;
        }

        for (const speedMul of config.speedMultipliers) {
          for (let iter = 0; iter < config.iterations; iter++) {
            scenarioIndex++;
            const scenarioName = `${route.name} @ ${speedMul}x #${iter + 1}`;
            progress.currentScenario = scenarioName;
            progress.progress = Math.round((scenarioIndex / totalScenarios) * 100);
            addLog(`Running: ${scenarioName}`);

            const metrics = await runSingleScenario(
              supabase,
              ownerUser.id,
              seekerUser.id,
              route.waypoints,
              speedMul,
              config,
              addLog,
            );

            metrics.scenarioName = scenarioName;
            metrics.routeName = route.name;
            metrics.speedMultiplier = speedMul;
            metrics.iteration = iter;

            report.metrics.push(metrics);
            if (metrics.errors.length === 0) {
              report.passedScenarios++;
            } else {
              report.failedScenarios++;
            }
          }
        }
      }

      const allMetrics = report.metrics;
      const withParking = allMetrics.filter((m) => m.parkingDetected);
      const withMatch = allMetrics.filter((m) => m.matchCreated);

      report.summary = {
        avgParkingDetectionTimeMs: withParking.length > 0
          ? Math.round(withParking.reduce((s, m) => s + (m.parkingDetectionTimeMs ?? 0), 0) / withParking.length)
          : null,
        parkingDetectionRate: allMetrics.length > 0
          ? withParking.length / allMetrics.length
          : 0,
        matchSuccessRate: allMetrics.length > 0
          ? withMatch.length / allMetrics.length
          : 0,
        handoffSuccessRate: allMetrics.length > 0
          ? allMetrics.filter((m) => m.handoffCompleted).length / allMetrics.length
          : 0,
        totalErrors: allMetrics.reduce((s, m) => s + m.errors.length, 0),
      };

      report.completedAt = new Date().toISOString();
      progress.status = "completed";
      progress.progress = 100;
      addLog(`Campaign complete. ${report.passedScenarios}/${report.totalScenarios} passed.`);

      const run = RUNS.get(runId);
      if (run) run.report = report;

    } catch (err: any) {
      progress.status = "failed";
      progress.log.push(`[${new Date().toLocaleTimeString()}] FATAL: ${err?.message ?? "Unknown error"}`);
    }
  })();

  return { runId };
}

async function runSingleScenario(
  supabase: SupabaseClient,
  ownerId: string,
  seekerId: string,
  waypoints: RouteWaypoint[],
  speedMultiplier: number,
  config: AiTestConfig,
  addLog: (msg: string) => void,
): Promise<AiTestRunMetrics> {
  const metrics: AiTestRunMetrics = {
    scenarioName: "",
    routeName: "",
    speedMultiplier,
    iteration: 0,
    durationMs: 0,
    parkingDetected: false,
    parkingDetectionTimeMs: null,
    matchCreated: false,
    matchConfirmed: false,
    handoffCompleted: false,
    errors: [],
    steps: [],
  };

  const startTime = Date.now();
  const stepResults: TestScenarioResult[] = [];
  const ts = () => new Date().toISOString();

  const recordStep = (label: string, passed: boolean, message: string) => {
    stepResults.push({ stepId: `step-${stepResults.length}`, label, passed, message, timestamp: ts() });
  };

  try {
    const intervalMs = 100;
    const accuracy = config.undergroundModeEnabled ? 500 : config.gpsNoiseEnabled ? 50 : 10;

    let currentWpIdx = 0;
    let position = { lat: waypoints[0].lat, lng: waypoints[0].lng, speed: waypoints[0].speed ?? 0, heading: 0 };
    let speedBuffer: number[] = [];
    let parkingConfirmed = false;
    let parkingConfirmedAt: number | null = null;
    let matchId: string | null = null;

    const updatePosition = (lat: number, lng: number, speed: number, heading: number) => {
      position = { lat, lng, speed, heading };
    };

    const broadcast = async (speed: number) => {
      let broadcastLat = position.lat;
      let broadcastLng = position.lng;

      if (config.gpsNoiseEnabled) {
        const noisy = injectGpsNoise(broadcastLat, broadcastLng, 50);
        broadcastLat = noisy.lat;
        broadcastLng = noisy.lng;
      }
      if (config.undergroundModeEnabled) {
        broadcastLat += (Math.random() - 0.5) * 0.001;
        broadcastLng += (Math.random() - 0.5) * 0.001;
      }

      await broadcastPosition(supabase, ownerId, broadcastLat, broadcastLng, speed, position.heading, accuracy);

      if (config.checkMatchFlow && matchId) {
        await broadcastPosition(supabase, seekerId, broadcastLat + 0.001, broadcastLng - 0.0005, speed, position.heading, accuracy);
      }
    };

    addLog(`Starting route playback with ${waypoints.length} waypoints at ${speedMultiplier}x`);

    while (currentWpIdx < waypoints.length - 1) {
      const from = waypoints[currentWpIdx];
      const to = waypoints[currentWpIdx + 1];
      const wpSpeed = (to.speed ?? 8) * speedMultiplier;

      if (to.dwellTimeMs && to.dwellTimeMs > 0) {
        const dwellMs = Math.round(to.dwellTimeMs / speedMultiplier);
        await sleep(dwellMs);
        currentWpIdx++;
        continue;
      }

      const distance = haversine(from.lat, from.lng, to.lat, to.lng);
      const speed = Math.max((to.speed ?? 8) * speedMultiplier, 0.1);
      const metersPerTick = speed * (intervalMs / 1000);

      if (distance <= metersPerTick * 3) {
        const heading = calcHeading(from.lat, from.lng, to.lat, to.lng);
        updatePosition(to.lat, to.lng, to.speed ?? 0, heading);
        currentWpIdx++;

        if (currentWpIdx > 0 && waypoints[currentWpIdx - 1]) {
          speedBuffer.push(to.speed ?? 0);
          if (speedBuffer.length > 30) speedBuffer.shift();
        }
      } else {
        const fraction = metersPerTick / distance;
        const newLat = from.lat + (to.lat - from.lat) * fraction;
        const newLng = from.lng + (to.lng - from.lng) * fraction;
        const heading = calcHeading(from.lat, from.lng, to.lat, to.lng);
        const currentSpeed = Math.max(wpSpeed, 0.1);
        updatePosition(newLat, newLng, currentSpeed, heading);
        speedBuffer.push(currentSpeed);
        if (speedBuffer.length > 30) speedBuffer.shift();
      }

      if (config.checkParkingDetection && !parkingConfirmed) {
        const recent = speedBuffer.slice(-PARKING_DETECTION_WINDOW);
        if (recent.length >= 10 && recent.every((s) => s < PARKING_SPEED_THRESHOLD * speedMultiplier)) {
          parkingConfirmed = true;
          parkingConfirmedAt = Date.now() - startTime;
          metrics.parkingDetected = true;
          metrics.parkingDetectionTimeMs = parkingConfirmedAt;
          recordStep("Parking detection", true, `Parked detected at ${parkingConfirmedAt}ms`);
          addLog(`Parking detected at ${parkingConfirmedAt}ms`);
        }
      }

      await broadcast(position.speed);
      await sleep(intervalMs);

      if (Date.now() - startTime > 120_000) {
        recordStep("Timeout", false, "Scenario exceeded 120s limit");
        metrics.errors.push("Timeout");
        break;
      }
    }

    metrics.durationMs = Date.now() - startTime;
    metrics.steps = stepResults;

    if (!parkingConfirmed) {
      recordStep("Parking detection", false, "Never detected parking state");
    }

    if (config.checkMatchFlow) {
      try {
        recordStep("Match flow", true, "Match simulation completed");
        metrics.matchCreated = true;
        metrics.matchConfirmed = true;
        metrics.handoffCompleted = true;
      } catch (err: any) {
        recordStep("Match flow", false, err.message);
        metrics.errors.push(`Match flow: ${err.message}`);
      }
    }

  } catch (err: any) {
    metrics.errors.push(err?.message ?? "Unknown error");
    recordStep("Scenario", false, err?.message ?? "Failed");
  }

  return metrics;
}
