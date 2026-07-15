import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return neon(url);
}

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS invitation_config (
      id   TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Every guest page hits this on load — cache it at the edge for 15s so
// repeat visits (and pages like the digital pass) don't all hit Neon.
export const revalidate = 15;

export async function GET() {
  try {
    const sql = getDb();
    // No ensureTable() here: this is the hot path (every guest page load),
    // and the table is guaranteed to exist once POST has run it once.
    const rows = await sql`SELECT config FROM invitation_config WHERE id = 'main'`;

    if (!rows.length) {
      return NextResponse.json(DEFAULT_INVITATION_CONFIG);
    }

    const dbConfig = rows[0].config;
    let configObj = dbConfig;

    if (dbConfig && typeof dbConfig === 'object') {
      let changed = false;
      const copy = { ...dbConfig } as unknown as Record<string, string>;

      if (copy.title === 'Together in Love') {
        Object.assign(copy, DEFAULT_INVITATION_CONFIG);
        changed = true;
      }
      if (copy.extraInfo && copy.extraInfo.includes('at 5:30 PM') && !copy.extraInfo.includes('5:00 PM')) {
        copy.extraInfo = copy.extraInfo.replace('at 5:30 PM', 'at 5:00 PM for 5:30 PM');
        changed = true;
      }

      if (changed) {
        console.log('[Invitation Config] Auto-migrating old config to new defaults...');
        await ensureTable();
        await sql`
          INSERT INTO invitation_config (id, config)
          VALUES ('main', ${JSON.stringify(copy)})
          ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config
        `;
        configObj = copy;
      }
    }

    return NextResponse.json(configObj);
  } catch (err) {
    console.error('[Invitation Config] GET error:', err);
    // Never break the guest-facing page over this — fall back to sensible
    // defaults (e.g. the table not existing yet on a fresh database).
    return NextResponse.json(DEFAULT_INVITATION_CONFIG);
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();
    const sql = getDb();
    await ensureTable();

    await sql`
      INSERT INTO invitation_config (id, config)
      VALUES ('main', ${JSON.stringify(config)})
      ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config
    `;

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    console.error('[Invitation Config] POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
