import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { DEFAULT_ATTENDANCE_TIME_ZONE, normalizeTimeZoneId } from "@/lib/date/time-zone";

export function timeZoneFromUserSnapshot(snap: DocumentSnapshot<DocumentData>): string {
  const raw = snap.get("timeZone");
  return normalizeTimeZoneId(typeof raw === "string" ? raw : undefined);
}

/** Site-level schedule zone (auto check-out / work start wall clock). Defaults to Nepal. */
export function scheduleTimeZoneFromSiteData(data: DocumentData | undefined): string {
  const raw = data?.scheduleTimeZone;
  return normalizeTimeZoneId(typeof raw === "string" ? raw : DEFAULT_ATTENDANCE_TIME_ZONE);
}
