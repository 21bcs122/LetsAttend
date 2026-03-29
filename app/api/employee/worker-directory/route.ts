import { NextResponse } from "next/server";
import { requireBearerUser } from "@/lib/auth/verify-request";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeTimeZoneId } from "@/lib/date/time-zone";

export const runtime = "nodejs";

/**
 * Employees (and admins) can list other workspace members for “friend” check-in selection.
 * Returns minimal fields only.
 */
export async function GET(_req: Request) {
  const auth = await requireBearerUser(_req);
  if (!auth.ok) return auth.response;

  const db = adminDb();
  const snap = await db.collection("users").get();

  const selfId = auth.decoded.uid;
  const workers = snap.docs
    .map((d) => {
      const data = d.data();
      const role = typeof data.role === "string" ? data.role : "";
      if (role !== "employee") return null;
      if (d.id === selfId) return null;
      return {
        id: d.id,
        email: typeof data.email === "string" ? data.email : "",
        name: typeof data.name === "string" ? data.name : "",
        timeZone: normalizeTimeZoneId(
          typeof data.timeZone === "string" ? data.timeZone : undefined
        ),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  workers.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return NextResponse.json({ workers });
}
