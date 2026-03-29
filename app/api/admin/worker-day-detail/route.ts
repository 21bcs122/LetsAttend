import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { jsonError } from "@/lib/api/json-error";
import { isRequestAdmin } from "@/lib/auth/require-admin";
import { requireBearerUser } from "@/lib/auth/verify-request";
import { buildWorkerDayDetail } from "@/lib/attendance/worker-day-detail";

export const runtime = "nodejs";

const querySchema = z.object({
  workerId: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth.ok) return auth.response;
  const decoded = auth.decoded;
  if (!(await isRequestAdmin(decoded))) return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    workerId: url.searchParams.get("workerId") ?? "",
    day: url.searchParams.get("day") ?? "",
  });
  if (!parsed.success) {
    return jsonError("workerId and day (YYYY-MM-DD) required", 400);
  }

  try {
    const payload = await buildWorkerDayDetail(
      adminDb(),
      parsed.data.workerId,
      parsed.data.day
    );
    return NextResponse.json(payload);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed", 400);
  }
}
