import { NextResponse } from 'next/server';
import { isAdminConfigured, adminDb } from '@/lib/firebase-admin';
import { isDriveConfigured } from '@/lib/google-drive';

/**
 * What this deployment can actually reach.
 *
 * Written after a deploy went out with none of its environment variables set:
 * the app built and served fine, but every database read failed, so the guest
 * list rendered empty and it looked exactly like data loss. There was no way
 * to tell that apart from a real outage without reading server logs.
 *
 * Reports configuration and connectivity separately, because "the variable is
 * missing" and "the credentials are wrong" need different fixes. Deliberately
 * public and deliberately free of detail — counts and booleans, never a guest
 * name or a key.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const database = {
    configured: isAdminConfigured(),
    reachable: false,
    households: null as number | null,
    guests: null as number | null,
    error: null as string | null,
  };

  if (database.configured) {
    try {
      const db = adminDb();
      const [households, guests] = await Promise.all([
        db.collection('households').count().get(),
        db.collection('guests').count().get(),
      ]);
      database.reachable = true;
      database.households = households.data().count;
      database.guests = guests.data().count;
    } catch (err) {
      database.error = err instanceof Error ? err.message.slice(0, 200) : 'unknown error';
    }
  } else {
    database.error = 'FIREBASE_SERVICE_ACCOUNT_B64 is not set';
  }

  const media = {
    configured: isDriveConfigured(),
    error: isDriveConfigured()
      ? null
      : 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN are not all set',
  };

  const ok = database.reachable && media.configured;

  return NextResponse.json(
    { ok, database, media },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
