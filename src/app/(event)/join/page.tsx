'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Loader2 } from 'lucide-react';

import { joinWithPin, joinWithToken } from '@/lib/event-client';
import { LuxuryLoader } from '@/components/luxury-loader';

/**
 * The door into the entertainment evening.
 *
 * Two paths, and the fast one is automatic: arriving with `?pass=…` from a
 * personalised link redeems it and lands the guest in the hub without a single
 * tap. Everyone else types the 4-digit PIN from the table card and their name.
 * No account, no password, no email — at a venue, every extra field is guests
 * giving up and putting the phone away.
 */

const PIN_LENGTH = 4;

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pass = searchParams.get('pass');

  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [redeeming, setRedeeming] = useState(Boolean(pass));

  const nameRef = useRef<HTMLInputElement>(null);

  // Restore the name across attempts — a guest who fat-fingers the PIN should
  // not have to retype who they are.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wedu:event:name');
      if (saved) setName(saved);
    } catch {
      // Private-mode Safari throws on localStorage; the field just starts empty.
    }
  }, []);

  // ── Magic link ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pass) return;
    let cancelled = false;

    joinWithToken(pass)
      .then(() => {
        if (!cancelled) router.replace('/event-hub');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setRedeeming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pass, router]);

  const submitPin = useCallback(
    async (candidate: string) => {
      if (!name.trim()) {
        setError('Add your name first so we can credit your photos');
        nameRef.current?.focus();
        return;
      }

      setBusy(true);
      setError(null);
      try {
        try {
          localStorage.setItem('wedu:event:name', name.trim());
        } catch {
          /* see above */
        }
        await joinWithPin(candidate, name.trim());
        router.replace('/event-hub');
      } catch (err) {
        setError((err as Error).message);
        setPin('');
        setBusy(false);
      }
    },
    [name, router]
  );

  // Auto-submit on the fourth digit — nobody should have to find a button.
  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (digits.length === PIN_LENGTH) void submitPin(digits);
  };

  if (redeeming) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <LuxuryLoader label="Opening the door..." size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-sm text-center"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #f6e7b7 0%, #d4af37 100%)',
            boxShadow: '0 8px 30px rgba(212,175,55,0.35)',
          }}
        >
          <PartyPopper className="text-black/70" size={30} />
        </motion.div>

        <h1 className="font-headline text-4xl italic text-luxe-gradient">The Evening</h1>
        <p className="mt-2 text-sm leading-relaxed text-black/45">
          An entertainment evening with Razia &amp; Abduraziq.
          <br />
          Enter the code from your table to join the memory wall.
        </p>

        <div className="mt-8 space-y-4 text-left">
          <div>
            <label
              htmlFor="guest-name"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.2em] text-black/40"
            >
              Your name
            </label>
            <input
              id="guest-name"
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value.slice(0, 40))}
              placeholder="e.g. Aisha"
              autoComplete="name"
              enterKeyHint="next"
              className="w-full rounded-xl border border-[#d4af37]/25 bg-white/70 px-4 py-3 text-base text-[#1C1C1C] outline-none backdrop-blur-sm transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
            />
          </div>

          <div>
            <label
              htmlFor="event-pin"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.2em] text-black/40"
            >
              Event PIN
            </label>
            <input
              id="event-pin"
              value={pin}
              onChange={e => handlePinChange(e.target.value)}
              disabled={busy}
              placeholder="••••"
              // numeric keypad on mobile without the spinner arrows a
              // type="number" field brings with it
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              enterKeyHint="go"
              maxLength={PIN_LENGTH}
              className="w-full rounded-xl border border-[#d4af37]/25 bg-white/70 px-4 py-3 text-center font-mono text-3xl tracking-[0.6em] text-[#1C1C1C] outline-none backdrop-blur-sm transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20 disabled:opacity-60"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {busy && (
            <motion.p
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 flex items-center justify-center gap-2 text-sm text-black/45"
            >
              <Loader2 className="animate-spin" size={15} /> Letting you in…
            </motion.p>
          )}
          {error && !busy && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="mt-8 text-xs italic text-black/25">
          Photos you share here stay with the couple.
        </p>
      </motion.div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center">
          <LuxuryLoader label="Loading..." size="lg" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
