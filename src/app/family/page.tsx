'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FamilyLandingPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    router.push(`/family/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050705] px-4 py-10">
      <div className="fixed inset-0 -z-20 h-full w-full bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.12),transparent_40%),linear-gradient(160deg,#0a0f0c,#050705)]" />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative z-10 w-full max-w-sm !p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-[0_0_24px_rgba(15,118,110,0.5)]">
          <span className="text-lg font-black text-black">R&amp;A</span>
        </div>
        <h1 className="font-headline text-3xl italic text-luxe-gradient">Add Your Guests</h1>
        <p className="mt-2 text-sm text-white/50">
          Enter the family code Razia or Abduraziq gave you to add your side&apos;s guests.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4 text-left">
          <div className="relative">
            <KeyRound size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Family code"
              autoFocus
              autoComplete="off"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button type="submit" className="w-full gap-2 bg-[#d4af37] text-black hover:bg-[#c49f2f]">
            <ArrowRight size={16} />
            Continue
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
