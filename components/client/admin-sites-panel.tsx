"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getFirestoreSeconds } from "@/lib/client/firestore-timestamp";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveWorkersMap } from "@/components/client/map/live-workers-map";
import { AdminEditSiteForm } from "@/components/client/admin-edit-site-form";
import { ConfirmActionModal, ResultModal } from "@/components/client/feedback-modals";
import { toast } from "sonner";
import { DEFAULT_ATTENDANCE_TIME_ZONE } from "@/lib/date/time-zone";
import {
  formatInstantDateTime12hInZone,
  formatInstantTime12hInZone,
} from "@/lib/time/format-wall-time";

type Site = {
  id: string;
  name?: string;
  latitude?: unknown;
  longitude?: unknown;
  radius?: unknown;
  workdayStartUtc?: unknown;
  autoCheckoutUtc?: unknown;
};

type PhotoEntry = {
  kind: "check_in" | "site_switch" | "check_out";
  photoUrl: string;
  atMs: number | null;
};

type OvertimeRow = {
  id: string;
  workerName?: string | null;
  workerEmail?: string | null;
  workerId?: string;
  siteId?: string | null;
  date?: string;
  status?: string;
  reason?: string;
  createdAt?: { seconds?: number };
  reviewedAt?: { seconds?: number };
  overtimeCheckIn?: {
    time?: { seconds?: number };
    gps?: { latitude?: number; longitude?: number; accuracyM?: number };
    photoUrl?: string;
  } | null;
  overtimeCheckOut?: {
    time?: { seconds?: number };
    gps?: { latitude?: number; longitude?: number; accuracyM?: number };
    photoUrl?: string;
  } | null;
};

type Insights = {
  site: { id: string; name: string };
  assignedWorkers: { id: string; name: string; email: string; role: string }[];
  activeAtSite: { workerId: string; name: string; email: string; hasOpenSession: boolean }[];
  today: string;
  siteSwitchStats: { switchesIntoSite: number; switchesOutOfSite: number };
  photoEvidence: {
    workerId: string;
    name: string;
    email: string;
    photos: PhotoEntry[];
  }[];
};

function photoKindLabel(kind: PhotoEntry["kind"]) {
  switch (kind) {
    case "check_in":
      return "Check-in";
    case "site_switch":
      return "Site switch";
    case "check_out":
      return "Check-out";
    default:
      return kind;
  }
}

export function AdminSitesPanel({
  className,
  reloadToken = 0,
  initialSiteId,
}: {
  className?: string;
  reloadToken?: number;
  /** Deep link from search / overview: select this site when the list loads. */
  initialSiteId?: string;
}) {
  const [sites, setSites] = React.useState<Site[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Site | null>(null);
  const [deleteDoneName, setDeleteDoneName] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [insights, setInsights] = React.useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [insightsErr, setInsightsErr] = React.useState<string | null>(null);
  const [detailTab, setDetailTab] = React.useState<
    "overview" | "edit" | "photos" | "overtime"
  >("overview");
  const [overtimeRows, setOvertimeRows] = React.useState<OvertimeRow[]>([]);
  const [overtimeLoading, setOvertimeLoading] = React.useState(false);
  const [overtimeErr, setOvertimeErr] = React.useState<string | null>(null);

  const selectedSite = React.useMemo(
    () => (selectedId ? sites.find((s) => s.id === selectedId) ?? null : null),
    [sites, selectedId]
  );

  const load = React.useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken();
      const res = await fetch("/api/sites", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { sites?: Site[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load sites");
      setSites(data.sites ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, reloadToken]);

  React.useEffect(() => {
    const id = initialSiteId?.trim();
    if (!id || sites.length === 0) return;
    if (sites.some((s) => s.id === id)) setSelectedId(id);
  }, [initialSiteId, sites]);

  const jumpSites = React.useMemo(
    () =>
      sites
        .map((s) => {
          const lat = Number(s.latitude);
          const lng = Number(s.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const name =
            typeof s.name === "string" && s.name.trim() ? s.name.trim() : s.id;
          return { id: s.id, name, latitude: lat, longitude: lng };
        })
        .filter((x): x is { id: string; name: string; latitude: number; longitude: number } => x != null),
    [sites]
  );

  const loadOvertimeForSite = React.useCallback(async (siteId: string) => {
    setOvertimeErr(null);
    setOvertimeLoading(true);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken();
      const res = await fetch(
        `/api/overtime?siteId=${encodeURIComponent(siteId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) as { items?: OvertimeRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load overtime");
      const rows = (data.items ?? []).slice().sort((a, b) => {
        const as = a.createdAt?.seconds ?? 0;
        const bs = b.createdAt?.seconds ?? 0;
        return bs - as;
      });
      setOvertimeRows(rows);
    } catch (e) {
      setOvertimeErr(e instanceof Error ? e.message : "Failed");
      setOvertimeRows([]);
    } finally {
      setOvertimeLoading(false);
    }
  }, []);

  const loadInsights = React.useCallback(async (siteId: string) => {
    setInsightsErr(null);
    setInsightsLoading(true);
    setInsights(null);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken();
      const res = await fetch(
        `/api/admin/site-insights?siteId=${encodeURIComponent(siteId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = (await res.json()) as Insights & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load details");
      setInsights({
        ...data,
        photoEvidence: Array.isArray(data.photoEvidence) ? data.photoEvidence : [],
      });
    } catch (e) {
      setInsightsErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!selectedId) {
      setInsights(null);
      setOvertimeRows([]);
      return;
    }
    setDetailTab("overview");
    void loadInsights(selectedId);
  }, [selectedId, loadInsights]);

  React.useEffect(() => {
    if (!selectedId || detailTab !== "overtime") return;
    void loadOvertimeForSite(selectedId);
  }, [selectedId, detailTab, loadOvertimeForSite]);

  const runDelete = async (site: Site) => {
    setDeletingId(site.id);
    setErr(null);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken();
      const res = await fetch("/api/admin/sites", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteId: site.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      if (selectedId === site.id) setSelectedId(null);
      const label = typeof site.name === "string" ? site.name : site.id;
      setDeleteDoneName(label);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const remove = (site: Site, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(site);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {deleteTarget ? (
        <ConfirmActionModal
          open
          tone="danger"
          title="Delete this site?"
          description={
            <>
              <p>
                Permanently delete <strong className="text-zinc-200">&ldquo;{typeof deleteTarget.name === "string" ? deleteTarget.name : deleteTarget.id}&rdquo;</strong>? Workers assigned only to this site may need reassignment. Attendance history that references this site id may still exist.
              </p>
            </>
          }
          confirmLabel="Delete site"
          busy={deletingId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const s = deleteTarget;
            setDeleteTarget(null);
            void runDelete(s);
          }}
        />
      ) : null}

      {deleteDoneName ? (
        <ResultModal
          open
          variant="success"
          title="Site deleted"
          description={`“${deleteDoneName}” was removed from the site list.`}
          onDismiss={() => setDeleteDoneName(null)}
        />
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>All sites</CardTitle>
              <CardDescription>
                Click a row for assignments, who is working there today (calendar day, NPT), and
                site-switch activity. Delete removes the site record only.
              </CardDescription>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : err ? (
            <p className="text-sm text-red-400">{err}</p>
          ) : sites.length === 0 ? (
            <p className="text-sm text-zinc-400">No sites yet. Create one below or on this page.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Lat</th>
                    <th className="px-3 py-2 font-medium">Lng</th>
                    <th className="px-3 py-2 font-medium">Radius (m)</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(s.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setSelectedId(s.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer border-b border-white/5 last:border-0",
                        selectedId === s.id
                          ? "bg-cyan-500/10 hover:bg-cyan-500/15"
                          : "hover:bg-white/[0.04]"
                      )}
                    >
                      <td className="px-3 py-2.5 font-medium text-zinc-200">
                        {typeof s.name === "string" ? s.name : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {typeof s.latitude === "number" ? s.latitude.toFixed(5) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {typeof s.longitude === "number" ? s.longitude.toFixed(5) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">
                        {typeof s.radius === "number" ? s.radius : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          disabled={deletingId === s.id}
                          onClick={(e) => void remove(s, e)}
                          aria-label={`Delete ${s.name ?? s.id}`}
                        >
                          <Trash2 className="mr-1 size-4" />
                          {deletingId === s.id ? "…" : "Delete"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId ? (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-base">Site details</CardTitle>
            <CardDescription>
              Data for attendance day{" "}
              <span className="font-mono text-zinc-300">{insights?.today ?? "…"}</span> (Nepal NPT calendar
              day).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setDetailTab("overview")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  detailTab === "overview"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("edit")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  detailTab === "edit"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                Edit site
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("photos")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  detailTab === "photos"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                Today&apos;s selfies
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("overtime")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  detailTab === "overtime"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                )}
              >
                Overtime
              </button>
            </div>

            {detailTab === "edit" && selectedSite ? (
              <AdminEditSiteForm
                key={selectedSite.id}
                site={selectedSite}
                onSaved={() => {
                  void load();
                  if (selectedId) void loadInsights(selectedId);
                }}
              />
            ) : detailTab === "overtime" ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Overtime requests tied to this site (all statuses). Open the{" "}
                  <span className="text-zinc-400">Admin → Overtime</span> page to approve or reject.
                </p>
                {overtimeLoading ? (
                  <div className="space-y-2" aria-hidden>
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                  </div>
                ) : overtimeErr ? (
                  <p className="text-sm text-red-400">{overtimeErr}</p>
                ) : overtimeRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">No overtime records for this site yet.</p>
                ) : (
                  <ul className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {overtimeRows.map((row) => {
                      const inTs = row.overtimeCheckIn?.time;
                      const outTs = row.overtimeCheckOut?.time;
                      const inSec = getFirestoreSeconds(inTs);
                      const outSec = getFirestoreSeconds(outTs);
                      const hasIn = inSec != null;
                      const hasOut = outSec != null;
                      return (
                        <li
                          key={row.id}
                          className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-zinc-100">
                                {row.workerName ?? row.workerEmail ?? row.workerId ?? "Worker"}
                              </p>
                              <p className="text-xs text-zinc-500">{row.workerEmail ?? "—"}</p>
                            </div>
                            <span
                              className={
                                row.status === "approved"
                                  ? "text-emerald-400"
                                  : row.status === "rejected"
                                    ? "text-red-400"
                                    : "text-amber-200"
                              }
                            >
                              {row.status ?? "pending"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-500">
                            Work date <span className="font-mono text-zinc-400">{row.date ?? "—"}</span>
                          </p>
                          {row.reason ? (
                            <p className="mt-1 text-xs text-zinc-400">{row.reason}</p>
                          ) : null}
                          {row.status === "approved" ? (
                            <div className="mt-2 space-y-1 border-t border-white/10 pt-2 text-xs text-zinc-400">
                              {hasIn ? (
                                <p>
                                  In:{" "}
                                  {formatInstantDateTime12hInZone(
                                    inSec! * 1000,
                                    DEFAULT_ATTENDANCE_TIME_ZONE,
                                    { withSeconds: true, withTimeZoneName: true }
                                  )}
                                  {row.overtimeCheckIn?.photoUrl ? (
                                    <>
                                      {" "}
                                      ·{" "}
                                      <a
                                        href={row.overtimeCheckIn.photoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-400 underline"
                                      >
                                        selfie
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              ) : (
                                <p className="text-amber-200/80">No overtime check-in yet.</p>
                              )}
                              {hasOut ? (
                                <p>
                                  Out:{" "}
                                  {formatInstantDateTime12hInZone(
                                    outSec! * 1000,
                                    DEFAULT_ATTENDANCE_TIME_ZONE,
                                    { withSeconds: true, withTimeZoneName: true }
                                  )}
                                  {row.overtimeCheckOut?.photoUrl ? (
                                    <>
                                      {" "}
                                      ·{" "}
                                      <a
                                        href={row.overtimeCheckOut.photoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-400 underline"
                                      >
                                        selfie
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                              ) : hasIn ? (
                                <p className="text-amber-200/80">Awaiting check-out.</p>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : insightsLoading ? (
              <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : insightsErr ? (
              <p className="text-sm text-red-400">{insightsErr}</p>
            ) : insights && detailTab === "overview" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Assigned workers</p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {insights.assignedWorkers.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Checked in here now</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-300">
                      {insights.activeAtSite.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Switches (today)</p>
                    <p className="mt-1 text-sm text-zinc-300">
                      <span className="text-cyan-300">In</span> {insights.siteSwitchStats.switchesIntoSite}{" "}
                      · <span className="text-amber-300">Out</span>{" "}
                      {insights.siteSwitchStats.switchesOutOfSite}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Assigned to this site
                    </h4>
                    {insights.assignedWorkers.length === 0 ? (
                      <p className="text-sm text-zinc-500">No workers have this site in assignedSites.</p>
                    ) : (
                      <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                        {insights.assignedWorkers.map((w) => (
                          <li key={w.id} className="rounded-lg bg-white/[0.04] px-3 py-1.5">
                            <span className="font-medium text-zinc-200">{w.name || w.id}</span>
                            <span className="ml-2 text-xs text-zinc-500">{w.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Open session at this site
                    </h4>
                    {insights.activeAtSite.length === 0 ? (
                      <p className="text-sm text-zinc-500">Nobody currently checked in at this site.</p>
                    ) : (
                      <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                        {insights.activeAtSite.map((w) => (
                          <li key={w.workerId} className="rounded-lg bg-emerald-500/10 px-3 py-1.5">
                            <span className="font-medium text-emerald-100">{w.name}</span>
                            <span className="ml-2 text-xs text-emerald-200/70">{w.email}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Live GPS at this site
                  </h4>
                  <p className="mb-3 text-xs text-zinc-500">
                    Only workers whose last reported position falls inside this site&apos;s geofence appear
                    on the map. Open fullscreen for a larger view.
                  </p>
                  <LiveWorkersMap
                    key={selectedId}
                    siteId={selectedId}
                    embedded
                    height={440}
                    pollMs={15_000}
                    jumpSites={jumpSites}
                  />
                </div>
              </>
            ) : insights && detailTab === "photos" ? (
              <div className="space-y-6">
                <p className="text-xs text-zinc-500">
                  Uploaded photos for this site today (calendar day {insights.today}, NPT): check-in, site
                  switch
                  arrivals, and check-out while at this site.
                </p>
                {insights.photoEvidence.length === 0 ? (
                  <p className="text-sm text-zinc-500">No selfie records for this site today yet.</p>
                ) : (
                  insights.photoEvidence.map((row) => (
                    <div key={row.workerId} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <p className="text-sm font-medium text-zinc-100">{row.name}</p>
                      <p className="text-xs text-zinc-500">{row.email}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {row.photos.map((ph, i) => (
                          <div
                            key={`${ph.photoUrl}-${i}`}
                            className="overflow-hidden rounded-lg border border-white/10 bg-black/30"
                          >
                            <img
                              src={ph.photoUrl}
                              alt={`${photoKindLabel(ph.kind)} — ${row.name}`}
                              className="aspect-[4/3] w-full object-cover"
                              loading="lazy"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-1.5 text-[10px] text-zinc-400">
                              <span className="text-cyan-300/90">{photoKindLabel(ph.kind)}</span>
                              {typeof ph.atMs === "number" ? (
                                <span>
                                  {formatInstantTime12hInZone(ph.atMs, DEFAULT_ATTENDANCE_TIME_ZONE, {
                                    withSeconds: true,
                                    withTimeZoneName: true,
                                  })}
                                </span>
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
