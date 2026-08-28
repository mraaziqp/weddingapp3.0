'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Images, Trophy, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EventRole } from '@/lib/event-access';

/**
 * Mobile-first shell for the event hub.
 *
 * A bottom bar rather than a top one: this is used one-handed, standing up,
 * and the top of a modern phone is not reachable with a thumb. The capture
 * button sits in the centre — the single action the whole evening is about —
 * raised above the bar so it is hit without looking.
 */

export type EventTab = 'wall' | 'play';

type Props = {
  guestName: string;
  role: EventRole;
  activeTab: EventTab;
  onTabChange: (tab: EventTab) => void;
  onCapture: () => void;
  points: number;
  children: ReactNode;
};

const TABS: { id: EventTab; icon: typeof Images; label: string }[] = [
  { id: 'wall', icon: Images, label: 'Memories' },
  { id: 'play', icon: Trophy, label: 'Play' },
];

export function EventDashboardLayout({
  guestName,
  role,
  activeTab,
  onTabChange,
  onCapture,
  points,
  children,
}: Props) {
  const [prevTab, setPrevTab] = useState<EventTab>(activeTab);

  const handleTabChange = useCallback(
    (id: EventTab) => {
      if (id === activeTab) return;
      setPrevTab(activeTab);
      onTabChange(id);
    },
    [activeTab, onTabChange]
  );

  const direction =
    TABS.findIndex(t => t.id === activeTab) > TABS.findIndex(t => t.id === prevTab) ? 1 : -1;

  return (
    <div className="relative flex h-[100dvh] flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="z-20 flex flex-shrink-0 items-center justify-between border-b px-4 py-2.5 backdrop-blur-md"
        style={{
          background: 'rgba(250, 249, 246, 0.85)',
          borderColor: 'rgba(212, 175, 55, 0.2)',
        }}
      >
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-[#1C1C1C]">
            Hey, {guestName.split(' ')[0]}
          </p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-black/35">
            {role === 'ADMIN' ? 'Host · moderating' : 'The Evening'}
          </p>
        </div>

        <motion.div
          key={points}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.14, 1] }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1"
          style={{
            background: 'linear-gradient(135deg, rgba(246,231,183,0.55), rgba(212,175,55,0.22))',
            borderColor: 'rgba(212,175,55,0.4)',
          }}
        >
          <Sparkles size={13} className="text-[#a07820]" />
          <span className="font-mono text-sm font-bold text-[#a07820]">{points}</span>
        </motion.div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-hidden pb-24">
        {/*
          Deliberately NOT `mode="wait"`. That holds the incoming tab until the
          outgoing one finishes animating out, which makes the switch depend on
          an animation frame actually firing — and a phone in low-power mode, or
          a tab the browser has throttled, may not deliver one. The tab state
          flips, nothing appears, and the guest is left tapping a dead button.
          The same rAF-throttling failure the wedding intro guards against.
          Crossfading instead means the new tab mounts immediately, regardless.
        */}
        <AnimatePresence custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -32 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 overflow-y-auto overscroll-contain"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom navigation ──────────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 px-3 pt-2"
        // Clears the iOS home indicator; without it the bar sits under the
        // gesture area and the tabs are genuinely hard to hit.
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div
          className="relative mx-auto flex h-16 max-w-sm items-center justify-around rounded-2xl border"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            borderColor: 'rgba(212, 175, 55, 0.25)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative flex h-full flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
                  // Leave room for the raised capture button between the two tabs.
                  index === 0 ? 'pr-8' : 'pl-8'
                )}
                style={{ color: isActive ? '#a07820' : '#9ca3af' }}
              >
                <motion.span
                  animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <tab.icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                </motion.span>
                <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="event-tab-underline"
                    className="absolute top-0 h-[2.5px] w-8 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* Raised capture button */}
          <motion.button
            onClick={onCapture}
            whileTap={{ scale: 0.9 }}
            aria-label="Add a memory"
            className="absolute left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full"
            style={{
              top: '-14px',
              background: 'linear-gradient(135deg, #f6e7b7 0%, #d4af37 55%, #b8992d 100%)',
              boxShadow: '0 8px 24px rgba(212,175,55,0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            <Plus size={26} className="text-black/70" strokeWidth={2.6} />
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
