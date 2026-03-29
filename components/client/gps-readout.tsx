"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { getGpsFix, type GpsResult } from "@/lib/client/geolocation";

export type { GpsResult };

type Props = {
  onFix: (g: GpsResult) => void;
  onError?: (message: string) => void;
  /** When true, request a fix once after mount (no button needed). */
  auto?: boolean;
  /** When false, hide the Capture GPS button (read-only status / auto mode). */
  showButton?: boolean;
  /** When false, never show lat/lng (e.g. employees). Admins use true. Default true for backwards compatibility. */
  showCoordinates?: boolean;
};

export const GpsReadout = React.forwardRef<{ capture: () => void }, Props>(
  function GpsReadout(
    { onFix, onError, auto = false, showButton = true, showCoordinates = true },
    ref
  ) {
    const [loading, setLoading] = React.useState(false);
    const [last, setLast] = React.useState<GpsResult | null>(null);

    const read = React.useCallback(() => {
      setLoading(true);
      void getGpsFix()
        .then((g) => {
          setLast(g);
          onFix(g);
        })
        .catch((e: unknown) => {
          onError?.(e instanceof Error ? e.message : "GPS failed");
        })
        .finally(() => setLoading(false));
    }, [onFix, onError]);

    React.useImperativeHandle(ref, () => ({ capture: read }), [read]);

    React.useEffect(() => {
      if (!auto) return;
      let cancelled = false;
      setLoading(true);
      void getGpsFix()
        .then((g) => {
          if (cancelled) return;
          setLast(g);
          onFix(g);
        })
        .catch((e: unknown) => {
          if (!cancelled) onError?.(e instanceof Error ? e.message : "GPS failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
      // Intentionally once when `auto` is enabled — parent should pass stable `onFix`.
    }, [auto]);

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {showButton ? (
            <Button type="button" variant="secondary" onClick={read} disabled={loading}>
              {loading ? "Getting location…" : "Capture GPS"}
            </Button>
          ) : null}
          {last && showCoordinates ? (
            <span className="text-xs text-zinc-400">
              {last.latitude.toFixed(6)}, {last.longitude.toFixed(6)}
              {last.accuracyM != null && ` (±${Math.round(last.accuracyM)}m)`}
            </span>
          ) : null}
          {!showButton && !last && !loading ? (
            <span className="text-xs text-zinc-500">Waiting for location…</span>
          ) : null}
        </div>
      </div>
    );
  }
);
