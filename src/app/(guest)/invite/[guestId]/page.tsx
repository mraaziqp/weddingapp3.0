'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LuxuryLoader } from '@/components/luxury-loader';
import { lookupHouseholdByQr } from '@/lib/supabase';

/**
 * Personal QR / "Copy Link" entry point. Resolves the household behind this
 * qr_code and hands off to the one real invitation experience (/invitation) —
 * this route used to render its own separate, older RSVP flow with fake
 * mock-data fallbacks; consolidated so every guest link leads to the same
 * tested, printable invitation regardless of which link format they got.
 */
export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params?.guestId as string;
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!guestId) return;

    Promise.all([
      fetch('/api/std/config').then(r => r.json()).catch(() => ({})),
      lookupHouseholdByQr(guestId).catch(() => null),
    ]).then(([configRes, household]) => {
      if (configRes?.config?.weddingDayMode === true) {
        router.replace(`/event?guestId=${guestId}`);
        return;
      }
      if (!household) {
        setNotFound(true);
        return;
      }
      router.replace(`/invitation?household=${household.id}&id=${household.id}`);
    });
  }, [guestId, router]);

  if (notFound) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.14),transparent_35%),linear-gradient(145deg,#fffdf9_0%,#f8f2e6_100%)] px-6 text-center">
        <div>
          <p className="font-headline text-3xl italic text-[#1C1C1C]">Link not recognized</p>
          <p className="mt-2 text-sm text-[#1C1C1C]/50">Please double-check the link you were given, or ask Razia or Abduraziq for a fresh one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.14),transparent_35%),linear-gradient(145deg,#fffdf9_0%,#f8f2e6_100%)]">
      <motion.div
        className="glass-card-static !bg-white/55 !border-[#d4af37]/20 w-[300px] text-center"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <LuxuryLoader label="Curating..." size="lg" />
      </motion.div>
    </div>
  );
}
