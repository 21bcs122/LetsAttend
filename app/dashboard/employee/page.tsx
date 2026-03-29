import Link from "next/link";
import { EmployeeAssignmentBanner } from "@/components/client/employee-assignment-banner";
import { EmployeeCheckInPanel } from "@/components/client/employee-check-in-panel";
import { EmployeeCheckOutPanel } from "@/components/client/employee-check-out-panel";
import { EmployeeSiteSwitchPanel } from "@/components/client/employee-site-switch-panel";
import { LiveTrackingToggle } from "@/components/client/live-tracking-toggle";
import { Button } from "@/components/ui/button";

export default function EmployeeDashboardPage() {
  return (
    <div className="p-3 sm:p-6 md:p-8">
      <EmployeeAssignmentBanner />
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Work</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <strong className="font-medium text-zinc-700 dark:text-zinc-300">Already checked in?</strong> You
          can’t check in again — use{" "}
          <a href="#employee-site-switch" className="text-cyan-600 underline dark:text-cyan-400">
            Site switch
          </a>{" "}
          to move to another assigned location the same day (GPS + new selfie, no check-out). Then check
          out when you leave. Use <strong>Overtime</strong> for requests and approved overtime attendance, and{" "}
          <strong>Calendar</strong> for history.
        </p>
      </div>

      <div className="mx-auto mb-6 flex max-w-2xl flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <a href="#employee-check-in">Check in</a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href="#employee-site-switch">Site switch</a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href="#employee-check-out">Check out</a>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/employee/overtime">Overtime</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/employee/friend">Friend check-in</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/employee/assigned">Assigned</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/employee/calendar">Calendar</Link>
        </Button>
      </div>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 md:gap-6">
        <EmployeeCheckInPanel />
        <EmployeeSiteSwitchPanel />
        <EmployeeCheckOutPanel />
        <LiveTrackingToggle />
      </div>
    </div>
  );
}
