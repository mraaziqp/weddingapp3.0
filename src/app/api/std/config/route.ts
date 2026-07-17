import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
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

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

/** Create the config table if it doesn't exist yet. */
async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS std_config (
      id   TEXT PRIMARY KEY,
      config JSONB NOT NULL
    )
  `;
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const rows = await sql`SELECT config FROM std_config WHERE id = 'main'`;
    if (!rows.length || !rows[0].config) {
      return NextResponse.json({ config: DEFAULTS, designState: null });
    }
    const stored = rows[0].config as Record<string, unknown>;
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

    const sql = getDb();
    await ensureTable();

    // Read existing to merge safely
    let existingConfig: Record<string, unknown> = {};
    let existingDesignState: unknown = null;
    const rows = await sql`SELECT config FROM std_config WHERE id = 'main'`;
    if (rows.length && rows[0].config) {
      const stored = rows[0].config as Record<string, unknown>;
      const { designState: oldDs, ...oldCfg } = stored;
      existingConfig = oldCfg;
      existingDesignState = oldDs ?? null;
    }

    const mergedConfig = { ...DEFAULTS, ...existingConfig, ...clientConfig };
    const payload = {
      ...mergedConfig,
      designState: designState ?? existingDesignState ?? null,
    };

    await sql`
      INSERT INTO std_config (id, config)
      VALUES ('main', ${JSON.stringify(payload)})
      ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config
    `;

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


