import { NextRequest, NextResponse } from 'next/server';
import { extractText, getDocumentProxy } from 'unpdf';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { parseSeatingText, matchGuestsToSeats } from '@/lib/seating-import';
import { fetchGuestDirectory } from '@/lib/firestore-server';

/**
 * POST /api/seating/import — reads a seating-chart PDF and returns what it
 * found. Admin only.
 *
 * This deliberately writes nothing. The couple sees the parsed tables, how
 * each name was matched, and who is still unseated, and only then confirms
 * through /api/seating. Seating a family at the wrong table on the strength of
 * a fuzzy name match is not a mistake worth automating.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Comfortably above a text seating chart while staying under the platform's
// request body cap, which rejects larger bodies before this handler runs.
const MAX_PDF_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const candidate = form.get('file');
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: 'Could not read the upload' }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: 'No PDF was attached' }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: 'That file is empty' }, { status: 400 });
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: `That PDF is ${(file.size / 1048576).toFixed(1)}MB. The limit is 4MB.` },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the magic number rather than trusting the browser's content type,
  // which is attacker-controlled and wrong often enough to matter anyway.
  if (String.fromCharCode(...bytes.slice(0, 4)) !== '%PDF') {
    return NextResponse.json({ error: 'That file is not a PDF' }, { status: 400 });
  }

  let text: string;
  try {
    const doc = await getDocumentProxy(bytes);
    ({ text } = await extractText(doc, { mergePages: true }));
  } catch (err) {
    console.error('[Seating] PDF text extraction failed:', err);
    return NextResponse.json(
      { error: 'That PDF could not be read. It may be password-protected or corrupt.' },
      { status: 422 }
    );
  }

  const parsed = parseSeatingText(text);
  const guests = await fetchGuestDirectory();
  const result = matchGuestsToSeats(parsed.tables, guests);

  const nameById = new Map(guests.map(g => [g.id, `${g.firstName} ${g.lastName}`.trim()]));

  return NextResponse.json({
    layout: parsed.layout,
    warnings: parsed.warnings,
    sourceFileName: file.name,
    tables: parsed.tables,
    assignments: result.assignments.map(a => ({
      ...a,
      guestName: a.guestId ? nameById.get(a.guestId) ?? null : null,
    })),
    unseated: result.unseated.map(g => ({
      id: g.id,
      name: `${g.firstName} ${g.lastName}`.trim(),
    })),
    matched: result.matched,
    unmatched: result.unmatched,
  });
}
