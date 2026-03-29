import type { Firestore } from "firebase-admin/firestore";
import { serializeFirestoreForJson } from "@/lib/firestore/serialize-for-json";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function timeToMs(t: unknown): number | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  if (typeof o.seconds === "number") return o.seconds * 1000;
  if (typeof o._seconds === "number") return o._seconds * 1000;
  return null;
}

export type TimelineEvent =
  | {
      kind: "check_in";
      atMs: number;
      siteId: string;
      siteName: string;
      photoUrl: string | null;
      gps: unknown;
    }
  | {
      kind: "site_switch";
      atMs: number;
      fromSiteId: string;
      fromSiteName: string;
      toSiteId: string;
      toSiteName: string;
      arrivalPhotoUrl: string | null;
      arrivalGps: unknown;
      previousSiteCheckOut: {
        siteId: string;
        siteName: string;
        atMs: number;
        photoUrl: string | null;
        gps: unknown;
      } | null;
    }
  | {
      kind: "check_out";
      atMs: number;
      siteId: string;
      siteName: string;
      photoUrl: string | null;
      gps: unknown;
      auto: boolean;
    };

export type SiteSegment = {
  siteId: string;
  siteName: string;
  startMs: number;
  endMs: number | null;
  durationMs: number | null;
};

export type OvertimeDayDetailRow = {
  id: string;
  status: string;
  reason: string;
  siteId: string | null;
  siteName: string | null;
  overtimeCheckIn: {
    atMs: number | null;
    photoUrl: string | null;
    gps: unknown;
  } | null;
  overtimeCheckOut: {
    atMs: number | null;
    photoUrl: string | null;
    gps: unknown;
  } | null;
};

async function fetchOvertimeForWorkerDay(
  db: Firestore,
  workerId: string,
  day: string
): Promise<OvertimeDayDetailRow[]> {
  const snap = await db
    .collection("overtimeRequests")
    .where("workerId", "==", workerId)
    .where("date", "==", day)
    .get();

  const siteIds = new Set<string>();
  for (const doc of snap.docs) {
    const sid = doc.get("siteId");
    if (typeof sid === "string" && sid) siteIds.add(sid);
  }

  const siteNames: Record<string, string> = {};
  for (const sid of siteIds) {
    const s = await db.collection("sites").doc(sid).get();
    siteNames[sid] =
      s.exists && typeof s.data()?.name === "string" ? (s.data()!.name as string) : sid;
  }

  const withOrder = snap.docs.map((d) => {
    const data = d.data();
    const siteId = typeof data.siteId === "string" ? data.siteId : null;
    const ci = data.overtimeCheckIn as Record<string, unknown> | undefined;
    const co = data.overtimeCheckOut as Record<string, unknown> | undefined;

    const pack = (
      block: Record<string, unknown> | undefined
    ): OvertimeDayDetailRow["overtimeCheckIn"] =>
      block && typeof block === "object"
        ? {
            atMs: timeToMs(block.time),
            photoUrl: typeof block.photoUrl === "string" ? block.photoUrl : null,
            gps: block.gps ?? null,
          }
        : null;

    const row: OvertimeDayDetailRow = {
      id: d.id,
      status: typeof data.status === "string" ? data.status : "unknown",
      reason: typeof data.reason === "string" ? data.reason : "",
      siteId,
      siteName: siteId ? siteNames[siteId] ?? siteId : null,
      overtimeCheckIn: pack(ci),
      overtimeCheckOut: pack(co),
    };
    return { row, sortKey: timeToMs(d.get("createdAt")) ?? 0 };
  });

  withOrder.sort((a, b) => a.sortKey - b.sortKey);
  return withOrder.map((x) => x.row);
}

export type WorkerDayDetailResult =
  | {
      ok: true;
      day: string;
      workerId: string;
      absent: true;
      workerName: string | null;
      workerEmail: string | null;
      overtime: OvertimeDayDetailRow[];
    }
  | {
      ok: true;
      day: string;
      workerId: string;
      absent: false;
      workerName: string | null;
      workerEmail: string | null;
      status: string;
      currentSiteId: string | null;
      currentSiteName: string | null;
      checkIn: {
        atMs: number | null;
        siteId: string;
        siteName: string;
        photoUrl: string | null;
        gps: unknown;
      } | null;
      checkOut: {
        atMs: number | null;
        siteId: string;
        siteName: string;
        photoUrl: string | null;
        gps: unknown;
        auto: boolean;
      } | null;
      siteSwitchLogs: Record<string, unknown>[];
      timeline: TimelineEvent[];
      analytics: {
        sessionOpen: boolean;
        switchCount: number;
        uniqueSitesCount: number;
        sitesVisitedOrdered: { id: string; name: string }[];
        firstEventMs: number | null;
        lastEventMs: number | null;
        totalSessionMs: number | null;
        segments: SiteSegment[];
      };
      overtime: OvertimeDayDetailRow[];
    };

export async function buildWorkerDayDetail(
  db: Firestore,
  workerId: string,
  day: string
): Promise<WorkerDayDetailResult> {
  if (!DAY_RE.test(day)) {
    throw new Error("Invalid day");
  }

  const [userSnap, overtime, attSnap] = await Promise.all([
    db.collection("users").doc(workerId).get(),
    fetchOvertimeForWorkerDay(db, workerId, day),
    db.collection("attendance").doc(`${workerId}_${day}`).get(),
  ]);

  const workerName =
    userSnap.exists && typeof userSnap.get("name") === "string"
      ? (userSnap.get("name") as string)
      : null;
  const workerEmail =
    userSnap.exists && typeof userSnap.get("email") === "string"
      ? (userSnap.get("email") as string)
      : null;

  if (!attSnap.exists) {
    return {
      ok: true,
      day,
      workerId,
      absent: true,
      workerName,
      workerEmail,
      overtime,
    };
  }

  const raw = attSnap.data()!;
  const plain = serializeFirestoreForJson(raw) as Record<string, unknown>;

  const siteIds = new Set<string>();
  const currentSiteId =
    typeof plain.siteId === "string" && plain.siteId ? plain.siteId : null;
  if (currentSiteId) siteIds.add(currentSiteId);

  const checkIn = plain.checkIn as Record<string, unknown> | undefined;
  const checkOut = plain.checkOut as
    | (Record<string, unknown> & { auto?: boolean })
    | undefined;
  const rawLogs = Array.isArray(plain.siteSwitchLogs)
    ? (plain.siteSwitchLogs as Record<string, unknown>[])
    : [];

  const logs = [...rawLogs].sort((a, b) => {
    const ma = timeToMs(a.at) ?? 0;
    const mb = timeToMs(b.at) ?? 0;
    return ma - mb;
  });

  const initialSiteId =
    logs.length > 0 && typeof logs[0].fromSiteId === "string"
      ? logs[0].fromSiteId
      : currentSiteId ?? "";

  if (initialSiteId) siteIds.add(initialSiteId);
  for (const log of logs) {
    if (typeof log.fromSiteId === "string") siteIds.add(log.fromSiteId);
    if (typeof log.toSiteId === "string") siteIds.add(log.toSiteId);
  }
  if (
    checkOut &&
    currentSiteId &&
    typeof (checkOut as { siteId?: string }).siteId === "string"
  ) {
    siteIds.add((checkOut as { siteId: string }).siteId);
  }

  const siteNames: Record<string, string> = {};
  for (const sid of siteIds) {
    const s = await db.collection("sites").doc(sid).get();
    if (s.exists) {
      const n = s.data()?.name;
      siteNames[sid] = typeof n === "string" ? n : sid;
    } else {
      siteNames[sid] = sid;
    }
  }

  const nameOf = (id: string) => siteNames[id] ?? id;

  const checkInMs = checkIn ? timeToMs(checkIn.time) : null;
  const checkOutMs = checkOut ? timeToMs(checkOut.time) : null;

  const timeline: TimelineEvent[] = [];

  if (checkIn && checkInMs != null && initialSiteId) {
    timeline.push({
      kind: "check_in",
      atMs: checkInMs,
      siteId: initialSiteId,
      siteName: nameOf(initialSiteId),
      photoUrl:
        typeof checkIn.photoUrl === "string" ? checkIn.photoUrl : null,
      gps: checkIn.gps ?? null,
    });
  }

  for (const log of logs) {
    const atMs = timeToMs(log.at);
    if (atMs == null) continue;
    const fromId =
      typeof log.fromSiteId === "string" ? log.fromSiteId : "";
    const toId = typeof log.toSiteId === "string" ? log.toSiteId : "";
    const psco = log.previousSiteCheckOut as Record<string, unknown> | undefined;
    let previousSiteCheckOut: {
      siteId: string;
      siteName: string;
      atMs: number;
      photoUrl: string | null;
      gps: unknown;
    } | null = null;
    if (psco && typeof psco === "object") {
      const psid =
        typeof psco.siteId === "string" ? psco.siteId : fromId;
      const pms = timeToMs(psco.time);
      previousSiteCheckOut = {
        siteId: psid,
        siteName: nameOf(psid),
        atMs: pms ?? atMs,
        photoUrl:
          typeof psco.photoUrl === "string" ? psco.photoUrl : null,
        gps: psco.gps ?? null,
      };
    }
    timeline.push({
      kind: "site_switch",
      atMs,
      fromSiteId: fromId,
      fromSiteName: nameOf(fromId),
      toSiteId: toId,
      toSiteName: nameOf(toId),
      arrivalPhotoUrl:
        typeof log.photoUrl === "string" ? log.photoUrl : null,
      arrivalGps: log.gps ?? null,
      previousSiteCheckOut,
    });
  }

  if (checkOut && checkOutMs != null) {
    const coSite =
      typeof plain.siteId === "string" && plain.siteId
        ? plain.siteId
        : currentSiteId ?? "";
    timeline.push({
      kind: "check_out",
      atMs: checkOutMs,
      siteId: coSite,
      siteName: nameOf(coSite),
      photoUrl:
        typeof checkOut.photoUrl === "string" ? checkOut.photoUrl : null,
      gps: checkOut.gps ?? null,
      auto: checkOut.auto === true,
    });
  }

  timeline.sort((a, b) => a.atMs - b.atMs);

  const visitedOrdered: { id: string; name: string }[] = [];
  const pushUnique = (id: string) => {
    if (!id) return;
    if (!visitedOrdered.some((x) => x.id === id)) {
      visitedOrdered.push({ id, name: nameOf(id) });
    }
  };
  pushUnique(initialSiteId);
  for (const log of logs) {
    if (typeof log.toSiteId === "string") pushUnique(log.toSiteId);
  }

  const sessionOpen = !!(checkIn && !checkOut);
  const nowMs = Date.now();
  const lastEventMs =
    timeline.length > 0 ? timeline[timeline.length - 1]!.atMs : checkInMs;
  const firstEventMs = checkInMs;
  const totalSessionMs =
    checkInMs != null
      ? checkOutMs != null
        ? checkOutMs - checkInMs
        : sessionOpen
          ? Math.max(0, nowMs - checkInMs)
          : null
      : null;

  /** Time blocks per site (check-in → first switch, switch → switch, last → checkout). */
  const segments: SiteSegment[] = [];
  if (checkInMs != null && initialSiteId) {
    let segStart = checkInMs;
    let segSite = initialSiteId;
    for (const ev of timeline) {
      if (ev.kind === "site_switch") {
        segments.push({
          siteId: segSite,
          siteName: nameOf(segSite),
          startMs: segStart,
          endMs: ev.atMs,
          durationMs: ev.atMs - segStart,
        });
        segSite = ev.toSiteId;
        segStart = ev.atMs;
      }
    }
    if (checkOutMs != null) {
      segments.push({
        siteId: segSite,
        siteName: nameOf(segSite),
        startMs: segStart,
        endMs: checkOutMs,
        durationMs: checkOutMs - segStart,
      });
    } else if (sessionOpen) {
      segments.push({
        siteId: segSite,
        siteName: nameOf(segSite),
        startMs: segStart,
        endMs: null,
        durationMs: null,
      });
    }
  }

  return {
    ok: true,
    day,
    workerId,
    absent: false,
    workerName,
    workerEmail,
    status: typeof plain.status === "string" ? plain.status : "present",
    currentSiteId,
    currentSiteName: currentSiteId ? nameOf(currentSiteId) : null,
    checkIn: checkIn
      ? {
          atMs: checkInMs,
          siteId: initialSiteId,
          siteName: nameOf(initialSiteId),
          photoUrl:
            typeof checkIn.photoUrl === "string" ? checkIn.photoUrl : null,
          gps: checkIn.gps ?? null,
        }
      : null,
    checkOut: checkOut
      ? {
          atMs: checkOutMs,
          siteId: currentSiteId ?? initialSiteId,
          siteName: nameOf(currentSiteId ?? initialSiteId),
          photoUrl:
            typeof checkOut.photoUrl === "string" ? checkOut.photoUrl : null,
          gps: checkOut.gps ?? null,
          auto: checkOut.auto === true,
        }
      : null,
    siteSwitchLogs: logs,
    timeline,
    analytics: {
      sessionOpen,
      switchCount: logs.length,
      uniqueSitesCount: visitedOrdered.length,
      sitesVisitedOrdered: visitedOrdered,
      firstEventMs,
      lastEventMs,
      totalSessionMs,
      segments,
    },
    overtime,
  };
}
