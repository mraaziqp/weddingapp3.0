import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const BUCKET = 'wedding-config';
const FILE = 'std-config.json';

const DEFAULTS = {
  partner1Short: 'Abdu-Raazig',
  partner2Short: 'Razia',
  partner1Full: 'Abdu-Raazig Sarber',
  partner2Full: 'Razia Shade',
  date: '06.09.2026',
  dateVerbose: 'Saturday, 6th September 2026',
  venue: 'The Grand Pavilion',
  city: 'Cape Town',
  bgImage: '/couple-bg.jpg',
  siteBgImage: '/site-bg.jpg',
  redirectToStd: true,
};

/** Ensure the storage bucket exists (safe to call even if it already exists). */
async function ensureBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 1048576, // 1 MB — more than enough for JSON config
  });
  // Ignore "already exists" errors
  if (error && !error.message?.toLowerCase().includes('already exists')) {
    console.warn('[STD config] createBucket warning:', error.message);
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(FILE);

    if (error || !data) {
      return NextResponse.json({ config: DEFAULTS, designState: null });
    }

    const stored = JSON.parse(await data.text()) as {
      config: Record<string, unknown>;
      designState: unknown;
    };

    const config = { ...DEFAULTS, ...stored.config };
    return NextResponse.json({ config, designState: stored.designState ?? null });
  } catch (err) {
    console.error('[STD config] GET error:', err);
    return NextResponse.json({ config: DEFAULTS, designState: null });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { config: clientConfig, designState } = body;

    // Read existing config to merge safely
    let existingConfig: Record<string, unknown> = {};
    let existingDesignState: unknown = null;
    try {
      const { data } = await supabaseAdmin.storage.from(BUCKET).download(FILE);
      if (data) {
        const stored = JSON.parse(await data.text()) as {
          config: Record<string, unknown>;
          designState: unknown;
        };
        existingConfig = stored.config ?? {};
        existingDesignState = stored.designState ?? null;
      }
    } catch { /* bucket or file doesn't exist yet — that's fine */ }

    const mergedConfig = { ...DEFAULTS, ...existingConfig, ...clientConfig };
    const payload = {
      config: mergedConfig,
      designState: designState ?? existingDesignState ?? null,
    };

    await ensureBucket();

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(FILE, JSON.stringify(payload), {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      console.error('[STD config] Storage upload failed:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      config: mergedConfig,
      designState: payload.designState,
    });
  } catch (err) {
    console.error('[STD config] PUT error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
