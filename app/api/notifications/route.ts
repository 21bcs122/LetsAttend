import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireBearerUser } from "@/lib/auth/verify-request";
import { jsonError } from "@/lib/api/json-error";
import { serializeFirestoreForJson } from "@/lib/firestore/serialize-for-json";

export const runtime = "nodejs";

function createdAtMs(data: Record<string, unknown>): number {
  const c = data.createdAt;
  if (c instanceof Timestamp) return c.toMillis();
  return 0;
}

export async function GET(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth.ok) return auth.response;
  const { uid } = auth.decoded;

  const db = adminDb();
  /** Equality-only query avoids a composite index; we sort in memory. */
  const snap = await db
    .collection("notifications")
    .where("userId", "==", uid)
    .limit(100)
    .get();

  const items = snap.docs
    .map((d) => ({ d, ms: createdAtMs(d.data() as Record<string, unknown>) }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 40)
    .map(({ d }) => serializeFirestoreForJson({ id: d.id, ...d.data() }));
  return NextResponse.json({ items });
}

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
});

export async function PATCH(req: Request) {
  const auth = await requireBearerUser(req);
  if (!auth.ok) return auth.response;
  const { uid } = auth.decoded;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = markReadSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid body", 400);
  }

  const db = adminDb();
  const refs = parsed.data.ids.map((id) => db.collection("notifications").doc(id));
  const snaps = await db.getAll(...refs);
  const batch = db.batch();
  for (const s of snaps) {
    if (!s.exists) continue;
    const row = s.data() as { userId?: string };
    if (row.userId !== uid) continue;
    batch.update(s.ref, { read: true, readAt: FieldValue.serverTimestamp() });
  }
  await batch.commit();
  return NextResponse.json({ ok: true });
}
