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
  openGraph: {
    title: 'Save the Date · Abdu-Raazig & Razia',
    description: 'Join us — 6th September 2026',
    type: 'website',
  },
};

export default function StdPage() {
  return <SaveTheDateEnvelope />;
}
