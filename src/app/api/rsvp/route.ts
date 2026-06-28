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
    CREATE TABLE IF NOT EXISTS rsvp_responses (
      id SERIAL PRIMARY KEY,
      guest_id TEXT,
      household_id TEXT,
      guest_name TEXT,
      status TEXT,
      dietary_restrictions TEXT,
      message TEXT,
      responded_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestId, householdId, guestName, status, dietaryRestrictions, message } = body;

    if (!guestId || !status) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const sql = getDb();
    await ensureTable();

    await sql`
      INSERT INTO rsvp_responses (guest_id, household_id, guest_name, status, dietary_restrictions, message)
      VALUES (${guestId}, ${householdId}, ${guestName}, ${status}, ${dietaryRestrictions || null}, ${message || null})
    `;

    return NextResponse.json({
      ok: true,
      message: `RSVP recorded: ${guestName} - ${status}`,
    });
  } catch (err) {
    console.error('[RSVP] POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTable();
    const responses = await sql`SELECT * FROM rsvp_responses ORDER BY responded_at DESC LIMIT 100`;

    return NextResponse.json({ responses, count: responses.length });
  } catch (err) {
    console.error('[RSVP] GET error:', err);
    return NextResponse.json({ responses: [], count: 0 });
  }
}
