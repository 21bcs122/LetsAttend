/** Must match the email you set in Firestore rules for super admin. */
export const APP_NAME = "MTESAttandance";

/** Product creator / vendor line: “by {APP_VENDOR}”. */
export const APP_VENDOR = "Constcode";

/** MTES wordmark blue (logo). */
export const BRAND_MTES_BLUE = "#2A3B8F";

export function getSuperAdminEmail(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}
