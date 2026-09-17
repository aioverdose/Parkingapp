import { VEHICLE_TYPES } from "@/lib/vehicle-types";
import { isValidCoords } from "@/lib/geo-validation";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return date.toISOString().slice(0, 10) === value;
}

export function isValidTime(value: unknown): value is string { return typeof value === "string" && TIME_RE.test(value); }
export function isValidUuid(value: unknown): value is string { return typeof value === "string" && UUID_RE.test(value); }
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 100) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
}
export function isVehicleType(value: unknown): boolean { return typeof value === "string" && VEHICLE_TYPES.some((item) => item.value === value); }
export function isValidDays(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 7 && value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) && new Set(value).size === value.length;
}
export function validateScheduleFields(body: Record<string, unknown>, oneOff = false): string | null {
  if (!isValidCoords(body.latitude, body.longitude)) return "Valid latitude and longitude are required";
  if (typeof body.label !== "undefined" && (typeof body.label !== "string" || body.label.length > 120)) return "Label must be 120 characters or fewer";
  if (!isValidTime(oneOff ? body.arrival_time : body.departure_time) || !isValidTime(oneOff ? body.departure_time : body.return_time)) return "Valid 24-hour arrival and departure times are required";
  if (oneOff ? !isValidDate(body.schedule_date) : (body.start_date != null && !isValidDate(body.start_date))) return "Valid dates are required";
  if (!oneOff && body.end_date != null && !isValidDate(body.end_date)) return "Valid dates are required";
  if (!oneOff && body.start_date && body.end_date && String(body.start_date) > String(body.end_date)) return "End date must be on or after start date";
  if (!oneOff && !isValidDays(body.days_of_week ?? [1, 2, 3, 4, 5])) return "days_of_week must contain unique days from 0 to 6";
  if (body.timezone != null && !isValidTimezone(body.timezone)) return "Invalid timezone";
  if (body.vehicle_id != null && !isValidUuid(body.vehicle_id)) return "Invalid vehicle_id";
  if (body.saved_spot_id != null && !isValidUuid(body.saved_spot_id)) return "Invalid saved_spot_id";
  if (!oneOff && body.vehicle_type != null && !isVehicleType(body.vehicle_type)) return "Invalid vehicle type";
  return null;
}
