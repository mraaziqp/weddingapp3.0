import { NextRequest, NextResponse } from 'next/server';
import { fetchHouseholds } from '@/lib/supabase';
import { isAuthorizedAdminRequest } from '@/lib/admin-auth';
import { toCsv } from '@/lib/csv';

/**
 * GET /api/export/guests
 * Returns a downloadable CSV with all guest data for venue coordinators.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const households = await fetchHouseholds().catch(() => []);

  const rows: unknown[][] = [
    [
      'Household Name',
      'Guest First Name',
      'Guest Last Name',
      'RSVP Status',
      'Dietary Requirements',
      'Table',
    ],
  ];

  for (const household of households) {
    for (const guest of household.guests) {
      rows.push([
        household.name,
        guest.firstName,
        guest.lastName,
        guest.rsvpStatus,
        guest.dietaryRestrictions ?? '',
        '', // Table assignment — populated when seating is finalised
      ]);
    }
  }

  const csv = toCsv(rows);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wedu-guest-manifest.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
