'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Loader2, MessageCircleHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Wish {
  id: string;
  name: string | null;
  message: string;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * A guestbook wall guests can post to any time between RSVP-ing and the
 * wedding — not just at the venue. Meant to be embedded wherever a guest
 * naturally lands after responding (their digital pass), so returning to
 * that same link later shows something new each time.
 */
export function WellWishesWall({ defaultName }: { defaultName?: string }) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(defaultName ?? '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const loadWishes = useCallback(() => {
    fetch('/api/well-wishes')
      .then(r => (r.ok ? r.json() : { wishes: [] }))
      .then(data => setWishes(data.wishes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadWishes();
  }, [loadWishes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/well-wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setWishes(prev => [data.wish, ...prev]);
      setMessage('');
      toast({ title: '💛 Thank you!', description: 'Your message is now on the wall for everyone to see.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not post your message', description: 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#d4af37]/20 shadow-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[#d4af37]/20 flex items-center justify-center shrink-0">
          <MessageCircleHeart className="text-[#d4af37]" size={20} />
        </div>
        <div>
          <h3 className="font-headline text-lg italic text-[#1C1C1C]">Well Wishes</h3>
          <p className="text-xs text-[#1C1C1C]/50">Leave a message for the couple — check back for new ones before the big day!</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={60}
          className="border-[#d4af37]/20"
        />
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Share your excitement, a memory, or some advice for the newlyweds…"
          maxLength={500}
          className="border-[#d4af37]/20 min-h-20 resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || !message.trim()}
            className="gap-2 bg-gradient-to-r from-[#e9cf8a] via-[#d4af37] to-[#b98a2e] text-black font-semibold hover:shadow-[0_4px_20px_rgba(212,175,55,0.35)]"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} />}
            {submitting ? 'Posting…' : 'Post Well Wish'}
          </Button>
        </div>
      </form>

      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37]/20 to-transparent" />

      {loading ? (
        <div className="flex justify-center py-6 text-[#1C1C1C]/30">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : wishes.length === 0 ? (
        <p className="text-center text-sm text-[#1C1C1C]/40 py-4">Be the first to leave a well wish!</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {wishes.map(wish => (
              <motion.div
                key={wish.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-[#faf5e8] border border-[#d4af37]/10 p-3.5"
              >
                <p className="text-sm text-[#1C1C1C]/85 leading-relaxed whitespace-pre-line">{wish.message}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#d4af37]">{wish.name || 'A guest'}</p>
                  <p className="text-[10px] text-[#1C1C1C]/35">{timeAgo(wish.created_at)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
