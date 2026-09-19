export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function windowOverlapMinutes(arrivalStart: string, arrivalEnd: string, departureStart: string, departureEnd: string): number {
  const start = Math.max(timeToMinutes(arrivalStart), timeToMinutes(departureStart));
  const end = Math.min(timeToMinutes(arrivalEnd), timeToMinutes(departureEnd));
  return Math.max(0, end - start);
}

export function windowsAreCompatible(arriving: { window_start: string; window_end: string }, departing: { window_start: string; window_end: string }, minimumMinutes: number): boolean {
  return windowOverlapMinutes(arriving.window_start, arriving.window_end, departing.window_start, departing.window_end) >= minimumMinutes;
}
