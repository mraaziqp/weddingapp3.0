'use client';
import { GuestDashboard } from '@/components/guest-dashboard';
import { lookupHouseholdByQr } from '@/lib/supabase';
import type { Household } from '@/lib/types';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LuxuryLoader } from '@/components/luxury-loader';

export default function CameraPageForGuest() {
  const params = useParams();
  const guestId = params?.guestId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);

  useEffect(() => {
    if (!guestId) { setIsLoading(false); return; }
    lookupHouseholdByQr(guestId)
      .catch(() => null)
      .then(res => { setHousehold(res); setIsLoading(false); });
  }, [guestId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6]">
        <LuxuryLoader label="Loading camera..." size="lg" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6] text-[#1C1C1C]">
        <div className="text-center space-y-3">
          <p className="text-2xl font-headline italic text-[#d4af37]">Invite not found</p>
          <p className="text-sm text-black/50">Please scan your QR code again.</p>
        </div>
      </div>
    );
  }

  return <GuestDashboard household={household} initialTab="capture" />;
}
