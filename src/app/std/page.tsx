/**
 * Public Save the Date page — /std
 *
 * This is the URL you share with guests (e.g. yoursite.com/std).
 * It shows the animated envelope reveal with no RSVP prompt.
 *
 * Tracking is handled client-side inside SaveTheDateEnvelope via
 * POST /api/std/track  (deduped with localStorage per device).
 */

import type { Metadata } from 'next';
import { SaveTheDateEnvelope } from '@/components/save-the-date-envelope';

export const metadata: Metadata = {
  title: 'Save the Date · Abdu-Raazig & Razia',
  description: 'Save the Date — 06.09.2026 · The Grand Pavilion, Cape Town',
  metadataBase: new URL('https://www.raziaraaziq.co.za'),
  openGraph: {
    title: 'Save the Date · Abdu-Raazig & Razia',
    description: 'Join us — Saturday, 6th September 2026 · The Grand Pavilion, Cape Town',
    type: 'website',
    url: 'https://www.raziaraaziq.co.za/std',
    siteName: 'Razia & Abdu-Raazig Wedding',
  },
};

export default function StdPage() {
  return <SaveTheDateEnvelope />;
}
