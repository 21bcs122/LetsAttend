/** Browser geolocation helper for check-in / check-out flows. */

export type GpsResult = {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in meters (lower is better). From `coords.accuracy`. */
  accuracyM?: number;
};

type GetGpsFixOptions = {
  /**
   * Max time to wait for a fix (ms). After this, we return the **best** sample seen so far.
   * @default 22_000
   */
  maxWaitMs?: number;
  /**
   * If reported accuracy is at or below this (meters), we can stop **after** `minSettleMs`
   * (gives GNSS time to improve from a rough first fix).
   * @default 28
   */
  targetAccuracyM?: number;
  /**
   * Minimum time before we allow early exit when `targetAccuracyM` is met (ms).
   * Avoids locking onto the first noisy reading.
   * @default 1_800
   */
  minSettleMs?: number;
  /**
   * If accuracy is this good or better (meters), we may finish after `quickSettleMs`.
   * @default 12
   */
  excellentAccuracyM?: number;
  /**
   * Minimum time before early exit when accuracy is “excellent” (ms).
   * @default 900
   */
  quickSettleMs?: number;
};

function toResult(pos: GeolocationPosition): GpsResult {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracyM: pos.coords.accuracy,
  };
}

/**
 * High-accuracy fix using **repeated samples** (`watchPosition`): GPS/Wi‑Fi often improves over
 * a few seconds. We keep the reading with the **lowest** `accuracy` (best reported precision).
 *
 * Tips for users: work outdoors or with sky view when possible; first fix can drift until GNSS locks.
 */
export function getGpsFix(options?: GetGpsFixOptions): Promise<GpsResult> {
  const maxWaitMs = options?.maxWaitMs ?? 22_000;
  const targetAccuracyM = options?.targetAccuracyM ?? 28;
  const minSettleMs = options?.minSettleMs ?? 1_800;
  const excellentAccuracyM = options?.excellentAccuracyM ?? 12;
  const quickSettleMs = options?.quickSettleMs ?? 900;

  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    let best: GpsResult | null = null;
    let bestAccuracy = Number.POSITIVE_INFINITY;
    const startedAt = Date.now();
    let watchId: number | undefined;
    let settled = false;

    const done = (result: GpsResult) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(hardTimeoutId);
      resolve(result);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(hardTimeoutId);
      reject(new Error(message));
    };

    const considerFinish = (candidate: GpsResult, elapsed: number) => {
      const acc = candidate.accuracyM ?? 9999;
      if (!best || acc < bestAccuracy) {
        bestAccuracy = acc;
        best = candidate;
      }

      if (!best) return;

      const useAcc = best.accuracyM ?? 9999;

      // Strong fix quickly — safe to stop once briefly settled
      if (useAcc <= excellentAccuracyM && elapsed >= quickSettleMs) {
        done(best);
        return;
      }

      // Good enough after minimum settle time (lets accuracy improve from first fix)
      if (useAcc <= targetAccuracyM && elapsed >= minSettleMs) {
        done(best);
        return;
      }
    };

    const hardTimeoutId = window.setTimeout(() => {
      if (best) {
        done(best);
      } else {
        fail("GPS timeout — move to an open area, wait a few seconds, and try again.");
      }
    }, maxWaitMs);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const elapsed = Date.now() - startedAt;
        const candidate = toResult(pos);
        considerFinish(candidate, elapsed);
      },
      () => {
        fail("GPS denied or unavailable. Enable location for this site.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: maxWaitMs,
      }
    );
  });
}
