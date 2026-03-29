"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminCreateSiteForm } from "@/components/client/admin-create-site-form";
import { AdminSitesPanel } from "@/components/client/admin-sites-panel";
import { cn } from "@/lib/utils";
import { CardBlockSkeleton } from "@/components/client/dashboard-skeletons";

function AdminSitesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteFromQuery = searchParams.get("site")?.trim() ?? "";
  const [reloadToken, setReloadToken] = React.useState(0);
  const [tab, setTab] = React.useState<"browse" | "create">("browse");

  React.useEffect(() => {
    if (siteFromQuery) setTab("browse");
  }, [siteFromQuery]);

  /** Legacy `?site=` deep links → dedicated site detail route. */
  React.useEffect(() => {
    if (!siteFromQuery) return;
    router.replace(`/dashboard/admin/sites/${encodeURIComponent(siteFromQuery)}`);
  }, [siteFromQuery, router]);

  if (siteFromQuery) {
    return <CardBlockSkeleton lines={3} />;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-200/90 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setTab("browse")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "browse"
              ? "bg-zinc-200 text-zinc-900 dark:bg-white/10 dark:text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          )}
        >
          All sites
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "create"
              ? "bg-zinc-200 text-zinc-900 dark:bg-white/10 dark:text-white"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
          )}
        >
          Create site
        </button>
      </div>

      {tab === "browse" ? (
        <AdminSitesPanel reloadToken={reloadToken} />
      ) : (
        <AdminCreateSiteForm
          onCreated={() => {
            setReloadToken((n) => n + 1);
            setTab("browse");
          }}
        />
      )}
    </>
  );
}

export default function AdminSitesPage() {
  return (
    <div className="p-3 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Browse work locations, geofences, and live activity per site. Create new sites in a separate
          tab.
        </p>
      </div>

      <Suspense fallback={<CardBlockSkeleton lines={3} />}>
        <AdminSitesContent />
      </Suspense>
    </div>
  );
}
