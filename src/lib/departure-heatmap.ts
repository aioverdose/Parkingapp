export type DepartureSource = {
  latitude: number;
  longitude: number;
  contributorId: string;
};

export type DepartureCell = {
  lat: number;
  lng: number;
  score: number;
  level: "low" | "medium" | "high";
  contributorsBand: "3-5" | "6-10" | "11+";
};

const GRID_DEGREES = 0.003;
const MIN_CONTRIBUTORS = 3;

function bandFor(count: number): DepartureCell["contributorsBand"] {
  if (count >= 11) return "11+";
  if (count >= 6) return "6-10";
  return "3-5";
}

/** Bins source points without exposing source coordinates or exact contributor counts. */
export function aggregateDepartureCells(sources: DepartureSource[]): DepartureCell[] {
  const bins = new Map<string, { lat: number; lng: number; contributors: Set<string> }>();

  for (const source of sources) {
    if (!Number.isFinite(source.latitude) || !Number.isFinite(source.longitude) || !source.contributorId) continue;
    const lat = Math.round(source.latitude / GRID_DEGREES) * GRID_DEGREES;
    const lng = Math.round(source.longitude / GRID_DEGREES) * GRID_DEGREES;
    const key = `${lat.toFixed(3)}:${lng.toFixed(3)}`;
    const bin = bins.get(key) ?? { lat, lng, contributors: new Set<string>() };
    bin.contributors.add(source.contributorId);
    bins.set(key, bin);
  }

  const eligible = [...bins.values()].filter((bin) => bin.contributors.size >= MIN_CONTRIBUTORS);
  const maxContributors = Math.max(0, ...eligible.map((bin) => bin.contributors.size));
  return eligible.map((bin) => {
    const score = maxContributors ? Number((bin.contributors.size / maxContributors).toFixed(3)) : 0;
    return {
      lat: Number(bin.lat.toFixed(3)),
      lng: Number(bin.lng.toFixed(3)),
      score,
      level: score >= 0.67 ? "high" : score >= 0.34 ? "medium" : "low",
      contributorsBand: bandFor(bin.contributors.size),
    };
  });
}
