
'use client';
import { households } from '@/lib/mock-data';
import type { Household } from '@/lib/types';
import { EnvelopeReveal } from '@/components/envelope-reveal';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const guestId = params?.guestId as string;

  const [isLoading, setIsLoading] = useState(true);

  // This logic runs only on the client, avoiding SSR issues with localStorage.
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const isEventDay = localStorage.getItem('eventDayActive') === 'true';
        if (isEventDay && guestId) {
          // Redirect to the new event-day experience
          router.replace(`/event?guestId=${guestId}`);
        } else {
          // If not event day, proceed to show the invitation.
          setIsLoading(false);
        }
    }
  }, [guestId, router]);
  
  const household: Household | undefined = households.find(h => h.qrCode === guestId);

  // Show a loading skeleton while we decide which route to show
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#FAF9F6]">
            <Skeleton className="h-32 w-32 rounded-full" />
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
    return <EnvelopeReveal household={fallbackHousehold} />;
  }

  // On the event day, this component will be replaced by the redirect.
  // Otherwise, it will show the envelope reveal.
  return <EnvelopeReveal household={household} />;
}
