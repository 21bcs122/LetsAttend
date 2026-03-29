/** Supports API-normalized `{ seconds }` and raw JSON `{ _seconds }` from Firestore. */
export function getFirestoreSeconds(t: unknown): number | undefined {
  if (!t || typeof t !== "object") return undefined;
  const o = t as Record<string, unknown>;
  if (typeof o.seconds === "number") return o.seconds;
  if (typeof o._seconds === "number") return o._seconds;
  return undefined;
}
