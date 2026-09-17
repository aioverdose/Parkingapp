export const APP_TIME_ZONE = "America/Los_Angeles";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  timeZoneName: "longOffset",
});

export function appDateKey(date = new Date()): string {
  return dateFormatter.format(date);
}

function appDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = dateFormatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function appOffsetMinutes(date: Date): number {
  const value = offsetFormatter.formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = value.match(/GMT([+-])(\d{2})(?::(\d{2}))?/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "+" ? minutes : -minutes;
}

export function nextAppOccurrence(time: string, days: number[], after = new Date()): Date {
  const [hour, minute] = time.split(":").map(Number);
  const start = appDateParts(after);

  for (let offset = 0; offset < 8; offset++) {
    const calendarDate = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    if (!days.includes(calendarDate.getUTCDay())) continue;

    const wallClock = Date.UTC(
      calendarDate.getUTCFullYear(),
      calendarDate.getUTCMonth(),
      calendarDate.getUTCDate(),
      hour,
      minute,
    );
    const candidate = new Date(wallClock - appOffsetMinutes(new Date(wallClock)) * 60_000);
    if (candidate.getTime() > after.getTime()) return candidate;
  }

  throw new Error("No future occurrence for schedule");
}
