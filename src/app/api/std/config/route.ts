import { NextRequest, NextResponse } from 'next/server';
import { readConfigDoc, writeConfigDoc } from '@/lib/firestore-server';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';

const DEFAULTS = {
  partner1Short: 'Abduraziq',
  partner2Short: 'Razia',
  partner1Full: 'Abduraziq Parker',
  partner2Full: 'Razia Shade',
  date: '06.09.2026',
  dateVerbose: 'Saturday, 6th September 2026',
  venue: 'Tuscany in Rylands',
  city: 'Cape Town',
  bgImage: '/couple-bg.jpg',
  siteBgImage: '/couple-bg.jpg',
  redirectToStd: true,
};

const COLLECTION = 'std_config';

export async function GET() {
  try {
    const stored = await readConfigDoc<Record<string, unknown>>(COLLECTION);
    if (!stored) {
      return NextResponse.json({ config: DEFAULTS, designState: null });
    }
    const { designState, ...rest } = stored;
    const config = { ...DEFAULTS, ...rest };
    return NextResponse.json({ config, designState: designState ?? null });
  } catch (err) {
    console.error('[STD config] GET error:', err);
    return NextResponse.json({ config: DEFAULTS, designState: null });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { config: clientConfig, designState } = body;

    // Read existing to merge safely — a partial save must never drop fields
    // the editor didn't send.
    let existingConfig: Record<string, unknown> = {};
    let existingDesignState: unknown = null;
    const stored = await readConfigDoc<Record<string, unknown>>(COLLECTION);
    if (stored) {
      const { designState: oldDs, ...oldCfg } = stored;
      existingConfig = oldCfg;
      existingDesignState = oldDs ?? null;
    }

    const mergedConfig = { ...DEFAULTS, ...existingConfig, ...clientConfig };
    const payload = {
      ...mergedConfig,
      designState: designState ?? existingDesignState ?? null,
    };

    await writeConfigDoc(COLLECTION, payload);

    return NextResponse.json({
      ok: true,
      config: mergedConfig,
      designState: payload.designState,
    });
  } catch (err) {
    // Log the detail, return a generic message — String(err) leaked raw
    // database errors to the caller.
    console.error('[STD config] PUT error:', err);
    return NextResponse.json(
      { ok: false, error: 'Could not save the save-the-date settings.' },
      { status: 500 }
    );
  }
}


