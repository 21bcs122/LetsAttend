import { Timestamp } from "firebase-admin/firestore";

/**
 * Recursively turn Firestore Timestamps into plain `{ seconds, nanoseconds }` so
 * `NextResponse.json` / `JSON.stringify` matches what the app expects (not `_seconds`).
 */
export function serializeFirestoreForJson(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (Array.isArray(value)) {
    return value.map((v) => serializeFirestoreForJson(v));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeFirestoreForJson(v);
    }
    return out;
  }
  return value;
}
