import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, adminDb } from "@/lib/firebase/admin";
import { requireBearerUser } from "@/lib/auth/verify-request";
import { jsonError } from "@/lib/api/json-error";
import { isRequestAdmin } from "@/lib/auth/require-admin";
import { isSuperAdminDecoded, isSuperAdminUserRow } from "@/lib/auth/super-admin";
import { createNotification } from "@/lib/notifications/create-notification";

export const runtime = "nodejs";

const bodySchema = z.object({
  workerId: z.string().min(1),
  /** Replaces the worker’s entire assigned site list (can be empty to clear). */
  siteIds: z.array(z.string().min(1)),
});

export async function POST(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth.ok) return auth.response;
  const decoded = auth.decoded;

  if (!(await isRequestAdmin(decoded))) {
    return jsonError("Forbidden", 403);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body", 400);
  }

  const { workerId, siteIds } = parsed.data;
  if (workerId === decoded.uid) {
    return jsonError("Assign sites to other workers from this form.", 400);
  }

  const db = adminDb();
  const workerRef = db.collection("users").doc(workerId);
  const workerSnap = await workerRef.get();
  if (!workerSnap.exists) {
    return jsonError("Worker not found", 404);
  }

  const wEmail = workerSnap.get("email") as string | undefined;
  const wRole = workerSnap.get("role") as string | undefined;
  if (wRole !== "employee") {
    return jsonError("Only employees can receive site assignments.", 400);
  }

  if (!isSuperAdminDecoded(decoded) && isSuperAdminUserRow(wEmail ?? "", wRole ?? "")) {
    return jsonError("Cannot change this account.", 403);
  }

  const unique = [...new Set(siteIds)];
  for (const sid of unique) {
    const s = await db.collection("sites").doc(sid).get();
    if (!s.exists) {
      return jsonError(`Site not found: ${sid}`, 400);
    }
  }

  const prevRaw = workerSnap.get("assignedSites");
  const previousIds = Array.isArray(prevRaw)
    ? prevRaw.filter((x): x is string => typeof x === "string")
    : [];
  const prevSorted = [...new Set(previousIds)].sort();
  const nextSorted = [...unique].sort();
  const unchanged =
    prevSorted.length === nextSorted.length &&
    prevSorted.every((id, i) => id === nextSorted[i]);

  if (unchanged) {
    return NextResponse.json({
      ok: true,
      unchanged: true,
      assignedCount: unique.length,
    });
  }

  await workerRef.update({
    assignedSites: unique,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const siteNames: string[] = [];
  for (const sid of unique.slice(0, 8)) {
    const s = await db.collection("sites").doc(sid).get();
    const n = s.data()?.name;
    siteNames.push(typeof n === "string" ? n : sid);
  }
  const more = unique.length > 8 ? ` (+${unique.length - 8} more)` : "";

  await createNotification(db, {
    userId: workerId,
    title: "Work sites updated",
    body:
      unique.length === 0
        ? "Your admin removed all site assignments. You cannot check in until new sites are assigned."
        : `You can check in only at: ${siteNames.join(", ")}${more}.`,
    kind: "assignment",
    assignedSiteIds: unique,
  });

  return NextResponse.json({ ok: true, assignedCount: unique.length });
}
