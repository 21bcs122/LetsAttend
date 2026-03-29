"use client";

import * as React from "react";
import { LiveWorkersMap } from "@/components/client/map/live-workers-map";
import { getFirebaseAuth } from "@/lib/firebase/client";

type SiteRow = {
  id: string;
  name?: string;
  latitude?: unknown;
  longitude?: unknown;
};

export default function AdminLivePage() {
  const [jumpSites, setJumpSites] = React.useState<
    { id: string; name: string; latitude: number; longitude: number }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const auth = getFirebaseAuth();
        const u = auth.currentUser;
        if (!u) return;
        const token = await u.getIdToken();
        const res = await fetch("/api/sites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { sites?: SiteRow[] };
        if (!res.ok || cancelled) return;
        const list = (data.sites ?? [])
          .map((s) => {
            const lat = Number(s.latitude);
            const lng = Number(s.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return {
              id: s.id,
              name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : s.id,
              latitude: lat,
              longitude: lng,
            };
          })
          .filter((x): x is NonNullable<typeof x> => x != null);
        setJumpSites(list);
      } catch {
        if (!cancelled) setJumpSites([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-3 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Live map</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Worker GPS from the last few minutes (refreshes automatically). Use the panel on the map to jump
          to a worker or site; zoom and pan still work.
        </p>
      </div>
      <LiveWorkersMap jumpSites={jumpSites} />
    </div>
  );
}
