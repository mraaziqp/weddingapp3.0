export const ADMIN_COOKIE_NAME = "wedding_admin_session";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

export function getAllowedAdminKeys(): string[] {
  const combinedKeys = [
    process.env.ADMIN_ACCESS_KEYS,
    process.env.ADMIN_ACCESS_KEY,
  ]
    .filter(Boolean)
    .join(",");

  return combinedKeys
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

/**
 * middleware.ts only gates admin *pages* (its matcher lists page paths, not
 * /api/*), so any API route that reads or writes admin-only data must check
 * this itself — otherwise the page is "protected" while the data behind it
 * is one direct request away from anyone who finds the URL. Reads the same
 * httpOnly cookie the admin login route sets.
 */
export function isAuthorizedAdminRequest(req: { cookies: { get(name: string): { value: string } | undefined } }): boolean {
  const cookieKey = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieKey) return false;
  return getAllowedAdminKeys().includes(cookieKey);
}
