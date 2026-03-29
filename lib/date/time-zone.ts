import { DateTime, IANAZone } from "luxon";

/** Default for Nepal (NPT = UTC+5:45). Override per user via Firestore `users.timeZone` (IANA id). */
export const DEFAULT_ATTENDANCE_TIME_ZONE = "Asia/Kathmandu";

/** Returns a valid IANA zone id, or {@link DEFAULT_ATTENDANCE_TIME_ZONE}. */
export function normalizeTimeZoneId(raw: string | undefined | null): string {
  if (typeof raw !== "string") return DEFAULT_ATTENDANCE_TIME_ZONE;
  const z = raw.trim();
  if (!z) return DEFAULT_ATTENDANCE_TIME_ZONE;
  return IANAZone.isValidZone(z) ? z : DEFAULT_ATTENDANCE_TIME_ZONE;
}

/**
 * Client-only: browser/OS time zone (e.g. `Asia/Kolkata` in India, `Asia/Kathmandu` in Nepal).
 * Used to seed and sync `users.timeZone`.
 */
export function getBrowserTimeZone(): string {
  if (typeof Intl === "undefined") return DEFAULT_ATTENDANCE_TIME_ZONE;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return normalizeTimeZoneId(tz);
  } catch {
    return DEFAULT_ATTENDANCE_TIME_ZONE;
  }
}

/** Short label for common South Asian zones; otherwise a localized abbreviation (e.g. GMT+5:30). */
export function workTimeZoneUiLabel(tz: string): string {
  const z = normalizeTimeZoneId(tz);
  if (z === "Asia/Kathmandu") return "NPT";
  if (z === "Asia/Kolkata") return "IST";
  return DateTime.now().setZone(z).toFormat("ZZZZ");
}
