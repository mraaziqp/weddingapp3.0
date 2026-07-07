'use client';
import { households } from '@/lib/mock-data';
import type { Household } from '@/lib/types';
import { lookupHouseholdByQr } from '@/lib/supabase';
import { EnvelopeReveal } from '@/components/envelope-reveal';
import { InvitationRSVP } from '@/components/invitation-rsvp';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuxuryLoader } from '@/components/luxury-loader';
import { motion } from 'framer-motion';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params?.guestId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [showInvitation, setShowInvitation] = useState(false);
  const [dbHousehold, setDbHousehold] = useState<Household | null>(null);

  // This logic runs only on the client, avoiding SSR issues with localStorage.
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const isEventDay = localStorage.getItem('eventDayActive') === 'true';
        if (isEventDay && guestId) {
          // Redirect to the new event-day experience
          router.replace(`/event?guestId=${guestId}`);
        } else {
          Promise.all([
            fetch('/api/std/config').then(r => r.json()).catch(() => ({})),
            guestId ? lookupHouseholdByQr(guestId).catch(() => null) : Promise.resolve(null),
          ]).then(([configRes, householdRes]) => {
            setShowInvitation(configRes?.config?.invitationMode === true);
            setDbHousehold(householdRes);
            setIsLoading(false);
          });
        }
    }
  }, [guestId, router]);

  const household: Household | undefined = dbHousehold || households.find(h => h.qrCode === guestId);

  // Show a loading skeleton while we decide which route to show
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.14),transparent_35%),linear-gradient(145deg,#fffdf9_0%,#f8f2e6_100%)]">
            <motion.div
              className="glass-card !bg-white/55 !border-[#d4af37]/20 w-[300px] text-center"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <LuxuryLoader label="Curating..." size="lg" />
            </motion.div>
        </div>
    )
  }

  if (!household) {
    // Fallback for when guestId is not found but we're not in event day mode
     const fallbackHousehold: Household = {
      id: 'fallback',
      name: 'Esteemed Guest',
      address: '',
      guests: [],
      qrCode: 'FALLBACK-QR'
    };
    return showInvitation ? (
      <InvitationRSVP household={fallbackHousehold} />
    ) : (
      <EnvelopeReveal household={fallbackHousehold} />
    );
  }

  // Show invitation if mode is on, otherwise show the envelope reveal.
  return showInvitation ? (
    <InvitationRSVP household={household} />
  ) : (
    <EnvelopeReveal household={household} />
  );
}
