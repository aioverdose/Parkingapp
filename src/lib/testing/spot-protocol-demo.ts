export const SPOT_DEMO_STAGES = [
  { key: "destination", label: "Destination set", detail: "Arriving member is headed to 2nd Street", durationMs: 1800 },
  { key: "geofence", label: "Geofence entered", detail: "Member enters the Belmont Shore pilot area", durationMs: 1800 },
  { key: "searching", label: "Private network search", detail: "The app searches active network departures", durationMs: 1800 },
  { key: "offered", label: "One private offer", detail: "Exactly one eligible member receives the offer", durationMs: 1800 },
  { key: "accepted", label: "Offer accepted safely", detail: "The driver accepts before driving", durationMs: 1800 },
  { key: "approach", label: "Hands-free approach", detail: "Voice status and route progress continue without interaction", durationMs: 6000 },
  { key: "nearby", label: "Nearby verified", detail: "The arriving member reaches the handoff zone", durationMs: 1800 },
  { key: "owner_ready", label: "Owner ready", detail: "The departing member confirms while still parked", durationMs: 1800 },
  { key: "departed", label: "Departure complete", detail: "The owner pulls out and the handoff activates", durationMs: 1800 },
  { key: "complete", label: "SPOT handoff complete", detail: "The arriving member can take the space", durationMs: 1 },
] as const;

export function getSpotDemoStage(elapsedMs: number) {
  let elapsed = Math.max(0, elapsedMs);
  for (let index = 0; index < SPOT_DEMO_STAGES.length; index += 1) {
    const stage = SPOT_DEMO_STAGES[index];
    if (elapsed <= stage.durationMs || index === SPOT_DEMO_STAGES.length - 1) {
      return { stage, index, progress: Math.min(1, elapsed / stage.durationMs) };
    }
    elapsed -= stage.durationMs;
  }
  const stage = SPOT_DEMO_STAGES[SPOT_DEMO_STAGES.length - 1];
  return { stage, index: SPOT_DEMO_STAGES.length - 1, progress: 1 };
}
