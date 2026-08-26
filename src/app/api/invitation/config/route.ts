import { NextRequest, NextResponse } from 'next/server';
import { readConfigDoc, writeConfigDoc } from '@/lib/firestore-server';
import { DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

/**
 * The invitation card's content, edited in the admin Invitation Editor and
 * read by every guest-facing page.
 *
 * Stored in the `invitation_config/main` Firestore document. It previously
 * lived in a Neon Postgres table — a second database alongside Supabase, kept
 * alive for two config blobs and an RSVP audit log.
 */

const COLLECTION = 'invitation_config';

// Every guest page hits this on load — cache it at the edge for 15s so repeat
// visits (and pages like the digital pass) don't each cost a read.
export const revalidate = 15;

export async function GET() {
  try {
    const stored = await readConfigDoc<Record<string, string>>(COLLECTION);
    if (!stored) {
      return NextResponse.json(DEFAULT_INVITATION_CONFIG);
    }

    // Two one-off content migrations kept from the original route: an early
    // build shipped placeholder copy, and the arrival time was corrected after
    // invitations had already been saved.
    const copy = { ...stored };
    let changed = false;

    if (copy.title === 'Together in Love') {
      Object.assign(copy, DEFAULT_INVITATION_CONFIG);
      changed = true;
    }
    if (
      copy.extraInfo &&
      copy.extraInfo.includes('at 5:30 PM') &&
      !copy.extraInfo.includes('5:00 PM')
    ) {
      copy.extraInfo = copy.extraInfo.replace('at 5:30 PM', 'at 5:00 PM for 5:30 PM');
      changed = true;
    }

    if (changed) {
      console.log('[Invitation Config] Auto-migrating old config to new defaults...');
      await writeConfigDoc(COLLECTION, copy);
    }

    return NextResponse.json(copy);
  } catch (err) {
    console.error('[Invitation Config] GET error:', err);
    // Never break the guest-facing page over this — fall back to sensible
    // defaults (e.g. the document not existing yet on a fresh project).
    return NextResponse.json(DEFAULT_INVITATION_CONFIG);
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const config = await req.json();
    await writeConfigDoc(COLLECTION, config);
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    // Log the detail, return a generic message — String(err) leaked raw
    // database errors to the caller.
    console.error('[Invitation Config] POST error:', err);
    return NextResponse.json(
      { ok: false, error: 'Could not save the invitation settings.' },
      { status: 500 }
    );
  }
}
