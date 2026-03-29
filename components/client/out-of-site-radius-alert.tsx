"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  distanceM: number;
  radiusM: number;
  context?: "check-in" | "check-out" | "site-switch";
  /** Close overlay (clear error state in parent). */
  onDismiss: () => void;
  className?: string;
};

export function OutOfSiteRadiusAlert({
  distanceM,
  radiusM,
  context = "check-in",
  onDismiss,
  className,
}: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);

  const action =
    context === "check-out"
      ? "Move inside the site boundary, then try checking out again."
      : context === "site-switch"
        ? "Move inside the new site’s boundary, then try switching again."
        : "Move inside the site boundary, then try checking in again.";

  const core =
    context === "check-out"
      ? "Check-out must be performed from inside the same geofence."
      : context === "site-switch"
        ? "Site switch proof must be captured from inside the new site’s geofence."
        : "Check-in must be performed from inside the site geofence.";

  const modal = (
    <div
      className={cn(
        "fixed inset-0 z-[8000] flex items-center justify-center p-4 sm:p-6",
        "bg-black/75 backdrop-blur-md",
        className
      )}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="out-of-site-title"
        aria-describedby="out-of-site-desc"
        className={cn(
          "relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-red-500/50",
          "bg-gradient-to-b from-zinc-900/98 to-red-950/95 p-6 shadow-[0_0_60px_-12px_rgba(239,68,68,0.65)]",
          "ring-1 ring-red-400/25"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left sm:gap-5">
          <div
            className="mb-4 flex size-16 shrink-0 items-center justify-center rounded-full bg-red-600 text-2xl font-black leading-none text-white shadow-[0_0_28px_-4px_rgba(239,68,68,0.95)] ring-4 ring-red-500/40 sm:mb-0"
            aria-hidden
          >
            !
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="out-of-site-title"
              className="text-xl font-semibold tracking-tight text-red-50"
            >
              You&apos;re outside the work site
            </h2>
            <div id="out-of-site-desc" className="mt-4 space-y-3 text-sm leading-relaxed text-red-100/92">
              <p>
                Your GPS fix is about{" "}
                <strong className="font-semibold text-white">{distanceM} m</strong> from the site
                center. This location only allows attendance within{" "}
                <strong className="font-semibold text-white">{radiusM} m</strong> of that point.
              </p>
              <p className="text-red-100/85">{core}</p>
              <p className="font-medium text-red-50/95">{action}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:justify-end">
          <Button
            type="button"
            className="min-w-[140px] bg-red-600 text-white hover:bg-red-500"
            onClick={onDismiss}
          >
            Got it
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(modal, document.body);
}
