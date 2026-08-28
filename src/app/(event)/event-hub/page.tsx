'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { EventDashboardLayout, type EventTab } from '@/components/event-hub/event-dashboard-layout';
import { MemoryWall } from '@/components/event-hub/memory-wall';
import { MediaUploadModal } from '@/components/event-hub/media-upload-modal';
import { ScavengerHuntCard } from '@/components/event-hub/scavenger-hunt-card';
import { TriviaChallenge } from '@/components/event-hub/trivia-challenge';
import { LuxuryLoader } from '@/components/luxury-loader';
import {
  fetchFeed,
  fetchPlayState,
  type EventProgress,
  type FeedResponse,
  type PlayResponse,
} from '@/lib/event-client';

/**
 * The event hub.
 *
 * Access is enforced by middleware.ts, not here — reaching this page at all
 * means a valid event session cookie. The fetches below still handle a 401,
 * because a session can expire while the tab sits open on a table all evening.
 */

/**
 * Polling, not sockets. The wall tolerates a few seconds of staleness, and a
 * persistent connection per guest is the thing most likely to fall over on
 * venue wifi — a poll that fails just retries on the next tick.
 */
const FEED_POLL_MS = 15_000;

export default function EventHubPage() {
  const router = useRouter();

  const [tab, setTab] = useState<EventTab>('wall');
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [play, setPlay] = useState<PlayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingQuest, setPendingQuest] = useState<string | null>(null);

  // Read inside the poll without making it a dependency, which would tear down
  // and rebuild the interval on every single feed update.
  const feedRef = useRef<FeedResponse | null>(null);
  feedRef.current = feed;

  const loadFeed = useCallback(async () => {
    try {
      setFeed(await fetchFeed(60));
    } catch (err) {
      // An expired cookie is the one failure that cannot fix itself — send
      // them back to the door. Everything else is transient; keep the last
      // good wall on screen rather than blanking it mid-party.
      if ((err as Error).message.toLowerCase().includes('join the event')) {
        router.replace('/join');
      }
    }
  }, [router]);

  const loadPlay = useCallback(async () => {
    try {
      setPlay(await fetchPlayState());
    } catch {
      // The games tab simply shows its loader until the next successful call.
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadFeed(), loadPlay()]).finally(() => setLoading(false));
  }, [loadFeed, loadPlay]);

  useEffect(() => {
    const id = setInterval(() => {
      // Nothing on this screen is moving while the phone is in a pocket, and
      // polling a hidden tab all evening is a meaningful share of the battery
      // guests need to get home.
      if (document.visibilityState !== 'visible') return;
      void loadFeed();
    }, FEED_POLL_MS);

    // Catch up immediately when they come back rather than waiting out the tick.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadFeed();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadFeed]);

  // ── Optimistic reactions ────────────────────────────────────────────────
  const handleReactionChange = useCallback((targetId: string, emoji: string | null) => {
    setFeed(current => {
      if (!current) return current;

      const previous = current.myReactions[targetId] ?? null;
      const counts = { ...current.reactions };
      const bucket = { ...(counts[targetId] ?? {}) };

      if (previous) bucket[previous] = Math.max(0, (bucket[previous] ?? 1) - 1);
      if (emoji) bucket[emoji] = (bucket[emoji] ?? 0) + 1;
      counts[targetId] = bucket;

      const mine = { ...current.myReactions };
      if (emoji) mine[targetId] = emoji;
      else delete mine[targetId];

      return { ...current, reactions: counts, myReactions: mine };
    });
  }, []);

  const handleModerated = useCallback((id: string, hidden: boolean) => {
    setFeed(current =>
      current
        ? { ...current, items: current.items.map(i => (i.id === id ? { ...i, hidden } : i)) }
        : current
    );
  }, []);

  const handleUploaded = useCallback(
    (progress: EventProgress | null) => {
      if (progress) {
        setPlay(current => (current ? { ...current, progress } : current));
      }
      // Straight back to the wall so the guest sees their photo land.
      setTab('wall');
      void loadFeed();
      void loadPlay();
    },
    [loadFeed, loadPlay]
  );

  const handleSelectTask = useCallback((tag: string) => {
    setPendingQuest(tag);
    setUploadOpen(true);
  }, []);

  const openUpload = useCallback(() => {
    setPendingQuest(null);
    setUploadOpen(true);
  }, []);

  if (loading || !feed) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center">
        <LuxuryLoader label="Setting the scene..." size="lg" />
      </div>
    );
  }

  return (
    <>
      <EventDashboardLayout
        guestName={feed.me.name}
        role={feed.me.role}
        activeTab={tab}
        onTabChange={setTab}
        onCapture={openUpload}
        points={play?.progress.points ?? 0}
      >
        {tab === 'wall' ? (
          <div className="pt-4">
            <header className="px-4 pb-4 text-center">
              <h1 className="font-headline text-3xl italic text-[#1C1C1C]">Memory Wall</h1>
              <p className="mt-1 text-sm text-black/40">
                Everything shared tonight, as it happens.
              </p>
            </header>

            <MemoryWall
              items={feed.items}
              reactions={feed.reactions}
              myReactions={feed.myReactions}
              role={feed.me.role}
              onReactionChange={handleReactionChange}
              onModerated={handleModerated}
            />
          </div>
        ) : (
          <div className="space-y-5 px-4 pb-8 pt-4">
            <header className="text-center">
              <h1 className="font-headline text-3xl italic text-[#1C1C1C]">Let&apos;s Play</h1>
              <p className="mt-1 text-sm text-black/40">
                Shoot the quests, guess the trivia, climb the board.
              </p>
            </header>

            {play ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <ScavengerHuntCard
                  completed={play.progress.tasks}
                  onSelectTask={handleSelectTask}
                />
                <TriviaChallenge
                  questions={play.questions}
                  progress={play.progress}
                  leaderboard={play.leaderboard}
                  myGuestId={feed.me.sub}
                  onAnswered={progress => {
                    setPlay(current => (current ? { ...current, progress } : current));
                    // Refresh the board so a jump in rank is visible right away.
                    void loadPlay();
                  }}
                />
              </motion.div>
            ) : (
              <div className="flex justify-center py-12">
                <LuxuryLoader label="Loading the games..." />
              </div>
            )}
          </div>
        )}
      </EventDashboardLayout>

      <MediaUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        initialQuestTag={pendingQuest}
        onUploaded={handleUploaded}
        onNotePosted={() => {
          setTab('wall');
          void loadFeed();
        }}
      />
    </>
  );
}
