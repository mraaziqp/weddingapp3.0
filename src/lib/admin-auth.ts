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
