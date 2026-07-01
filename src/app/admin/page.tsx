'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Back-compat: ?adminKey=... in the URL logs you straight in, same as before.
  useEffect(() => {
    const prefill = searchParams.get('adminKey');
    if (prefill) {
      setKey(prefill);
      submitKey(prefill);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitKey(value: string) {
    if (!value.trim()) {
      setError('Please enter your access key.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: value.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace('/dashboard');
        router.refresh();
      } else {
        setError(data.error ?? 'That key is incorrect. Please try again.');
        setIsSubmitting(false);
      }
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050705] px-4 py-10">
      {/* Aurora background */}
      <div className="fixed inset-0 -z-20 h-full w-full bg-[linear-gradient(140deg,var(--aurora-midnight),var(--aurora-emerald-deep),#090c10)] bg-[length:350%_350%] animate-[auroraShift_20s_ease_infinite]" />
      <div className="fixed inset-0 -z-10 h-full w-full bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.08]" />
      <motion.div
        className="fixed -z-10 top-16 left-12 h-72 w-72 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.02) 70%, transparent 100%)', filter: 'blur(26px)' }}
        animate={{ x: [0, 30, -10, 0], y: [0, -18, 14, 0], scale: [1, 1.06, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed -z-10 bottom-20 right-10 h-80 w-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(15,118,110,0.28) 0%, rgba(15,118,110,0.02) 72%, transparent 100%)', filter: 'blur(32px)' }}
        animate={{ x: [0, -22, 12, 0], y: [0, 22, -14, 0], scale: [1, 0.94, 1.07, 1] }}
        transition={{ duration: 21, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed -z-10 bottom-1/3 left-1/3 h-56 w-56 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(107,63,143,0.2) 0%, rgba(107,63,143,0.01) 75%, transparent 100%)', filter: 'blur(24px)' }}
        animate={{ x: [0, -16, 20, 0], y: [0, 14, -10, 0], scale: [1, 1.04, 0.97, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative z-10 w-full max-w-sm !p-8 text-center"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-500 shadow-[0_0_24px_rgba(212,175,55,0.5)]">
          <span className="text-lg font-black text-black">R&amp;A</span>
        </div>
        <h1 className="font-headline text-3xl italic text-luxe-gradient">Welcome Back</h1>
        <p className="mt-2 text-sm text-white/50">
          Enter your access key to manage the wedding command center.
        </p>

        <form
          onSubmit={e => { e.preventDefault(); submitKey(key); }}
          className="mt-7 space-y-4 text-left"
        >
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <Input
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError(null); }}
              placeholder="Access key"
              autoFocus
              autoComplete="off"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-red-400"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full gap-2 bg-[#d4af37] text-black hover:bg-[#c49f2f]"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {isSubmitting ? 'Checking…' : 'Enter'}
          </Button>
        </form>

        <p className="mt-6 text-[11px] uppercase tracking-widest text-white/25">
          Family adding guests? Ask Razia or Abduraziq for your family link instead.
        </p>
      </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050705]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
