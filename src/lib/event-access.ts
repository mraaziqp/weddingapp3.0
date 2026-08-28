/**
 * Access control for the side-event ("Memory Panel") experience.
 * ─────────────────────────────────────────────────────────────
 * Three tiers share one signed cookie:
 *
 *   MAIN_GUEST        coming to the wedding — sees everything
 *   EVENT_ONLY_GUEST  invited to the entertainment evening only — walled into
 *                     /event-hub, never sees the itinerary or seating
 *   ADMIN             the couple — same hub plus moderation controls
 *
 * The session is a stateless HMAC-signed token rather than a Firestore lookup
 * because `middleware.ts` runs on the Edge runtime, where firebase-admin
 * cannot be imported. Everything here is therefore built on Web Crypto, which
 * exists in the Edge runtime, in Node, and in the browser — so the exact same
 * verification runs in middleware and in the Node API routes.
 *
 * Required env (see .env.example):
 *   EVENT_PIN               4-digit quick-join code shouted out at the venue
 *   EVENT_SESSION_SECRET    HMAC key for session + invite tokens
 */

export const EVENT_COOKIE_NAME = 'wedding_event_session';
/** One night plus the morning after — long enough that nobody is logged out mid-party. */
export const EVENT_SESSION_MAX_AGE = 60 * 60 * 18;

export type EventRole = 'MAIN_GUEST' | 'EVENT_ONLY_GUEST' | 'ADMIN';

export type EventSession = {
  /** Stable id for this guest — credits their uploads and keys their score. */
  sub: string;
  name: string;
  role: EventRole;
  /** Unix seconds. Checked on every verify. */
  exp: number;
};

/** Payload of a personalised magic link, before it is exchanged for a session. */
export type InviteToken = {
  sub: string;
  name: string;
  role: EventRole;
  /** Issued-at, unix seconds — lets us expire links without storing them. */
  iat: number;
};

const ROLES: EventRole[] = ['MAIN_GUEST', 'EVENT_ONLY_GUEST', 'ADMIN'];

export function isEventRole(value: unknown): value is EventRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value);
}

// ── Secret ────────────────────────────────────────────────────────────────

/**
 * Falls back to the admin key so a deploy that never set EVENT_SESSION_SECRET
 * still issues valid sessions instead of failing shut on the night. Both are
 * server-only secrets; the fallback is weaker only in that rotating the admin
 * key also invalidates every event session, which is acceptable.
 */
function sessionSecret(): string {
  const secret =
    process.env.EVENT_SESSION_SECRET ||
    process.env.ADMIN_ACCESS_KEY ||
    process.env.ADMIN_ACCESS_KEYS?.split(',')[0];

  if (!secret) {
    throw new Error(
      'EVENT_SESSION_SECRET (or ADMIN_ACCESS_KEY) must be set to issue event sessions'
    );
  }
  return secret;
}

/** True when the hub can issue sessions at all, so callers can degrade gracefully. */
export function isEventAccessConfigured(): boolean {
  try {
    sessionSecret();
    return true;
  } catch {
    return false;
  }
}

// ── base64url ─────────────────────────────────────────────────────────────
// Cookie values must survive a round trip through an HTTP header, so the
// standard alphabet's `+` and `/` are out.

function b64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Returns a view over a freshly allocated ArrayBuffer rather than
 * `Uint8Array.from`, whose type is `Uint8Array<ArrayBufferLike>` — that could
 * in principle be backed by a SharedArrayBuffer, which `crypto.subtle` will
 * not accept as a BufferSource.
 */
function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Signing ───────────────────────────────────────────────────────────────

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/** Signs any JSON payload as `<base64url body>.<base64url signature>`. */
async function sign(payload: unknown): Promise<string> {
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    new TextEncoder().encode(body)
  );
  return `${body}.${b64urlEncode(new Uint8Array(signature))}`;
}

/**
 * Verifies a signed token and returns its payload, or null.
 *
 * Uses `crypto.subtle.verify` rather than re-signing and comparing strings —
 * a `===` on two signatures short-circuits on the first differing byte and so
 * leaks, through timing, how much of a forged signature was correct.
 */
async function unsign<T>(token: string | undefined | null): Promise<T | null> {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      b64urlDecode(signature),
      new TextEncoder().encode(body)
    );
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as T;
  } catch {
    // Malformed base64, malformed JSON, or a missing secret — all mean "no
    // valid session", and none of them should throw into the middleware.
    return null;
  }
}

// ── Sessions ──────────────────────────────────────────────────────────────

export async function createEventSession(input: {
  sub: string;
  name: string;
  role: EventRole;
}): Promise<string> {
  const session: EventSession = {
    sub: input.sub,
    name: input.name.slice(0, 60),
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + EVENT_SESSION_MAX_AGE,
  };
  return sign(session);
}

export async function readEventSession(
  token: string | undefined | null
): Promise<EventSession | null> {
  const session = await unsign<EventSession>(token);
  if (!session || typeof session.sub !== 'string' || !isEventRole(session.role)) return null;
  if (typeof session.exp !== 'number' || session.exp * 1000 <= Date.now()) return null;
  return session;
}

/** Pulls the session straight off a request — the shape both routes and middleware hold. */
export async function getEventSession(req: {
  cookies: { get(name: string): { value: string } | undefined };
}): Promise<EventSession | null> {
  return readEventSession(req.cookies.get(EVENT_COOKIE_NAME)?.value);
}

export function eventCookieOptions() {
  return {
    name: EVENT_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: EVENT_SESSION_MAX_AGE,
  };
}

// ── Magic links ───────────────────────────────────────────────────────────

/** Links are generated days ahead but must not stay live forever. */
const INVITE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createInviteToken(input: {
  sub: string;
  name: string;
  role: EventRole;
}): Promise<string> {
  const invite: InviteToken = {
    sub: input.sub,
    name: input.name.slice(0, 60),
    role: input.role,
    iat: Math.floor(Date.now() / 1000),
  };
  return sign(invite);
}

export async function readInviteToken(
  token: string | undefined | null
): Promise<InviteToken | null> {
  const invite = await unsign<InviteToken>(token);
  if (!invite || typeof invite.sub !== 'string' || !isEventRole(invite.role)) return null;
  if (typeof invite.iat !== 'number') return null;
  if (Date.now() / 1000 - invite.iat > INVITE_MAX_AGE_SECONDS) return null;
  return invite;
}

// ── PIN ───────────────────────────────────────────────────────────────────

/**
 * Constant-time compare for the shared quick-join PIN.
 *
 * A 4-digit code is only 10,000 possibilities, so the rate limit on the
 * session route is what actually protects it — but there is no reason to also
 * hand out a timing oracle for free.
 */
export function checkEventPin(candidate: string): boolean {
  const expected = process.env.EVENT_PIN;
  if (!expected) return false;

  const a = new TextEncoder().encode(candidate);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

// ── Route boundaries ──────────────────────────────────────────────────────

/** The hub itself, plus the join screen that leads into it. */
export const EVENT_HUB_ROUTE = '/event-hub';
export const EVENT_JOIN_ROUTE = '/join';

/**
 * Wedding-day surfaces an EVENT_ONLY_GUEST must never reach. They were invited
 * to the entertainment evening; the itinerary, seating plan, registry and
 * invitation are not theirs to see.
 */
export const WEDDING_ONLY_ROUTES = [
  '/event',
  '/invitation',
  '/nikkah-invite',
  '/seating',
  '/gifts',
  '/family',
  '/invite',
  '/live-wall',
  '/venue-screen',
];

export function isWeddingOnlyRoute(pathname: string): boolean {
  return WEDDING_ONLY_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );
}
