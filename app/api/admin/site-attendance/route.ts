import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireBearerUser } from "@/lib/auth/verify-request";
import { jsonError } from "@/lib/api/json-error";
import { isRequestAdmin } from "@/lib/auth/require-admin";
import { DateTime } from "luxon";

export const runtime = "nodejs";

const qSchema = z.object({
  siteId: z.string().min(1),
  period: z.enum(["day", "month", "year"]),
  /** YYYY-MM-DD for day, YYYY-MM for month, YYYY for year */
  value: z.string().min(4),
});

export type SiteAttendanceRow = {
  date: string; // YYYY-MM-DD
  workerCount: number;
  workers: { id: string; name: string }[];
};

export type SiteAttendanceResponse = {
  siteId: string;
  siteName: string;
  period: "day" | "month" | "year";
  value: string;
  rows: SiteAttendanceRow[];
};

export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth.ok) return auth.response;
  const decoded = auth.decoded;

  if (!(await isRequestAdmin(decoded))) {
    return jsonError("Forbidden", 403);
  }

  const url = new URL(req.url);
  const parsed = qSchema.safeParse({
    siteId: url.searchParams.get("siteId") ?? "",
    period: url.searchParams.get("period") ?? "",
    value: url.searchParams.get("value") ?? "",
  });

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid query params",
      400
    );
  }

  const { siteId, period, value } = parsed.data;
  const db = adminDb();

  // Resolve site name
  const siteSnap = await db.collection("sites").doc(siteId).get();
  if (!siteSnap.exists) return jsonError("Site not found", 404);
  const siteName =
    typeof siteSnap.data()?.name === "string"
      ? (siteSnap.data()!.name as string)
      : siteId;

  // Resolve user names
  const usersSnap = await db.collection("users").get();
  const userById = new Map<string, { id: string; name: string }>();
  for (const d of usersSnap.docs) {
    const data = d.data();
    userById.set(d.id, {
      id: d.id,
      name: typeof data.name === "string" ? data.name : d.id,
    });
  }

  // Determine date range to query
  let dates: string[] = [];
  if (period === "day") {
    dates = [value]; // single YYYY-MM-DD
  } else if (period === "month") {
    // value is YYYY-MM
    const [y, m] = value.split("-").map(Number);
    if (!y || !m) return jsonError("Invalid month value", 400);
    const start = DateTime.fromObject({ year: y, month: m, day: 1 });
    const daysInMonth = start.daysInMonth ?? 30;
    dates = Array.from({ length: daysInMonth }, (_, i) =>
      start.plus({ days: i }).toISODate()!
    );
  } else {
    // year — value is YYYY
    const y = parseInt(value, 10);
    if (!y) return jsonError("Invalid year value", 400);
    const start = DateTime.fromObject({ year: y, month: 1, day: 1 });
    const end = DateTime.fromObject({ year: y, month: 12, day: 31 });
    let cur = start;
    while (cur <= end) {
      dates.push(cur.toISODate()!);
      cur = cur.plus({ days: 1 });
    }
  }

  // Batch Firestore queries — query attendance docs by date, filter by siteId
  // Firestore limitation: can't filter two array-not-null fields in one query.
  // We query by date range and filter siteId in memory.
  const firstDate = dates[0]!;
  const lastDate = dates[dates.length - 1]!;

  const attSnap = await db
    .collection("attendance")
    .where("date", ">=", firstDate)
    .where("date", "<=", lastDate)
    .get();

  // Group by date
  const byDate = new Map<string, Map<string, { id: string; name: string }>>();
  for (const doc of attSnap.docs) {
    const data = doc.data();
    const docSiteId = typeof data.siteId === "string" ? data.siteId : "";
    if (docSiteId !== siteId) continue;
    const date = typeof data.date === "string" ? data.date : "";
    if (!date) continue;
    const wid =
      typeof data.workerId === "string" ? data.workerId : doc.id.split("_")[0] ?? "";
    if (!wid) continue;
    const user = userById.get(wid) ?? { id: wid, name: wid };
    if (!byDate.has(date)) byDate.set(date, new Map());
    byDate.get(date)!.set(wid, user);
  }

  // Build rows — only dates that had at least 1 worker (for day mode include even 0)
  const rows: SiteAttendanceRow[] =
    period === "day"
      ? dates.map((d) => {
          const wMap = byDate.get(d) ?? new Map();
          const workers = [...wMap.values()].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
          return { date: d, workerCount: workers.length, workers };
        })
      : dates
          .filter((d) => byDate.has(d))
          .map((d) => {
            const wMap = byDate.get(d)!;
            const workers = [...wMap.values()].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
            );
            return { date: d, workerCount: workers.length, workers };
          });

  const response: SiteAttendanceResponse = {
    siteId,
    siteName,
    period,
    value,
    rows,
  };

  return NextResponse.json(response);
}
