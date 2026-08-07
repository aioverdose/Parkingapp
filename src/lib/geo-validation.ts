export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidCoords(latitude: unknown, longitude: unknown): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}

export function isValidSpeed(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 200
  );
}

export function isValidAccuracy(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return (
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 5000
  );
}

export function isValidHeading(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 360;
}
