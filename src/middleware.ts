import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, getAllowedAdminKeys } from "@/lib/admin-auth";
import {
  EVENT_HUB_ROUTE,
  EVENT_JOIN_ROUTE,
  getEventSession,
  isWeddingOnlyRoute,
} from "@/lib/event-access";

const ADMIN_ROUTES = [
  "/dashboard",
  "/ai-secretary",
  "/budget",
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
  "/event-access",
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

/**
 * Gates the entertainment-evening hub, and walls its guests in.
 *
 * Two directions, and both matter:
 *
 *  - No event session may reach /event-hub → bounced to the join screen.
 *  - An EVENT_ONLY_GUEST may not reach the wedding's own pages. Those guests
 *    were invited to the side event and not to the wedding, so the itinerary,
 *    seating plan, registry and invitation are not theirs to see — and the
 *    couple would rather they never learn what they were not invited to.
 *
 * Runs before the admin check so that an admin holding both cookies is never
 * bounced out of the hub by their own admin session.
 */
async function handleEventRoutes(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  const inHub = pathname === EVENT_HUB_ROUTE || pathname.startsWith(`${EVENT_HUB_ROUTE}/`);

  if (!inHub && !isWeddingOnlyRoute(pathname)) return null;

  const session = await getEventSession(request);

  if (inHub) {
    if (session) return NextResponse.next();
    const joinUrl = request.nextUrl.clone();
    joinUrl.pathname = EVENT_JOIN_ROUTE;
    joinUrl.search = "";
    return NextResponse.redirect(joinUrl);
  }

  // A wedding page. Only an EVENT_ONLY_GUEST is turned away; everyone else —
  // main guests, admins, and visitors with no event session at all — keeps the
  // access they had before this feature existed.
  if (session?.role === "EVENT_ONLY_GUEST") {
    const hubUrl = request.nextUrl.clone();
    hubUrl.pathname = EVENT_HUB_ROUTE;
    hubUrl.search = "";
    return NextResponse.redirect(hubUrl);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const eventResponse = await handleEventRoutes(request);
  if (eventResponse) return eventResponse;

  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  const allowedAdminKeys = getAllowedAdminKeys();
  const cookieKey = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const queryKey = searchParams.get(ADMIN_KEY_QUERY_PARAM);

  const brideKey = process.env.FAMILY_ACCESS_KEY_BRIDE;
  const groomKey = process.env.FAMILY_ACCESS_KEY_GROOM;

  if (queryKey) {
    const trimmed = queryKey.trim();
    if (brideKey && trimmed === brideKey) {
      return NextResponse.redirect(new URL(`/family/${brideKey}`, request.url));
    }
    if (groomKey && trimmed === groomKey) {
      return NextResponse.redirect(new URL(`/family/${groomKey}`, request.url));
    }
  }

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
    "/event-access/:path*",
    // The side-event hub, plus every wedding page an EVENT_ONLY_GUEST must be
    // kept out of. These must stay in step with WEDDING_ONLY_ROUTES in
    // lib/event-access.ts — a route listed there but missing here is simply
    // never checked, because the matcher decides whether middleware runs at all.
    "/event-hub/:path*",
    "/event/:path*",
    "/invitation/:path*",
    "/nikkah-invite/:path*",
    "/gifts/:path*",
    "/family/:path*",
    "/invite/:path*",
    "/live-wall/:path*",
    "/venue-screen/:path*",
  ],
};
