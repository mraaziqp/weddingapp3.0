import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, getAllowedAdminKeys } from "@/lib/admin-auth";

const ADMIN_ROUTES = [
  "/dashboard",
  "/ai-secretary",
  "/budget",
  "/guest-tester",
  "/guests",
  "/invitation-editor",
  "/invites",
  "/planner",
  "/playlist",
  "/qr-scanner",
  "/registry",
  "/rsvp-analytics",
  "/seating",
  "/theme",
  "/vault",
  "/vendors",
  "/save-the-date",
];

const ADMIN_KEY_QUERY_PARAM = "adminKey";
const LOGIN_FALLBACK_ROUTE = "/admin";

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
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });
    return response;
  }

  if (validCookie) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = LOGIN_FALLBACK_ROUTE;
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/ai-secretary/:path*",
    "/budget/:path*",
    "/guest-tester/:path*",
    "/guests/:path*",
    "/invitation-editor/:path*",
    "/invites/:path*",
    "/planner/:path*",
    "/playlist/:path*",
    "/qr-scanner/:path*",
    "/registry/:path*",
    "/rsvp-analytics/:path*",
    "/seating/:path*",
    "/theme/:path*",
    "/vault/:path*",
    "/vendors/:path*",
    "/save-the-date/:path*",
  ],
};
