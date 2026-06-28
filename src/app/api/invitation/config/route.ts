import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

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

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const rows = await sql`SELECT config FROM invitation_config WHERE id = 'main'`;

    if (!rows.length) {
      return NextResponse.json({
        title: 'Together in Love',
        subtitle: 'Abduraziq & Razia',
        dateTime: 'Saturday, 6th September 2026 at 6:00 PM',
        location: 'Tuscany in Rylands, Cape Town',
        dressCode: 'Formal Attire',
        rsvpDeadline: 'August 20, 2026',
        extraInfo: 'Reception to follow. Transportation available.',
      });
    }

    return NextResponse.json(rows[0].config);
  } catch (err) {
    console.error('[Invitation Config] GET error:', err);
    return NextResponse.json(
      { title: 'Error loading config' },
      { status: 500 }
    );
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
