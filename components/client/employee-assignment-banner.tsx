"use client";

import { useDashboardUser } from "@/components/client/dashboard-user-context";

/**
 * Optional one-line hint — site assignment is secondary to daily work, not a dashboard hero.
 */
export function EmployeeAssignmentBanner() {
  const { user, loading } = useDashboardUser();
  if (loading || !user || user.role !== "employee") return null;

  const n = user.assignedSites?.length ?? 0;
  if (n > 0) {
    return (
      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400" role="status">
        Check-in must use one of your administrator-assigned sites ({n} site{n === 1 ? "" : "s"}). Switch
        and check-out follow your active session.
      </p>
    );
  }

  return (
    <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400" role="status">
      No sites assigned yet — you can check in at any work site. When your admin assigns sites, check-in
      will be limited to those locations.
    </p>
  );
}
