'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2 } from 'lucide-react';
import { InvitationCard, PetalDrift, WeddingBells, easeLuxe } from '@/components/invitation-card';
import { DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { downloadElementAsImage } from '@/lib/download-card';
import { useToast } from '@/hooks/use-toast';

/* A generic, non-personalized Nikaah-only invite — no Reception details,
   no guest name — safe to download once and forward to anyone. The
   personal, per-household /invitation link stays the one used for RSVPs. */
export default function NikkahInvitePage() {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadElementAsImage('invitation-print-card', 'nikaah-invitation.png');
    } catch (err) {
      console.error('[Nikkah Invite] Download failed:', err);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Please try Print instead (Ctrl/Cmd+P) — it works even when the download doesn’t.',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-4 py-14">
      <PetalDrift count={6} />
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: easeLuxe }}
        className="text-center"
      >
        <WeddingBells className="mx-auto mb-2 h-6 w-9 text-[#8a6f1f]/60" />
        <p className="font-body text-[10px] uppercase tracking-[0.35em] text-[#8a6f1f]/70">
          Generic Nikaah invitation
        </p>
        <p className="mt-2 max-w-md font-body text-sm text-[#4c4436]/70">
          No name, no Reception details — just the Nikaah. Download this once and forward
          it to anyone; it doesn&apos;t need a personal link.
        </p>
      </motion.div>

      <InvitationCard config={DEFAULT_INVITATION_CONFIG} nikkahOnly printId />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1, ease: easeLuxe }}
        className="flex flex-col items-center gap-3"
      >
        <button
          onClick={download}
          disabled={downloading}
          className="flex items-center gap-2 rounded-full border border-[#8a6f1f]/35 bg-[#122217] px-6 py-3 font-body text-[10px] uppercase tracking-[0.24em] text-[#f6e7b7] shadow-lg transition-colors hover:bg-[#1a3220] disabled:opacity-60"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {downloading ? 'Preparing…' : 'Download Nikaah Invite'}
        </button>
        <p className="text-center font-body text-[9px] uppercase tracking-[0.2em] text-[#4c4436]/40">
          Save it, print it, or share it straight to WhatsApp
        </p>
      </motion.div>
    </div>
  );
}
