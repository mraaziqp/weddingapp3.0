'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';

const AiSecretaryForm = dynamic(() => import('@/components/ai-secretary-form').then(mod => ({ default: mod.AiSecretaryForm })), {
  loading: () => (
    <Card className="bg-black/40 border-white/5 animate-pulse">
      <div className="p-8 space-y-4">
        <div className="h-10 bg-white/10 rounded w-1/3"></div>
        <div className="h-6 bg-white/5 rounded w-1/2"></div>
        <div className="space-y-3 mt-6">
          <div className="h-10 bg-white/10 rounded"></div>
          <div className="h-10 bg-white/10 rounded"></div>
          <div className="h-24 bg-white/10 rounded"></div>
        </div>
      </div>
    </Card>
  ),
  ssr: false,
});

export default function AiSecretaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">AI Bride&apos;s Secretary</h1>
        <p className="text-muted-foreground">Automatically draft personalized WhatsApp messages for your guests.</p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <AiSecretaryForm />
      </Suspense>
    </div>
  );
}
