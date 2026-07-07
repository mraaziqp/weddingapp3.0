
"use client"

import { useState, useEffect } from 'react';
import { Gift, QrCode, UserPlus, Map, PartyPopper, MonitorPlay, Flame, LayoutTemplate, SmartphoneNfc, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { differenceInSeconds } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePartyMode } from '@/hooks/use-party-mode';
import { cn } from '@/lib/utils';
import { fetchDashboardStats } from '@/lib/stats';

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

const RSVPStatus = ({ confirmed, total }: { confirmed: number; total: number }) => {
    const percentage = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const [offset, setOffset] = useState(251);

    useEffect(() => setOffset(251 - (percentage / 100) * 251), [percentage]);

    return (
        <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-0">
                 <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">RSVP Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="relative w-28 h-28 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
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
                        <span className="font-serif text-3xl font-light text-white">{confirmed}</span>
                    </div>
                </div>
                 <p className="text-[10px] uppercase tracking-widest text-white/40 mt-4">Out of {total}</p>
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
    <MotionCard variants={itemVariants} whileHover={{ y: -4 }} className="md:col-span-3 bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl overflow-hidden relative group">
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

export function AnalyticsDashboard() {
  const [stats, setStats] = useState({ confirmedGuests: 0, totalGuests: 0 });

  useEffect(() => {
    fetchDashboardStats()
      .then(data => setStats({ confirmedGuests: data.confirmedGuests, totalGuests: data.totalGuests }))
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

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
        <RSVPStatus confirmed={stats.confirmedGuests} total={stats.totalGuests || 250} />
        <LatestGift />
        <SeatingMiniMap />
    </motion.div>
  )
}

