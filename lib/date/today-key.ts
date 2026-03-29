export {
  calendarDateKeyInTimeZone,
  /** @deprecated Prefer {@link calendarDateKeyInTimeZone} with the user's IANA zone. */
  attendanceDayKeyUTC,
} from "./calendar-day-key";

/** Local calendar date YYYY-MM-DD (browser / device timezone). */
export function localCalendarDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Same calendar YYYY-MM-DD as the browser would show for `now`, using the
 * client's `Date.getTimezoneOffset()` value (minutes, same semantics as JS).
 * Used on the server so overtime check-in matches the work date the user picked.
 */
export function localCalendarDateKeyFromTimezoneOffset(
  timezoneOffsetMinutes: number,
  now = new Date()
): string {
  const t = now.getTime() - timezoneOffsetMinutes * 60 * 1000;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
