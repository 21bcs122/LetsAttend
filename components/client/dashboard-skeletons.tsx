"use client";

import { Skeleton } from "@/components/ui/skeleton";

/** Notifications list placeholder (bell dropdown). */
export function NotificationsListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-white/5 px-2 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="space-y-2 px-2 py-3">
          <Skeleton className="h-4 w-[85%] max-w-[14rem]" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[66%]" />
        </li>
      ))}
    </ul>
  );
}

/** Generic card block. */
export function CardBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

/** Table rows for admin lists. */
export function TableRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Stats grid (admin overview). */
export function StatsGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

/** Centered page spinner replacement. */
export function PageLoadingSkeleton({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      {label ? (
        <span className="sr-only">{label}</span>
      ) : null}
    </div>
  );
}
