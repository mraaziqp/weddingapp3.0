import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROUTES = [
  "/dashboard",
  "/ai-secretary",
  "/guests",
  "/invites",
  "/planner",
  "/playlist",
  "/qr-scanner",
  "/registry",
  "/seating",
  "/theme",
  "/vault",
  "/save-the-date",
];

const ADMIN_COOKIE_NAME = "wedding_admin_session";
const ADMIN_KEY_QUERY_PARAM = "adminKey";
const INVITE_FALLBACK_ROUTE = "/event";

function getAllowedAdminKeys(): string[] {
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

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function getUrlWithoutAdminQuery(request: NextRequest): URL {
  const sanitizedUrl = request.nextUrl.clone();
  sanitizedUrl.searchParams.delete(ADMIN_KEY_QUERY_PARAM);
  return sanitizedUrl;
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  const allowedAdminKeys = getAllowedAdminKeys();
  const cookieKey = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const queryKey = searchParams.get(ADMIN_KEY_QUERY_PARAM);
  const validCookie = Boolean(cookieKey) && allowedAdminKeys.includes(cookieKey!);
  const validQuery = Boolean(queryKey) && allowedAdminKeys.includes(queryKey!);

  if (validQuery) {
    // Accept one-time key in URL, then persist it in a secure HTTP cookie.
    const response = NextResponse.redirect(getUrlWithoutAdminQuery(request));
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: queryKey!,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return response;
  }

  if (validCookie) {
    return NextResponse.next();
  }

  const inviteUrl = request.nextUrl.clone();
  inviteUrl.pathname = INVITE_FALLBACK_ROUTE;
  inviteUrl.search = "";
  return NextResponse.redirect(inviteUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ai-secretary/:path*",
    "/guests/:path*",
    "/invites/:path*",
    "/planner/:path*",
    "/playlist/:path*",
    "/qr-scanner/:path*",
    "/registry/:path*",
    "/seating/:path*",
    "/theme/:path*",
    "/vault/:path*",
    "/save-the-date/:path*",
  ],
};
