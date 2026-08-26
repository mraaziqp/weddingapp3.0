
"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { Gift, QrCode, UserPlus, Map, Flame, LayoutTemplate, Sparkles, Volume2, VolumeX, Bell, MessageSquare, Copy, Search, X, Check, ArrowUpRight, CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { differenceInSeconds } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePartyMode } from '@/hooks/use-party-mode';
import { cn } from '@/lib/utils';
import { fetchDashboardStats, type DashboardStats } from '@/lib/stats';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95, filter: 'blur(10px)' },
    visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 100, damping: 20 } },
};

const MotionCard = motion.create(Card);

const weddingDate = new Date('2026-09-06T15:00:00');

const FlipDigit = ({ value, label }: { value: number; label: string }) => {
    const formatted = String(value).padStart(2, '0');
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <motion.div
                    key={formatted}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                    style={{ transformStyle: 'preserve-3d', transformOrigin: 'center 50%' }}
                    className="font-serif text-6xl md:text-8xl font-light leading-none"
                >
                    <span style={{
                        background: 'linear-gradient(180deg, #fff 0%, #d4af37 50%, #8a661c 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 4px 16px rgba(212,175,55,0.4))',
                    }}>
                        {formatted}
                    </span>
                </motion.div>
            </div>
            <span className="text-[11px] uppercase tracking-[0.4em] text-white/40 font-medium">{label}</span>
        </div>
    );
};

const CountdownCard = () => {
    const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateRemaining = () => {
            const now = new Date();
            const diff = differenceInSeconds(weddingDate, now);
            if (diff <= 0) return setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            setRemaining({
                days: Math.floor(diff / 86400),
                hours: Math.floor((diff % 86400) / 3600),
                minutes: Math.floor((diff % 3600) / 60),
                seconds: diff % 60,
            });
        };
        calculateRemaining();
        const interval = setInterval(calculateRemaining, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <MotionCard
            variants={itemVariants}
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="md:col-span-2 row-span-2 !p-0 relative overflow-hidden flex flex-col items-center justify-center gap-8 bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl group rounded-3xl"
        >
            <Image
                src="/couple-bg.jpg"
                alt="Couple"
                fill
                priority
                // Decorative background filling a two-column dashboard tile.
                sizes="(min-width: 768px) 67vw, 100vw"
                className="object-cover z-0 opacity-20 group-hover:opacity-30 transition-opacity duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/80 z-10" />

            <motion.div
                className="absolute inset-0 z-10 pointer-events-none"
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.3) 0%, transparent 60%)' }}
            />

            <motion.p
                className="z-20 font-serif italic text-xl text-amber-200/60 tracking-widest"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                Until Razia &amp; Abduraziq say I do
            </motion.p>

            <div className='z-20 flex gap-6 md:gap-12' style={{ perspective: '800px' }}>
                <AnimatePresence mode="popLayout">
                    <FlipDigit key={`d${remaining.days}`} value={remaining.days} label="Days" />
                    <FlipDigit key={`h${remaining.hours}`} value={remaining.hours} label="Hours" />
                    <FlipDigit key={`m${remaining.minutes}`} value={remaining.minutes} label="Min" />
                </AnimatePresence>
            </div>

            <motion.div
                className="z-20 text-xs uppercase tracking-[0.4em] text-white/50 font-light bg-black/40 px-6 py-2 rounded-full border border-white/5 backdrop-blur-md"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                September 6, 2026 · Tuscany in Rylands
            </motion.div>
        </MotionCard>
    );
};

const QuickActions = () => {
    const { toast } = useToast();
    const { partyMode, setPartyMode } = usePartyMode();

    return (
        <MotionCard
            variants={itemVariants}
            className="md:col-span-1 row-span-2 flex flex-col justify-between p-6 bg-black/40 border border-white/10 shadow-2xl backdrop-blur-xl rounded-3xl"
        >
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-amber-400/80 mb-4 flex items-center gap-2">
                <Sparkles size={16} /> Command Actions
            </CardTitle>
            
            <div className="space-y-3 w-full">
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-amber-200 to-amber-500 text-black font-bold text-base hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                    <Link href="/qr-scanner">
                        <QrCode className="mr-2 h-5 w-5"/> Scan Ticket
                    </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white">
                    <Link href="/planner/table-planner">
                        <LayoutTemplate className="mr-2 h-4 w-4 text-amber-400"/> Seating Planner
                    </Link>
                </Button>

                <Button asChild variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white">
                    <Link href="/guests">
                        <UserPlus className="mr-2 h-4 w-4"/> Add Guest
                    </Link>
                </Button>

                <Button
                    onClick={() => {
                        const next = !partyMode;
                        setPartyMode(next);
                        toast({ title: next ? '🎉 Party Mode ON' : 'Party Mode OFF' });
                    }}
                    className={cn(
                        'w-full transition-all duration-500',
                        partyMode
                            ? 'bg-emerald-900 border border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                            : 'border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    )}
                >
                    <Flame className="mr-2 h-4 w-4" /> {partyMode ? 'End Party Mode' : 'Activate Party Mode'}
                </Button>
            </div>
        </MotionCard>
    );
};

const MusicWidget = () => (
    <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-purple-300 flex items-center gap-2">
                 Vibe Check
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-3">
            <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-900 to-black border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
                <div className="w-16 h-16 rounded-full border border-white/5 bg-zinc-900 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                </div>
            </motion.div>
            <div className="text-center">
                <p className="font-serif font-medium text-lg leading-tight">I Wanna Dance</p>
                <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Whitney Houston</p>
            </div>
        </CardContent>
    </MotionCard>
);

const RSVPStatus = ({
    confirmed,
    pending,
    declined,
    total,
    onFilterSelect,
    activeFilter
}: {
    confirmed: number;
    pending: number;
    declined: number;
    total: number;
    onFilterSelect?: (filter: 'all' | 'accepted' | 'declined' | 'pending') => void;
    activeFilter?: string;
}) => {
    const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const [offset, setOffset] = useState(251);

    useEffect(() => setOffset(251 - (percentage / 100) * 251), [percentage]);

    const handleRowClick = (statusFilter: 'all' | 'accepted' | 'declined' | 'pending') => {
        if (onFilterSelect) {
            onFilterSelect(statusFilter);
        }
        const feedElement = document.getElementById('live-rsvp-feed-section');
        if (feedElement) {
            feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
                 <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">RSVP Summary</CardTitle>
                 <button
                    onClick={() => handleRowClick('all')}
                    className="text-[9px] text-white/50 hover:text-amber-300 transition-colors flex items-center gap-1 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
                 >
                    View Names <ArrowUpRight size={10} />
                 </button>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-5">
                <div className="relative w-24 h-24 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-white/5" strokeWidth="6" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                        <motion.circle
                            className="text-emerald-400"
                            strokeWidth="6"
                            strokeDasharray={251}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                            transform="rotate(-90 50 50)"
                            initial={{ strokeDashoffset: 251 }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 2, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-serif text-2xl font-light text-white">{percentage}%</span>
                        <span className="text-[8px] uppercase tracking-widest text-white/40">Attending</span>
                    </div>
                </div>
                
                <div className="w-full mt-4 space-y-1.5 text-[11px] text-white/80">
                    <button
                        type="button"
                        onClick={() => handleRowClick('accepted')}
                        className={cn(
                            "w-full flex justify-between items-center px-2.5 py-1.5 rounded-xl border transition-all text-left group/btn",
                            activeFilter === 'accepted'
                                ? "bg-emerald-500/20 border-emerald-500/50 text-white shadow-sm"
                                : "border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="group-hover/btn:text-emerald-300 transition-colors">Accepted (Confirmed)</span>
                        </span>
                        <span className="font-semibold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 text-xs">
                            {confirmed}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleRowClick('declined')}
                        className={cn(
                            "w-full flex justify-between items-center px-2.5 py-1.5 rounded-xl border transition-all text-left group/btn",
                            activeFilter === 'declined'
                                ? "bg-rose-500/20 border-rose-500/50 text-white shadow-sm"
                                : "border-white/5 bg-white/5 hover:bg-rose-500/10 hover:border-rose-500/30"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="group-hover/btn:text-rose-300 transition-colors">Rejected (Declined)</span>
                        </span>
                        <span className="font-semibold text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10 text-xs">
                            {declined}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleRowClick('pending')}
                        className={cn(
                            "w-full flex justify-between items-center px-2.5 py-1.5 rounded-xl border transition-all text-left group/btn",
                            activeFilter === 'pending'
                                ? "bg-amber-500/20 border-amber-500/50 text-white shadow-sm"
                                : "border-white/5 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/30"
                        )}
                    >
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="group-hover/btn:text-amber-300 transition-colors">Pending Response</span>
                        </span>
                        <span className="font-semibold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 text-xs">
                            {pending}
                        </span>
                    </button>
                </div>
            </CardContent>
        </MotionCard>
    );
};

const GuestSideBreakdown = ({ groom, bride, total }: { groom: number; bride: number; total: number }) => {
    const groomPercent = total > 0 ? Math.round((groom / total) * 100) : 0;
    const bridePercent = total > 0 ? Math.round((bride / total) * 100) : 0;
    const untagged = Math.max(0, total - (groom + bride));
    const untaggedPercent = total > 0 ? Math.round((untagged / total) * 100) : 0;

    return (
        <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-0">
                 <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Side Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col justify-center p-5">
                <div className="space-y-4">
                    {/* Visual Segmented Progress Bar */}
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                        {groom > 0 && (
                            <div 
                                style={{ width: `${groomPercent}%` }} 
                                className="h-full bg-emerald-600 bg-gradient-to-r from-emerald-700 to-emerald-500" 
                            />
                        )}
                        {bride > 0 && (
                            <div 
                                style={{ width: `${bridePercent}%` }} 
                                className="h-full bg-indigo-600 bg-gradient-to-r from-indigo-700 to-indigo-500" 
                            />
                        )}
                        {untagged > 0 && (
                            <div 
                                style={{ width: `${untaggedPercent}%` }} 
                                className="h-full bg-zinc-600" 
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-white/40 text-[9px] uppercase tracking-wider">Groom&apos;s Side</p>
                            <p className="font-serif text-lg text-emerald-400 mt-0.5">{groom}</p>
                            <p className="text-[9px] text-white/50">{groomPercent}% of total</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                            <p className="text-white/40 text-[9px] uppercase tracking-wider">Bride&apos;s Side</p>
                            <p className="font-serif text-lg text-indigo-400 mt-0.5">{bride}</p>
                            <p className="text-[9px] text-white/50">{bridePercent}% of total</p>
                        </div>
                    </div>
                    {untagged > 0 && (
                        <p className="text-[9px] text-white/30 text-center italic mt-1 leading-none">
                            {untagged} untagged guest{untagged > 1 ? 's' : ''}
                        </p>
                    )}
                </div>
            </CardContent>
        </MotionCard>
    );
};

const LatestGift = () => (
    <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
         <CardHeader>
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Latest Gift</CardTitle>
            <Gift className="absolute right-6 top-6 h-5 w-5 text-amber-500/50"/>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                <Image src="https://picsum.photos/seed/dutch-oven/80/80" alt="Gift" width={64} height={64} className="rounded-xl shadow-lg"/>
                <div>
                    <p className="font-serif font-medium text-lg leading-tight">Dutch Oven</p>
                    <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">From Aunt Fatima</p>
                </div>
            </div>
        </CardContent>
    </MotionCard>
);

const SeatingMiniMap = () => (
    <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="md:col-span-2 bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
         <CardHeader className="relative z-10 border-b border-white/5 pb-4 bg-black/20">
            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center justify-between">
                Spatial Control <Map className="h-4 w-4"/>
            </CardTitle>
        </CardHeader>
        <CardContent className="p-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/seating" className="flex flex-col items-center justify-center h-32 rounded-2xl bg-gradient-to-br from-blue-900/20 to-transparent border border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-900/30 transition-all group/btn">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 group-hover/btn:scale-110 transition-transform">
                        <Map className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="font-serif text-lg">Seating Assignments</p>
                    <p className="text-[10px] uppercase tracking-widest text-blue-200/50 mt-1">Manage guest lists</p>
                </Link>
                <Link href="/planner/table-planner" className="flex flex-col items-center justify-center h-32 rounded-2xl bg-gradient-to-br from-amber-900/20 to-transparent border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-900/30 transition-all group/btn">
                     <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 group-hover/btn:scale-110 transition-transform">
                        <LayoutTemplate className="h-5 w-5 text-amber-400" />
                    </div>
                    <p className="font-serif text-lg">2D Table Planner</p>
                    <p className="text-[10px] uppercase tracking-widest text-amber-200/50 mt-1">Place plates & decor</p>
                </Link>
            </div>
        </CardContent>
    </MotionCard>
);

function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play two notes (a beautiful major-third chime)
    const now = ctx.currentTime;
    
    // Note 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Note 2 (G#5 - 830.61 Hz) after a short delay (0.08s)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now + 0.08);
    osc1.stop(now + 0.8);
    osc2.stop(now + 0.88);
  } catch (err) {
    console.error('Audio chime failed:', err);
  }
}

interface RsvpResponse {
  id: number | string;
  guest_id: string;
  household_id?: string;
  guest_name: string;
  status: string;
  dietary_restrictions?: string;
  message?: string;
  responded_at: string;
}

type FilterType = 'all' | 'accepted' | 'declined' | 'pending' | 'groom' | 'bride' | 'messages';

const LiveRsvpFeed = ({
  activeFilter = 'all',
  onFilterChange
}: {
  activeFilter?: FilterType;
  onFilterChange?: (filter: FilterType) => void;
}) => {
  const [responses, setResponses] = useState<RsvpResponse[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [latestSeenTime, setLatestSeenTime] = useState<number | null>(null);
  const [filter, setFilter] = useState<FilterType>(activeFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setFilter(activeFilter);
  }, [activeFilter]);

  const handleFilterSelect = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (onFilterChange) onFilterChange(newFilter);
  };

  const fetchResponses = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      const res = await fetch('/api/rsvp');
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.responses || []) as RsvpResponse[];
      setResponses(list);

      if (list.length > 0) {
        const times = list.map(r => new Date(r.responded_at).getTime());
        const maxTime = Math.max(...times);
        if (isInitial) {
          setLatestSeenTime(maxTime);
        } else if (latestSeenTime !== null && maxTime > latestSeenTime) {
          // Find all new responses since the last seen timestamp
          const newResponses = list.filter(r => new Date(r.responded_at).getTime() > latestSeenTime);
          newResponses.forEach(r => {
            // Trigger Toast
            toast({
              title: `🔔 New RSVP Response`,
              description: `${r.guest_name} has responded: ${r.status}`,
              variant: r.status === 'Accepted' ? 'default' : 'destructive',
            });
            // Play Chime
            if (soundEnabled) {
              playChime();
            }
          });
          setLatestSeenTime(maxTime);
        }
      }
    } catch (err) {
      console.error('[LiveFeed] Failed to fetch RSVPs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [latestSeenTime, soundEnabled, toast]);

  useEffect(() => {
    fetchResponses(true);
    // 15s keeps the live "new RSVP" chime feeling near-instant without
    // doubling the request rate the previous 8s interval had.
    const interval = setInterval(() => fetchResponses(false), 15000);
    return () => clearInterval(interval);
  }, [fetchResponses]);

  const handleCopyMessage = (rsvp: RsvpResponse) => {
    const textToCopy = rsvp.message 
      ? `"${rsvp.message}" — ${rsvp.guest_name} (${rsvp.status})` 
      : `${rsvp.guest_name} — ${rsvp.status}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({ title: 'Copied!', description: 'Guest details copied to clipboard.' });
    });
  };

  const handleWhatsAppReply = (rsvp: RsvpResponse) => {
    let textMessage = '';
    if (rsvp.status === 'Accepted') {
      textMessage = `Hi ${rsvp.guest_name}! Thank you so much for accepting our wedding invitation. We can't wait to celebrate with you! 🥂`;
    } else if (rsvp.status === 'Declined') {
      textMessage = `Hi ${rsvp.guest_name}! We're so sorry you won't be able to make it to our wedding, but thank you for letting us know. You will be dearly missed! ❤️`;
    } else {
      textMessage = `Hi ${rsvp.guest_name}! We are finalizing our guest list for the wedding and wanted to check if you'll be able to join us. Please let us know when you can! 💍`;
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMessage)}`;
    window.open(url, '_blank');
  };

  const acceptedResponses = responses.filter(r => r.status === 'Accepted');
  const declinedResponses = responses.filter(r => r.status === 'Declined');
  const pendingResponses = responses.filter(r => r.status === 'Pending');
  const groomResponses = responses.filter(r => r.guest_id === 'guest-groom');
  const brideResponses = responses.filter(r => r.guest_id === 'guest-bride');
  const messageResponses = responses.filter(r => !!r.message);

  const filteredResponses = responses.filter(r => {
    // 1. Status/category filter
    if (filter === 'accepted' && r.status !== 'Accepted') return false;
    if (filter === 'declined' && r.status !== 'Declined') return false;
    if (filter === 'pending' && r.status !== 'Pending') return false;
    if (filter === 'groom' && r.guest_id !== 'guest-groom') return false;
    if (filter === 'bride' && r.guest_id !== 'guest-bride') return false;
    if (filter === 'messages' && !r.message) return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.guest_name.toLowerCase().includes(q);
      const matchMsg = r.message ? r.message.toLowerCase().includes(q) : false;
      const matchDiet = r.dietary_restrictions ? r.dietary_restrictions.toLowerCase().includes(q) : false;
      const matchStatus = r.status.toLowerCase().includes(q);
      const sideText = r.guest_id?.includes('groom') ? 'groom' : r.guest_id?.includes('bride') ? 'bride' : 'household';
      const matchSide = sideText.includes(q);
      return matchName || matchMsg || matchDiet || matchStatus || matchSide;
    }

    return true;
  });

  return (
    <MotionCard
      id="live-rsvp-feed-section"
      variants={itemVariants}
      className="md:col-span-3 bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden group scroll-mt-6"
    >
      <CardHeader className="border-b border-white/5 pb-4 bg-black/20 flex flex-col gap-4">
        {/* Top bar: Title & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold uppercase tracking-widest text-[#d4af37] flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#d4af37] animate-bounce" /> Guest RSVP Responses &amp; Names
            </CardTitle>
            <p className="text-[10px] text-white/50 uppercase tracking-wider mt-1 leading-normal">
              {responses.length} Total Guests · {acceptedResponses.length} Accepted · {declinedResponses.length} Rejected · {pendingResponses.length} Pending
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input Tab */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#d4af37]/70 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest by name..."
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#d4af37]/60 focus:bg-white/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "rounded-full gap-1.5 text-xs transition-all border border-white/10 shrink-0 h-8 px-3",
                soundEnabled 
                  ? "bg-[#d4af37]/15 text-[#d4af37] border-[#d4af37]/40 hover:bg-[#d4af37]/25" 
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              )}
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              {soundEnabled ? 'Chime ON' : 'Chime Muted'}
            </Button>
          </div>
        </div>

        {/* Filter Tabs Switcher */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleFilterSelect('all')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              filter === 'all' 
                ? "bg-[#d4af37] text-black shadow-md font-bold" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Users size={12} /> All ({responses.length})
          </button>
          
          <button
            onClick={() => handleFilterSelect('accepted')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              filter === 'accepted' 
                ? "bg-emerald-500 text-black shadow-md font-bold" 
                : "text-white/60 hover:text-emerald-400 hover:bg-white/5"
            )}
          >
            <CheckCircle2 size={12} className={filter === 'accepted' ? 'text-black' : 'text-emerald-400'} />
            Accepted ({acceptedResponses.length})
          </button>

          <button
            onClick={() => handleFilterSelect('declined')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              filter === 'declined' 
                ? "bg-rose-500 text-black shadow-md font-bold" 
                : "text-white/60 hover:text-rose-400 hover:bg-white/5"
            )}
          >
            <XCircle size={12} className={filter === 'declined' ? 'text-black' : 'text-rose-400'} />
            Rejected ({declinedResponses.length})
          </button>

          <button
            onClick={() => handleFilterSelect('pending')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
              filter === 'pending' 
                ? "bg-amber-400 text-black shadow-md font-bold" 
                : "text-white/60 hover:text-amber-400 hover:bg-white/5"
            )}
          >
            <Clock size={12} className={filter === 'pending' ? 'text-black' : 'text-amber-400'} />
            Pending ({pendingResponses.length})
          </button>

          <button
            onClick={() => handleFilterSelect('groom')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all shrink-0",
              filter === 'groom' 
                ? "bg-[#10b981] text-black shadow-md font-bold" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            Groom&apos;s ({groomResponses.length})
          </button>

          <button
            onClick={() => handleFilterSelect('bride')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all shrink-0",
              filter === 'bride' 
                ? "bg-[#ec4899] text-white shadow-md font-bold" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            Bride&apos;s ({brideResponses.length})
          </button>

          <button
            onClick={() => handleFilterSelect('messages')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all shrink-0",
              filter === 'messages' 
                ? "bg-amber-500 text-black shadow-md font-bold" 
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            Messages ({messageResponses.length})
          </button>
        </div>

        {/* Search & Filter status summary bar */}
        {(searchQuery || filter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-white/60 px-1 pt-1 border-t border-white/5">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Showing <strong className="text-white">{filteredResponses.length}</strong> of {responses.length} guests</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 px-2 py-0.5 rounded-full text-[10px]">
                  Matching: &ldquo;{searchQuery}&rdquo;
                  <button onClick={() => setSearchQuery('')} className="hover:text-white ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              )}
              {filter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white/10 text-white/80 border border-white/15 px-2 py-0.5 rounded-full text-[10px] capitalize">
                  Filter: {filter === 'declined' ? 'Rejected' : filter}
                  <button onClick={() => handleFilterSelect('all')} className="hover:text-white ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              )}
            </div>
            {(searchQuery || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  handleFilterSelect('all');
                }}
                className="text-[10px] text-[#d4af37] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-y-auto max-h-[460px] divide-y divide-white/5 scrollbar-thin">
          {isLoading ? (
            <div className="p-12 text-center text-amber-300/60 italic text-sm">
              Loading guest responses...
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="p-12 text-center text-white/40 italic text-sm flex flex-col items-center justify-center gap-3">
              <p>No matching guests found{searchQuery ? ` for "${searchQuery}"` : ''}.</p>
              {(searchQuery || filter !== 'all') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    handleFilterSelect('all');
                  }}
                  className="rounded-full text-xs border-white/20 bg-white/5 hover:bg-white/10 text-white"
                >
                  Clear search &amp; filters
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {filteredResponses.map((rsvp) => {
                  const isAccepted = rsvp.status === 'Accepted';
                  const isDeclined = rsvp.status === 'Declined';
                  const isPending = rsvp.status === 'Pending';

                  return (
                    <motion.div
                      key={rsvp.id}
                      layout="position"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="p-4 hover:bg-white/5 transition-colors flex flex-col gap-2 group/row"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Left: Guest Name & Tags */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-200">
                            {rsvp.guest_name.charAt(0).toUpperCase() || 'G'}
                          </div>
                          <div>
                            <span className="font-semibold text-white text-sm md:text-base tracking-tight">
                              {rsvp.guest_name}
                            </span>
                          </div>
                          
                          {/* Guest Side Tag */}
                          {rsvp.guest_id && (
                            <span className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full font-medium border uppercase tracking-wider",
                              rsvp.guest_id.startsWith('household-') 
                                ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                : rsvp.guest_id.includes('bride') 
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            )}>
                              {rsvp.guest_id.startsWith('household-') ? 'Household' : rsvp.guest_id.includes('bride') ? 'Bride\'s' : 'Groom\'s'}
                            </span>
                          )}
                        </div>

                        {/* Right: Status Badge & Actions */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-white/40">
                            {new Date(rsvp.responded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            {new Date(rsvp.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Dynamic Status Badge */}
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1",
                            isAccepted && "bg-emerald-950/50 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
                            isDeclined && "bg-rose-950/50 text-rose-300 border-rose-500/40 shadow-[0_0_10px_rgba(244,63,94,0.15)]",
                            isPending && "bg-amber-950/50 text-amber-300 border-amber-500/40"
                          )}>
                            {isAccepted && <Check size={11} className="text-emerald-400" />}
                            {isDeclined && <X size={11} className="text-rose-400" />}
                            {isPending && <Clock size={11} className="text-amber-400" />}
                            {isAccepted ? 'Accepted' : isDeclined ? 'Rejected' : 'Pending'}
                          </span>

                          {/* Quick Direct Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleWhatsAppReply(rsvp)}
                              title="Message via WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:text-white transition-all"
                            >
                              <MessageSquare size={12} />
                            </button>
                            <button
                              onClick={() => handleCopyMessage(rsvp)}
                              title="Copy Info"
                              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 hover:text-white transition-all"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Message Quote Bubble */}
                      {rsvp.message && (
                        <div className="relative mt-1 text-xs italic bg-white/5 border-l-2 border-[#d4af37] px-4 py-2.5 rounded-r-xl text-white/95 leading-relaxed font-serif shadow-sm">
                          <span className="absolute top-1 left-2 text-[#d4af37]/10 font-serif text-3xl leading-none select-none">“</span>
                          &quot;{rsvp.message}&quot;
                        </div>
                      )}

                      {/* Dietary Badge */}
                      {rsvp.dietary_restrictions && (
                        <div className="flex gap-1.5 items-center mt-0.5">
                          <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded px-2 py-0.5 font-medium leading-none flex items-center gap-1">
                            <span>🍽️</span> Dietary: {rsvp.dietary_restrictions}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </MotionCard>
  );
};

export function AnalyticsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeRsvpFilter, setActiveRsvpFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchDashboardStats()
      .then(data => setStats(data))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  if (!stats) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <span className="text-[#d4af37] font-serif italic text-lg animate-pulse">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)] pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
        <CountdownCard />
        <QuickActions />
        <MusicWidget />
        <RSVPStatus 
          confirmed={stats.confirmedGuests} 
          pending={stats.pendingGuests}
          declined={stats.declinedGuests}
          total={stats.totalGuests}
          onFilterSelect={(f) => setActiveRsvpFilter(f as FilterType)}
          activeFilter={activeRsvpFilter}
        />
        <GuestSideBreakdown 
          groom={stats.groomCount}
          bride={stats.brideCount}
          total={stats.totalGuests}
        />
        <LatestGift />
        <SeatingMiniMap />
        <LiveRsvpFeed 
          activeFilter={activeRsvpFilter}
          onFilterChange={setActiveRsvpFilter}
        />
    </motion.div>
  );
}
