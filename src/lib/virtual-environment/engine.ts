import type { RouteWaypoint, SimulatedPosition } from "@/lib/testing/types";
import { PARKING_SPEED_THRESHOLD } from "@/lib/testing/constants";
import type {
  VenvAgentState,
  VenvTimelineEvent,
  VenvEnvironmentConfig,
  VenvRoute,
} from "./types";
import { AGENT_COLORS, AGENT_LABELS, DEFAULT_ENV_CONFIG } from "./types";

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

export class VirtualEnvironment {
  private agents: Map<string, VenvAgentState> = new Map();
  private timeline: VenvTimelineEvent[] = [];
  private config: VenvEnvironmentConfig = { ...DEFAULT_ENV_CONFIG };
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private simTime: number = 0;
  private running: boolean = false;
  private nextIdCounter: number = 0;
  private onUpdate: (() => void) | null = null;
  private onBroadcast: ((agent: VenvAgentState) => void) | null = null;
  private lastBroadcastTime: Map<string, number> = new Map();

  private generateId(): string {
    return `venv-${++this.nextIdCounter}`;
  }

  private generateUserId(): string {
    return `virtual-${crypto.randomUUID().slice(0, 8)}`;
  }

  private addTimelineEvent(
    agentId: string,
    agentLabel: string,
    type: VenvTimelineEvent["type"],
    message: string,
    lat: number,
    lng: number,
  ): void {
    this.timeline.push({
      id: this.generateId(),
      agentId,
      agentLabel,
      time: this.simTime,
      type,
      message,
      lat,
      lng,
    });
  }

  getTimeline(): VenvTimelineEvent[] {
    return [...this.timeline];
  }

  getTimelineForAgent(agentId: string): VenvTimelineEvent[] {
    return this.timeline.filter((e) => e.agentId === agentId);
  }

  getConfig(): VenvEnvironmentConfig {
    return { ...this.config };
  }

  updateConfig(partial: Partial<VenvEnvironmentConfig>): void {
    this.config = { ...this.config, ...partial };
    if (this.tickInterval && this.running) {
      this.stop();
      this.start(this.onUpdate!, this.onBroadcast!);
    }
  }

  spawnAgent(lat: number, lng: number, role: VenvAgentState["role"] = "owner", userId?: string): VenvAgentState {
    const agentCount = this.agents.size;
    const id = this.generateId();
    const uid = userId ?? this.generateUserId();
    const label = AGENT_LABELS[agentCount % AGENT_LABELS.length];
    const color = AGENT_COLORS[agentCount % AGENT_COLORS.length];

    const agent: VenvAgentState = {
      id,
      label,
      userId: uid,
      role,
      lat,
      lng,
      speed: 0,
      heading: 0,
      accuracy: 10,
      status: "parked",
      color,
      route: null,
      routeIndex: 0,
      routePlaying: false,
      routeSpeed: 1,
      parkedLocation: { lat, lng },
      notifications: [],
      broadcastCount: 0,
    };

    this.agents.set(id, agent);
    this.addTimelineEvent(id, label, "spawn", `Spawned as ${role}`, lat, lng);
    return agent;
  }

  removeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.addTimelineEvent(agentId, agent.label, "note", "Removed from environment", agent.lat, agent.lng);
      this.agents.delete(agentId);
      this.lastBroadcastTime.delete(agentId);
    }
  }

  getAgents(): VenvAgentState[] {
    return Array.from(this.agents.values());
  }

  getAgent(agentId: string): VenvAgentState | undefined {
    return this.agents.get(agentId);
  }

  setAgentPosition(agentId: string, lat: number, lng: number, speed?: number, heading?: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    agent.lat = lat;
    agent.lng = lng;
    if (speed !== undefined) agent.speed = speed;
    if (heading !== undefined) agent.heading = heading;

    const msSpeed = (speed ?? agent.speed) * 0.44704;
    const newStatus = msSpeed < PARKING_SPEED_THRESHOLD ? "parked" : "driving";
    if (newStatus !== agent.status) {
      agent.status = newStatus;
      if (newStatus === "parked") {
        agent.parkedLocation = { lat, lng };
        this.addTimelineEvent(agentId, agent.label, "park", "Parked", lat, lng);
      } else {
        this.addTimelineEvent(agentId, agent.label, "depart", "Departed", lat, lng);
      }
    }
  }

  loadRoute(agentId: string, waypoints: RouteWaypoint[]): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.route = waypoints;
    agent.routeIndex = 0;
    agent.routePlaying = false;
  }

  startRoute(agentId: string, speedMultiplier: number = 1): void {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.route || agent.route.length < 2) return;
    agent.routePlaying = true;
    agent.routeSpeed = speedMultiplier;
    this.addTimelineEvent(agentId, agent.label, "route_start", `Route started at ${speedMultiplier}x`, agent.lat, agent.lng);
  }

  stopRoute(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.routePlaying = false;
    agent.routeIndex = 0;
    this.addTimelineEvent(agentId, agent.label, "route_end", "Route stopped", agent.lat, agent.lng);
  }

  start(onUpdate: () => void, onBroadcast: (agent: VenvAgentState) => void): void {
    this.onUpdate = onUpdate;
    this.onBroadcast = onBroadcast;
    this.running = true;

    const intervalMs = Math.max(50, Math.round(100 / this.config.timeSpeedMultiplier));

    this.tickInterval = setInterval(() => {
      this.simTime += intervalMs;
      this.tick();
    }, intervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getSimTime(): number {
    return this.simTime;
  }

  reset(): void {
    this.stop();
    this.agents.clear();
    this.timeline = [];
    this.simTime = 0;
    this.nextIdCounter = 0;
    this.lastBroadcastTime.clear();
  }

  private tick(): void {
    for (const agent of this.agents.values()) {
      if (agent.routePlaying && agent.route) {
        this.advanceAgentOnRoute(agent);
      }

      if (this.config.autoBroadcast) {
        const last = this.lastBroadcastTime.get(agent.id) ?? 0;
        if (this.simTime - last >= this.config.broadcastIntervalMs) {
          this.lastBroadcastTime.set(agent.id, this.simTime);
          agent.broadcastCount++;
          this.onBroadcast?.(agent);
        }
      }
    }

    this.onUpdate?.();
  }

  private advanceAgentOnRoute(agent: VenvAgentState): void {
    const route = agent.route;
    if (!route || agent.routeIndex >= route.length - 1) {
      agent.routePlaying = false;
      this.addTimelineEvent(agent.id, agent.label, "route_end", "Route completed", agent.lat, agent.lng);
      return;
    }

    const from = route[agent.routeIndex];
    const to = route[agent.routeIndex + 1];
    const intervalMs = Math.max(50, Math.round(100 / this.config.timeSpeedMultiplier));

    if (to.dwellTimeMs && to.dwellTimeMs > 0) {
      const dwellPassed = this.simTime % (to.dwellTimeMs / this.config.timeSpeedMultiplier + 1000);
      if (dwellPassed > to.dwellTimeMs / this.config.timeSpeedMultiplier) {
        agent.routeIndex++;
        this.applyWaypoint(agent, agent.routeIndex);
      }
      return;
    }

    const distance = haversine(from.lat, from.lng, to.lat, to.lng);
    const speedMph = to.speed ?? 8;
    const speedMs = speedMph * 0.44704 * agent.routeSpeed;
    const metersPerTick = speedMs * (intervalMs / 1000);

    if (distance <= Math.max(metersPerTick * 3, 0.5)) {
      agent.routeIndex++;
      this.applyWaypoint(agent, agent.routeIndex);
    } else {
      const fraction = metersPerTick / distance;
      const newLat = from.lat + (to.lat - from.lat) * Math.min(fraction, 1);
      const newLng = from.lng + (to.lng - from.lng) * Math.min(fraction, 1);
      const heading = calcHeading(from.lat, from.lng, to.lat, to.lng);

      const mphSpeed = to.speed ?? 8;
      const gpsFactor = 1 + (Math.random() - 0.5) * this.config.gpsNoiseLevel;
      const noisyLat = this.config.undergroundMode
        ? newLat + (Math.random() - 0.5) * 0.001
        : newLat;
      const noisyLng = this.config.undergroundMode
        ? newLng + (Math.random() - 0.5) * 0.001
        : newLng;

      this.setAgentPosition(agent.id, noisyLat, noisyLng, mphSpeed * gpsFactor, heading);
    }
  }

  private applyWaypoint(agent: VenvAgentState, index: number): void {
    if (!agent.route || index >= agent.route.length) return;
    const wp = agent.route[index];
    const heading = index < agent.route.length - 1
      ? calcHeading(wp.lat, wp.lng, agent.route[index + 1].lat, agent.route[index + 1].lng)
      : agent.heading;
    this.setAgentPosition(agent.id, wp.lat, wp.lng, wp.speed ?? 0, heading);
  }

  generateAgentSimPositions(): SimulatedPosition[] {
    return Array.from(this.agents.values()).map((a) => ({
      lat: a.lat,
      lng: a.lng,
      speed: a.speed * 0.44704,
      heading: a.heading,
      accuracy: a.accuracy,
      timestamp: new Date().toISOString(),
    }));
  }

  toJSON(): string {
    return JSON.stringify({
      agents: Array.from(this.agents.values()),
      timeline: this.timeline,
      config: this.config,
      simTime: this.simTime,
    });
  }
}
