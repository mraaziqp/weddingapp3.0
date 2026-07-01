import { NextResponse } from 'next/server';
import { fetchHouseholds } from '@/lib/supabase';

/**
 * GET /api/export/guests
 * Returns a downloadable CSV with all guest data for venue coordinators.
 */
export async function GET() {
  const households = await fetchHouseholds().catch(() => []);
  const rows: string[] = [];

  // Header row
  rows.push([
    'Household Name',
    'Guest First Name',
    'Guest Last Name',
    'RSVP Status',
    'Dietary Requirements',
    'Table',
  ].map(escapeCsvField).join(','));

  for (const household of households) {
    for (const guest of household.guests) {
      rows.push([
        household.name,
        guest.firstName,
        guest.lastName,
        guest.rsvpStatus,
        guest.dietaryRestrictions ?? '',
        '', // Table assignment — populated when seating is finalised
      ].map(escapeCsvField).join(','));
    }
  }

  const csv = rows.join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wedu-guest-manifest.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeCsvField(value: string): string {
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
