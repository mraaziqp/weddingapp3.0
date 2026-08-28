'use client';

import { memo, useCallback, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { EyeOff, Eye, Mic, Quote, ImageOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { REACTIONS } from '@/lib/event-config';
import { moderateItem, react, type FeedItem } from '@/lib/event-client';
import type { EventRole } from '@/lib/event-access';

/**
 * The live memory wall.
 *
 * Layout is CSS multi-column rather than a measured JS masonry. A JS masonry
 * has to read every tile's height and reposition on each new photo, which on a
 * feed that repolls every 15 seconds means layout thrash on exactly the phones
 * least able to absorb it. Columns give the same look with the browser doing
 * the work off the main thread.
 */

const GOLD_BLUR = `data:image/svg+xml;base64,${
  typeof window === 'undefined'
    ? Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#d4af37" opacity="0.22"/></svg>'
      ).toString('base64')
    : window.btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#d4af37" opacity="0.22"/></svg>'
      )
}`;

type WallProps = {
  items: FeedItem[];
  reactions: Record<string, Partial<Record<string, number>>>;
  myReactions: Record<string, string>;
  role: EventRole;
  /** Optimistically applied locally, then confirmed by the next poll. */
  onReactionChange: (targetId: string, emoji: string | null) => void;
  onModerated: (id: string, hidden: boolean) => void;
};

export function MemoryWall({
  items,
  reactions,
  myReactions,
  role,
  onReactionChange,
  onModerated,
}: WallProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <ImageOff size={34} className="mb-3 text-black/20" />
        <p className="font-headline text-xl italic text-[#1C1C1C]">Nothing here yet</p>
        <p className="mt-1 text-sm text-black/40">
          Tap the gold button and be the first memory of the night.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 gap-3 px-3 pb-6 sm:columns-3">
      {items.map(item => (
        <WallCard
          key={item.id}
          item={item}
          counts={reactions[item.id] ?? {}}
          mine={myReactions[item.id] ?? null}
          isAdmin={role === 'ADMIN'}
          onReactionChange={onReactionChange}
          onModerated={onModerated}
        />
      ))}
    </div>
  );
}

type CardProps = {
  item: FeedItem;
  counts: Partial<Record<string, number>>;
  mine: string | null;
  isAdmin: boolean;
  onReactionChange: (targetId: string, emoji: string | null) => void;
  onModerated: (id: string, hidden: boolean) => void;
};

const WallCard = memo(function WallCard({
  item,
  counts,
  mine,
  isAdmin,
  onReactionChange,
  onModerated,
}: CardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleReact = useCallback(
    (emoji: string) => {
      // Tapping the reaction you already gave removes it.
      const next = mine === emoji ? null : emoji;
      setPickerOpen(false);
      onReactionChange(item.id, next);
      // Fire and forget: the count is already updated on screen, and the next
      // poll reconciles it. Blocking the UI on a network call at a party
      // makes the wall feel broken on bad wifi.
      void react(item.id, next).catch(() => {});
    },
    [item.id, mine, onReactionChange]
  );

  const handleModerate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await moderateItem({ id: item.id, type: item.type, hidden: !item.hidden });
      onModerated(item.id, res.hidden);
    } catch {
      // Leave the item as it was; the admin can tap again.
    } finally {
      setBusy(false);
    }
  }, [item.id, item.type, item.hidden, onModerated]);

  const totalReactions = Object.values(counts).reduce<number>((sum, n) => sum + (n ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'mb-3 break-inside-avoid overflow-hidden rounded-2xl border bg-white/85 shadow-sm backdrop-blur-sm',
        item.hidden ? 'border-red-300 opacity-55' : 'border-black/5'
      )}
    >
      {item.type === 'photo' && item.url && (
        <div className="relative">
          <Image
            src={item.url}
            alt={item.caption ?? `A memory shared by ${item.guestName}`}
            // Drive reports each photo's real pixel size, so the right aspect
            // ratio is reserved up front and the column does not reflow as
            // images land.
            width={item.width ?? 500}
            height={item.height ?? 500}
            // Two columns on phones, three from sm up. Without this, next/image
            // picks a candidate from the intrinsic width and a guest on venue
            // cellular downloads a 1600px file for a half-screen tile.
            sizes="(min-width: 640px) 33vw, 50vw"
            className="h-auto w-full object-cover"
            placeholder="blur"
            blurDataURL={GOLD_BLUR}
          />
        </div>
      )}

      {item.type === 'voice' && item.url && (
        <div className="bg-gradient-to-br from-[#f6e7b7]/60 to-[#d4af37]/25 px-3 py-4">
          <div className="mb-2 flex items-center gap-1.5 text-[#a07820]">
            <Mic size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              Voice note
            </span>
          </div>
          {/* The native player is deliberate — it gets background audio,
              lock-screen controls and the OS volume path for free. */}
          <audio controls preload="none" src={item.url} className="w-full" />
        </div>
      )}

      {item.type === 'note' && (
        <div className="px-4 py-5">
          <Quote size={16} className="mb-2 text-[#d4af37]" />
          <p className="font-headline text-[15px] italic leading-relaxed text-[#1C1C1C]">
            {item.message}
          </p>
        </div>
      )}

      <div className="space-y-2 px-3 pb-3 pt-2">
        {item.caption && item.type !== 'note' && (
          <p className="text-[13px] leading-snug text-black/70">{item.caption}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-headline text-[13px] italic text-black/50">
            {item.guestName}
          </p>

          <div className="flex flex-shrink-0 items-center gap-1">
            {isAdmin && (
              <button
                onClick={handleModerate}
                disabled={busy}
                aria-label={item.hidden ? 'Show this again' : 'Hide this from guests'}
                className="rounded-full p-1.5 text-black/30 transition hover:bg-black/5 hover:text-red-600 disabled:opacity-40"
              >
                {item.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            )}

            <button
              onClick={() => setPickerOpen(o => !o)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition',
                mine
                  ? 'border-[#d4af37]/45 bg-[#d4af37]/12'
                  : 'border-black/8 bg-white hover:border-[#d4af37]/30'
              )}
              aria-label="React to this memory"
            >
              <span className="text-[13px] leading-none">{mine ?? '🤍'}</span>
              {totalReactions > 0 && (
                <span className="font-mono text-[11px] text-black/45">{totalReactions}</span>
              )}
            </button>
          </div>
        </div>

        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="flex items-center justify-around rounded-xl border border-black/5 bg-white px-1 py-1.5 shadow-sm"
          >
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={cn(
                  'rounded-lg px-1.5 py-1 text-lg transition active:scale-90',
                  mine === emoji && 'bg-[#d4af37]/15'
                )}
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

        {item.hidden && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
            Hidden from guests
          </p>
        )}
      </div>
    </motion.div>
  );
});
