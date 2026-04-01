"use client";

import * as React from "react";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { useDashboardUser } from "@/components/client/dashboard-user-context";
import { calendarDateKeyInTimeZone } from "@/lib/date/calendar-day-key";
import { normalizeTimeZoneId } from "@/lib/date/time-zone";
import { EmployeeCheckInPanel } from "@/components/client/employee-check-in-panel";
import { EmployeeSiteSwitchPanel } from "@/components/client/employee-site-switch-panel";
import { EmployeeCheckOutPanel } from "@/components/client/employee-check-out-panel";
import { LiveTrackingToggle } from "@/components/client/live-tracking-toggle";

type TodayResponse = {
  checkIn: { atMs: number | null } | null;
  checkOut: { atMs: number | null } | null;
  error?: string;
};

export function EmployeeWorkPanels() {
  const { user } = useDashboardUser();
  const tz = normalizeTimeZoneId(user?.timeZone);
  const [hasOpenSession, setHasOpenSession] = React.useState(false);

  const refreshState = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (!u) {
      setHasOpenSession(false);
      return;
    }
    const token = await u.getIdToken();
    const day = calendarDateKeyInTimeZone(new Date(), tz);
    const res = await fetch(`/api/attendance/today?day=${encodeURIComponent(day)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as TodayResponse;
    if (!res.ok) {
      setHasOpenSession(false);
      return;
    }
    setHasOpenSession(!!data.checkIn && !data.checkOut);
  }, [tz]);

  React.useEffect(() => {
    void refreshState();
    const t = window.setInterval(() => void refreshState(), 45_000);
    const onAttendanceUpdated = () => {
      void refreshState();
    };
    window.addEventListener("attendance-updated", onAttendanceUpdated);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("attendance-updated", onAttendanceUpdated);
    };
  }, [refreshState]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 md:gap-6">
      <EmployeeCheckInPanel />
      {hasOpenSession ? <EmployeeSiteSwitchPanel /> : null}
      {hasOpenSession ? <EmployeeCheckOutPanel /> : null}
      <LiveTrackingToggle />
    </div>
  );
}
