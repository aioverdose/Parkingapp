export const DEPARTURE_CATEGORIES = [
  "shift_end",
  "closing_time",
  "meal_turnover",
  "class_end",
  "street_sweeping",
  "event_end",
  "staff_departure",
  "other",
] as const;

export type DepartureCategory = (typeof DEPARTURE_CATEGORIES)[number];

export interface KnownDeparture {
  id: string;
  business_id: string;
  network_id: string | null;
  category: DepartureCategory;
  title: string | null;
  day_of_week: number[] | null;
  specific_date: string | null;
  start_time: string;
  end_time: string | null;
  lead_minutes: number | null;
  timezone: string;
  active: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_LABELS: Record<DepartureCategory, string> = {
  shift_end: "Shift end",
  closing_time: "Closing time",
  meal_turnover: "Meal turnover",
  class_end: "Class / appointment end",
  street_sweeping: "Street sweeping",
  event_end: "Event end",
  staff_departure: "Staff departure",
  other: "Other",
};

export function validateKnownDeparture(body: Record<string, unknown>, partial = false) {
  const errors: Record<string, string> = {};
  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const category = body.category;
  if ((!partial || has("category")) && (typeof category !== "string" || !DEPARTURE_CATEGORIES.includes(category as DepartureCategory))) {
    errors.category = "Choose a valid category";
  }
  if ((!partial || has("start_time")) && (typeof body.start_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.start_time))) {
    errors.start_time = "Start time is required";
  }
  if (has("end_time") && body.end_time !== null && (typeof body.end_time !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(body.end_time))) errors.end_time = "End time must be a time";
  if (has("title") && body.title !== null && (typeof body.title !== "string" || body.title.trim().length > 120)) errors.title = "Title must be 120 characters or fewer";
  if (has("notes") && body.notes !== null && (typeof body.notes !== "string" || body.notes.trim().length > 1000)) errors.notes = "Notes must be 1000 characters or fewer";
  if (has("lead_minutes") && body.lead_minutes !== null && (!Number.isInteger(body.lead_minutes) || (body.lead_minutes as number) < 0 || (body.lead_minutes as number) > 1440)) errors.lead_minutes = "Lead minutes must be between 0 and 1440";
  if (has("active") && typeof body.active !== "boolean") errors.active = "Active must be boolean";
  const days = body.day_of_week;
  if (has("day_of_week") && days !== null && (!Array.isArray(days) || days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))) errors.day_of_week = "Choose one or more weekdays";
  if (has("specific_date") && body.specific_date !== null && (typeof body.specific_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.specific_date))) errors.specific_date = "Date must be YYYY-MM-DD";
  if ((!partial || has("specific_date") || has("day_of_week")) && body.specific_date === null && (!Array.isArray(days) || days.length === 0)) errors.schedule = "Choose a one-off date or one or more weekdays";
  if (body.specific_date != null && Array.isArray(days) && days.length > 0) errors.schedule = "Use a one-off date or weekdays, not both";
  if (typeof body.start_time === "string" && typeof body.end_time === "string" && body.end_time < body.start_time) errors.end_time = "End time must be at or after start time";
  return errors;
}
