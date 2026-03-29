import { EmployeeOvertimeRequestPanel } from "@/components/client/employee-overtime-request-panel";

export default function EmployeeOvertimePage() {
  return (
    <div className="p-3 sm:p-6 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Overtime</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Request overtime and record approved overtime check-in and check-out here. Admin review lives under{" "}
          <strong className="text-zinc-300">Admin → Overtime</strong> (separate from this page).
        </p>
      </div>
      <div className="mx-auto max-w-2xl">
        <EmployeeOvertimeRequestPanel />
      </div>
    </div>
  );
}
