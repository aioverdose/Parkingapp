export function distanceMeters(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const earthRadius = 6_371_000;
  const radians = Math.PI / 180;
  const dLat = (latitudeB - latitudeA) * radians;
  const dLng = (longitudeB - longitudeA) * radians;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitudeA * radians) * Math.cos(latitudeB * radians) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
