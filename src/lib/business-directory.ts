export const BELMONT_SHORE_BOUNDS = {
  south: 33.757,
  west: -118.141,
  north: 33.764,
  east: -118.129,
} as const;

export function normalizeBusinessName(value: string): string {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function isInBelmontShoreBounds(latitude: number, longitude: number): boolean {
  return latitude >= BELMONT_SHORE_BOUNDS.south
    && latitude <= BELMONT_SHORE_BOUNDS.north
    && longitude >= BELMONT_SHORE_BOUNDS.west
    && longitude <= BELMONT_SHORE_BOUNDS.east;
}

export function directoryConfidence(tags: Record<string, string>): number {
  if (tags["addr:street"]?.toLowerCase().includes("2nd") || tags["addr:street"]?.toLowerCase().includes("second")) return 0.95;
  if (tags.amenity || tags.shop || tags.tourism || tags.office) return 0.8;
  return 0.65;
}
