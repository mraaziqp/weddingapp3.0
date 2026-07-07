
'use client';
import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Gamepad2, GalleryHorizontal } from 'lucide-react';
import { GalleryFeed } from './guest-hub/gallery-feed';
import { CaptureView } from './guest-hub/capture-view';
import { Skeleton } from './ui/skeleton';
import { usePartyMode } from '@/hooks/use-party-mode';
import { useRouter } from 'next/navigation';

// Lazy-load the Games module so it doesn't block initial page paint
const GamesView = dynamic(
  () => import('./guest-hub/games-view').then(m => ({ default: m.GamesView })),
  {
    loading: () => (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-2/3 mx-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    ),
    ssr: false,
  }
);

const _TAB_ORDER_ALL = ['gallery', 'capture', 'games'];
const ALL_TABS = [
  { id: 'gallery', icon: GalleryHorizontal, label: 'Gallery' },
  { id: 'capture', icon: Camera, label: 'Capture' },
  { id: 'games', icon: Gamepad2, label: 'Games' },
];

/** After 6am on Sept 7, 2026 the wedding is over. Camera tab hides, gallery becomes memorial. */
const MORNING_AFTER_DATE = new Date('2026-09-07T06:00:00');

export function GuestEventHub({ guestId }: { guestId: string }) {
  const { partyMode } = usePartyMode();
  const router = useRouter();
  // Computed once at mount — the date won't change during a browser session
  const isMorningAfter = new Date() > MORNING_AFTER_DATE;

  // In morning-after mode, the Capture tab is hidden
  const tabs = isMorningAfter ? ALL_TABS.filter(t => t.id !== 'capture') : ALL_TABS;
  const tabOrder = tabs.map(t => t.id);

  const [activeTab, setActiveTab] = useState('gallery');
  const [prevTab, setPrevTab] = useState('gallery');
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);

  // ── Secret 7-tap admin shortcut on the R&A monogram ──────────────────────
  const secretTapCount = useRef(0);
  const secretTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [secretFlash, setSecretFlash] = useState(false);

  const handleSecretTap = useCallback(() => {
    secretTapCount.current += 1;
    if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
    secretTapTimer.current = setTimeout(() => {
      secretTapCount.current = 0;
    }, 3000);
    if (secretTapCount.current >= 7) {
      secretTapCount.current = 0;
      if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
      setSecretFlash(true);
      setTimeout(() => {
        setSecretFlash(false);
        router.push('/dashboard');
      }, 600);
    }
  }, [router]);

  const direction = tabOrder.indexOf(activeTab) > tabOrder.indexOf(prevTab) ? 1 : -1;

  // Functional-updater form avoids stale-closure issues without needing activeTab in deps
  const handleTabChange = useCallback((id: string) => {
    setActiveTab(curr => {
      if (curr === id) return curr;
      setPrevTab(curr);
      return id;
    });
  }, []);

  const handleSelectQuest = useCallback((questTag: string) => {
    if (isMorningAfter) return;
    setActiveQuest(questTag);
    handleTabChange('capture');
  }, [handleTabChange, isMorningAfter]);

  const handleCaptureComplete = useCallback((_blob?: unknown) => {
    setActiveQuest(curr => {
      if (curr) setCompletedQuests(prev => [...prev, curr]);
      return null;
    });
    handleTabChange('games');
  }, [handleTabChange]);

  const renderContent = () => {
    switch (activeTab) {
      case 'gallery':
        return <GalleryFeed partyMode={partyMode} isMorningAfter={isMorningAfter} />;
      case 'capture':
        return <CaptureView guestId={guestId} questTag={activeQuest} onUploadComplete={handleCaptureComplete} />;
      case 'games':
        return <GamesView onSelectQuest={handleSelectQuest} completedQuests={completedQuests} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="h-[100dvh] flex flex-col relative"
      // 2.5-second luxurious background crossfade — the core Party Mode effect
      animate={{ backgroundColor: partyMode ? '#022c22' : '#FAF9F6' }}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
    >
      {/* Secret admin flash overlay */}
      <AnimatePresence>
        {secretFlash && (
          <motion.div
            className="fixed inset-0 z-[999] bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
      {/* Party Mode ambient gold radial shimmer — fades in behind content */}
      <AnimatePresence>
        {partyMode && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3 }}
            style={{
              background:
                'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 65%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* R&A monogram header strip */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-2 backdrop-blur-sm border-b z-10"
        style={{
          background: partyMode ? 'rgba(2, 44, 34, 0.8)' : 'rgba(250, 249, 246, 0.8)',
          borderColor: 'rgba(212, 175, 55, 0.2)',
          transition: 'background 2.5s ease',
        }}
      >
        <motion.span
          onClick={handleSecretTap}
          className="font-headline italic text-lg text-[#d4af37] cursor-default select-none"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            textShadow: partyMode
              ? '0 0 20px rgba(212,175,55,0.55)'
              : '0 0 12px rgba(212,175,55,0.3)',
            transition: 'text-shadow 2.5s ease',
          }}
        >
          R&amp;A · September 6, 2026
          {partyMode && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
              className="ml-2"
            >
              ✨
            </motion.span>
          )}
        </motion.span>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden pb-24 relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -40, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 overflow-y-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation — glass morphism adapts to party mode */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 p-3">
        <motion.div
          className="relative flex items-center justify-around max-w-sm mx-auto h-16 rounded-2xl border overflow-hidden"
          animate={{
            backgroundColor: partyMode ? 'rgba(2, 44, 34, 0.92)' : 'rgba(255, 255, 255, 0.65)',
            borderColor: partyMode ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.2)',
          }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: partyMode
              ? '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.12)'
              : '0 8px 30px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {/* Sliding gold pill background */}
          <motion.div
            className="absolute rounded-xl"
            layoutId="tab-pill"
            style={{
              left: `${(tabOrder.indexOf(activeTab) / tabs.length) * 100}%`,
              width: `${100 / tabs.length}%`,
              height: '78%',
              top: '11%',
              background: 'linear-gradient(135deg, rgba(212,175,55,0.22) 0%, rgba(212,175,55,0.1) 100%)',
              border: '1px solid rgba(212,175,55,0.35)',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />

          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative z-10 flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs"
                style={{
                  color: isActive
                    ? '#a07820'
                    : partyMode
                    ? 'rgba(246, 231, 183, 0.45)'
                    : '#9ca3af',
                  transition: 'color 2.5s ease',
                }}
              >
                <motion.div
                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <tab.icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={isActive ? { filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' } : {}}
                  />
                </motion.div>
                <span className="font-medium text-[10px] tracking-wide">{tab.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="active-tab-top"
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
        </motion.div>
      </nav>
    </motion.div>
  );
}
