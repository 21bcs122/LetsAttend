"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminSiteDetail } from "@/components/client/admin-site-detail";

export default function AdminSiteDetailPage() {
  const params = useParams();
  const siteId = typeof params?.siteId === "string" ? params.siteId : "";

  if (!siteId) {
    return (
      <div className="p-3 md:p-8">
        <p className="text-sm text-red-400">Invalid site.</p>
        <Link href="/dashboard/admin/sites" className="mt-2 inline-block text-sm text-cyan-600 underline">
          Back to sites
        </Link>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-8">
      <div className="mx-auto max-w-4xl">
        <AdminSiteDetail siteId={siteId} />
      </div>
    </div>
  );
}
