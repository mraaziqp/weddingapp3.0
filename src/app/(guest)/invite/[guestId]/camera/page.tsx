'use client';

import { DisposableCameraUI } from '@/components/disposable-camera-ui';
import { lookupHouseholdByQr } from '@/lib/supabase';
import type { Household } from '@/lib/types';
import { useRouter, useParams, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LuxuryLoader } from '@/components/luxury-loader';

export default function CameraPageForGuest() {
  const params = useParams();
  const router = useRouter();
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
      <div className="flex h-screen items-center justify-center bg-[#111]">
        <LuxuryLoader label="Loading camera..." size="lg" />
      </div>
    );
  }

  if (!household) {
    // notFound() can still be called in client components via next/navigation
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6] text-[#1C1C1C]">
        <div className="text-center space-y-3">
          <p className="text-2xl font-headline italic text-[#d4af37]">Invite not found</p>
          <p className="text-sm text-black/50">Please scan your QR code again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh]">
      <Button asChild variant="ghost" className="absolute top-4 left-4 z-20 h-12 w-12 rounded-full bg-black/10 text-black hover:bg-black/20">
        <Link href={`/event?guestId=${guestId}`}>
          <ArrowLeft />
        </Link>
      </Button>
      <DisposableCameraUI
        guestId={guestId}
        visibility="public"
        onUploadComplete={() => {
          router.replace(`/event?guestId=${guestId}`);
        }}
      />
    </div>
  );
}
