import { from24hUtc } from "@/lib/time/utc-12h";

/** Stable AM/PM output (some locales default to 24h when using `undefined`). */
export const WALL_TIME_DISPLAY_LOCALE = "en-US";

export function formatInstantTime12hInZone(
  ms: number,
  timeZone: string,
  opts?: { withSeconds?: boolean; withTimeZoneName?: boolean }
): string {
  return new Date(ms).toLocaleTimeString(WALL_TIME_DISPLAY_LOCALE, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
    hour12: true,
    timeZoneName: opts?.withTimeZoneName ? "short" : undefined,
  });
}

export function formatInstantDateTime12hInZone(
  ms: number,
  timeZone: string,
  opts?: { withSeconds?: boolean; withTimeZoneName?: boolean }
): string {
  return new Date(ms).toLocaleString(WALL_TIME_DISPLAY_LOCALE, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
    hour12: true,
    timeZoneName: opts?.withTimeZoneName !== false ? "short" : undefined,
  });
}

/** Stored schedule `HH:mm` (24h) → e.g. `9:00 AM` for display. */
export function formatWallHm12h(hm: string): string {
  const t = hm.trim();
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(t)) return hm;
  const [ha, mb] = t.split(":");
  const h24 = Number(ha);
  const m = Number(mb);
  if (!Number.isFinite(h24) || !Number.isFinite(m) || h24 > 23 || m > 59) return hm;
  const padded = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const p = from24hUtc(padded);
  const mm = String(p.m).padStart(2, "0");
  return `${p.h12}:${mm} ${p.ap}`;
}

/** Device-local clock, 12-hour AM/PM (e.g. map “last updated”). */
export function formatInstantTime12hLocal(
  ms: number,
  opts?: { withSeconds?: boolean }
): string {
  return new Date(ms).toLocaleTimeString(WALL_TIME_DISPLAY_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    second: opts?.withSeconds ? "2-digit" : undefined,
    hour12: true,
  });
}
