"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBrowserTimeZone, workTimeZoneUiLabel } from "@/lib/date/time-zone";
import { WALL_TIME_DISPLAY_LOCALE } from "@/lib/time/format-wall-time";
import { DateTime } from "luxon";
import { useCalendarMode } from "@/components/client/calendar-mode-context";
import { formatIsoForCalendar } from "@/lib/date/bs-calendar";

/**
 * Live clock for the device’s time zone: full date + hours, minutes, seconds (12-hour AM/PM).
 */
export function LocalTimezoneClock({ className }: { className?: string }) {
  const [mounted, setMounted] = React.useState(false);
  const tz = React.useMemo(() => (mounted ? getBrowserTimeZone() : "UTC"), [mounted]);
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  const { mode } = useCalendarMode();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mounted]);

  const zoneAbbrev = workTimeZoneUiLabel(tz);

  if (!mounted) {
    return (
      <div
        className={cn(
          "glass-panel mx-auto h-[188px] w-full max-w-lg animate-pulse rounded-2xl border border-zinc-200/80 dark:border-white/10",
          className
        )}
        aria-hidden
      />
    );
  }

  let dateStr = "";
  if (mode === "bs") {
    const iso = DateTime.fromMillis(nowMs).setZone(tz).toISODate();
    if (iso) dateStr = formatIsoForCalendar(iso, "bs", tz);
  }
  
  if (!dateStr) {
    dateStr = new Date(nowMs).toLocaleDateString(WALL_TIME_DISPLAY_LOCALE, {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const timeStr = new Date(nowMs).toLocaleTimeString(WALL_TIME_DISPLAY_LOCALE, {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={cn(
        "glass-panel mx-auto w-full max-w-lg rounded-2xl border border-zinc-200/80 px-5 py-4 text-center shadow-[0_0_40px_-20px_rgba(139,92,246,0.35)] dark:border-white/10",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-violet-600 dark:text-cyan-400">
        <Clock className="size-3.5 shrink-0" aria-hidden />
        <span>Your local time</span>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{dateStr}</p>
      <p className="mt-1 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
        {timeStr}
      </p>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{zoneAbbrev}</span>
        <span className="mx-1.5 text-zinc-400">·</span>
        <span className="font-mono text-[11px] text-zinc-500">{tz}</span>
      </p>
    </div>
  );
}
