"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultModal } from "@/components/client/feedback-modals";
import { toast } from "sonner";

export type AssignWorkSitesWorker = {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedSites?: string[];
};

type SiteRow = { id: string; name?: string };

type Props = {
  worker: AssignWorkSitesWorker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save (reload parent lists). */
  onSaved?: () => void;
};

export function AssignWorkSitesModal({ worker, open, onOpenChange, onSaved }: Props) {
  const [sites, setSites] = React.useState<SiteRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const authHeaders = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (!u) throw new Error("Not signed in");
    const token = await u.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadSites = React.useCallback(async () => {
    const h = await authHeaders();
    const res = await fetch("/api/sites", { headers: h });
    const data = (await res.json()) as { sites?: SiteRow[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Failed to load sites");
    setSites(data.sites ?? []);
  }, [authHeaders]);

  React.useEffect(() => {
    if (!open || !worker) return;
    setSaveSuccess(null);
    setErr(null);
    setSelected(new Set(worker.assignedSites ?? []));
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await loadSites();
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, worker, loadSites]);

  const toggleSite = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!worker || worker.role !== "employee") return;
    setBusy(true);
    setErr(null);
    try {
      const h = await authHeaders();
      const res = await fetch("/api/admin/assign-sites", {
        method: "POST",
        headers: { ...h, "Content-Type": "application/json" },
        body: JSON.stringify({
          workerId: worker.id,
          siteIds: [...selected],
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        unchanged?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (data.unchanged) {
        toast.info("No changes — assignments already match what you selected.");
        onSaved?.();
        return;
      }
      setSaveSuccess(
        selected.size === 0
          ? "Assignments cleared. They were notified."
          : `Saved ${selected.size} site(s). They were notified.`
      );
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const isEmployee = worker?.role === "employee";
  const siteById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sites) m.set(s.id, s.name ?? s.id);
    return m;
  }, [sites]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1350] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-work-sites-title"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
        >
          <X className="size-5" />
        </button>

        <h2
          id="assign-work-sites-title"
          className="pr-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Assign work sites
        </h2>
        {worker ? (
          <>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{worker.name}</p>
            <p className="text-xs text-zinc-500">{worker.email}</p>
          </>
        ) : null}

        {!worker ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-500">No worker selected.</p>
        ) : !isEmployee ? (
          <p className="mt-4 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            Only <strong>employees</strong> can receive site assignments. This account is{" "}
            <span className="capitalize">{worker.role}</span>.
          </p>
        ) : loading ? (
          <div className="mt-4 space-y-2" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Tick the sites this person may use for check-in and site switch. They get a notification when
              you save.
            </p>
            <div className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-zinc-200/80 bg-zinc-50/90 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              {sites.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-500">No sites yet. Create one under Sites.</p>
              ) : (
                sites.map((s) => (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-1.5",
                      "hover:border-zinc-200 hover:bg-zinc-100/90 dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-zinc-300 dark:border-white/20"
                      checked={selected.has(s.id)}
                      onChange={() => toggleSite(s.id)}
                    />
                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                      <span className="font-medium">{s.name ?? s.id}</span>
                      <span className="ml-2 font-mono text-xs text-zinc-500">{s.id}</span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {selected.size > 0 ? (
              <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-500">
                Selected:{" "}
                <span className="text-zinc-900 dark:text-zinc-300">
                  {[...selected].map((id) => siteById.get(id) ?? id).join(", ")}
                </span>
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Save assignments"}
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => void loadSites()}>
                Reload sites
              </Button>
            </div>
          </>
        )}

        {saveSuccess ? (
          <ResultModal
            open
            variant="success"
            title="Assignments saved"
            description={saveSuccess}
            onDismiss={() => setSaveSuccess(null)}
          />
        ) : null}
        {err ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </div>
  );
}
