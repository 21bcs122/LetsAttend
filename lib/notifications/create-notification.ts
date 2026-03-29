import type { Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";

export async function createNotification(
  db: Firestore,
  params: {
    userId: string;
    title: string;
    body: string;
    kind: "assignment" | "system";
    /** For assignment: sites the worker may use for check-in (drives Work deep link). */
    assignedSiteIds?: string[];
  }
): Promise<string> {
  const ref = await db.collection("notifications").add({
    userId: params.userId,
    title: params.title,
    body: params.body,
    kind: params.kind,
    ...(params.assignedSiteIds !== undefined
      ? { assignedSiteIds: params.assignedSiteIds }
      : {}),
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
