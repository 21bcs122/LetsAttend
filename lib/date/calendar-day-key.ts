import { DateTime } from "luxon";
import { normalizeTimeZoneId } from "@/lib/date/time-zone";

/**
 * Calendar date `YYYY-MM-DD` for the instant `now`, in the given IANA timezone
 * (e.g. `Asia/Kathmandu` for Nepal — not UTC).
 */
export function calendarDateKeyInTimeZone(now: Date, timeZone: string): string {
  const tz = normalizeTimeZoneId(timeZone);
  return DateTime.fromJSDate(now, { zone: "utc" }).setZone(tz).toFormat("yyyy-LL-dd");
}

/** Last `count` calendar days in `timeZone`, newest first (index 0 = today there). */
export function lastNCalendarDayKeysInTimeZone(
  count: number,
  timeZone: string,
  now = new Date()
): string[] {
  const tz = normalizeTimeZoneId(timeZone);
  const keys: string[] = [];
  const base = DateTime.fromJSDate(now, { zone: "utc" }).setZone(tz);
  for (let i = 0; i < count; i++) {
    keys.push(base.minus({ days: i }).toFormat("yyyy-LL-dd"));
  }
  return keys;
}

/**
 * Union of recent calendar days in several zones (covers Nepal vs UTC migration / mixed users).
 * Capped for Firestore `in` queries (max 10 values).
 */
export function recentAttendanceDayKeysForQuery(now = new Date(), maxKeys = 10): string[] {
  const nep = lastNCalendarDayKeysInTimeZone(8, "Asia/Kathmandu", now);
  const utc = lastNCalendarDayKeysInTimeZone(8, "UTC", now);
  const merged = [...new Set([...nep, ...utc])].sort((a, b) => b.localeCompare(a));
  return merged.slice(0, maxKeys);
}

/** @deprecated Use {@link calendarDateKeyInTimeZone} with an explicit zone. */
export function attendanceDayKeyUTC(d = new Date()): string {
  return calendarDateKeyInTimeZone(d, "UTC");
}
