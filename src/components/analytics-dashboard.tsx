
"use client"

import { useState, useEffect } from 'react';
import { Gift, QrCode, UserPlus, Map, PartyPopper, MonitorPlay, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import Image from 'next/image';
import { differenceInSeconds } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { usePartyMode } from '@/hooks/use-party-mode';
import { cn } from '@/lib/utils';

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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

const MotionCard = motion(Card);

const weddingDate = new Date('2026-09-06T15:00:00');

// Animated flip-digit for the countdown
const FlipDigit = ({ value, label }: { value: number; label: string }) => {
    const formatted = String(value).padStart(2, '0');
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative">
                <motion.div
                    key={formatted}
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    style={{ transformStyle: 'preserve-3d', transformOrigin: 'center 60%' }}
                    className="font-headline text-5xl md:text-7xl font-bold leading-none"
                    // Gold on seconds (changes every tick), white on larger units
                >
                    <span style={{
                        background: 'linear-gradient(180deg, #f6e7b7 0%, #d4af37 60%, #a07820 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.5))',
                    }}>
                        {formatted}
                    </span>
                </motion.div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">{label}</span>
        </div>
    );
};

const CountdownCard = () => {
    const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculateRemaining = () => {
            const now = new Date();
            const diff = differenceInSeconds(weddingDate, now);

            if (diff <= 0) {
                setRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

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
        <MotionCard variants={itemVariants} className="glass-card md:col-span-2 row-span-2 !p-0 relative overflow-hidden flex flex-col items-center justify-center gap-6">
            <Image
                src="https://images.unsplash.com/photo-1596789390299-b42743899351?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHx3ZWRkaW5nJTIwY291cGxlfGVufDB8fHx8MTcyMDgwODQxNnww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Couple"
                fill
                className="object-cover z-0 opacity-15"
                data-ai-hint="wedding couple"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 z-10" />

            {/* Ambient gold glow */}
            <motion.div
                className="absolute inset-0 z-10 pointer-events-none"
                animate={{ opacity: [0.04, 0.1, 0.04] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(212,175,55,0.25) 0%, transparent 70%)' }}
            />

            <motion.p
                className="z-20 font-headline italic text-base text-white/40 tracking-widest"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                Until Razia &amp; Abduraziq say I do
            </motion.p>

            <div className='z-20 flex gap-5 md:gap-10' style={{ perspective: '600px' }}>
                <AnimatePresence mode="popLayout">
                    <FlipDigit key={`d${remaining.days}`} value={remaining.days} label="Days" />
                    <FlipDigit key={`h${remaining.hours}`} value={remaining.hours} label="Hours" />
                    <FlipDigit key={`m${remaining.minutes}`} value={remaining.minutes} label="Min" />
                </AnimatePresence>
            </div>

            <motion.div
                className="z-20 text-[10px] uppercase tracking-[0.35em] text-white/30"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
            >
                September 6, 2026 · Tuscany in Rylands
            </motion.div>
        </MotionCard>
    );
};

const QuickActions = () => {
    const { toast } = useToast();
    const { partyMode, setPartyMode } = usePartyMode();

    const simulateEventDay = () => {
        const isActive = localStorage.getItem('eventDayActive') === 'true';
        if (isActive) {
            localStorage.removeItem('eventDayActive');
            toast({ title: 'Event Day Simulation Deactivated' });
        } else {
            localStorage.setItem('eventDayActive', 'true');
            toast({ title: 'Event Day Simulation Activated!', description: 'Guest invite links will now open directly to the camera view.' });
        }
    };

    const togglePartyMode = () => {
        const next = !partyMode;
        setPartyMode(next);
        toast({
            title: next ? '🎉 Party Mode is ON!' : 'Party Mode Deactivated',
            description: next
                ? 'Guest Hub is now in dark emerald party mode. The venue is ALIVE.'
                : 'Guest Hub has returned to its default cream theme.',
        });
    };
    
    return (
        <MotionCard variants={itemVariants} className="glass-card md:col-span-1 row-span-2 flex flex-col justify-center gap-4">
            <CardTitle className="text-center mb-4 text-base font-normal uppercase tracking-widest text-muted-foreground">Quick Actions</CardTitle>
            <Button size="lg" className="w-full glossy-sweep bg-gradient-to-r from-aurora-soft-gold to-aurora-gold text-black font-bold text-lg">
                <QrCode className="mr-2"/> Scan Ticket
            </Button>
            <Button size="lg" variant="outline" className="w-full border-white/20 bg-white/10 hover:bg-white/20 hover:text-white">
                <UserPlus className="mr-2"/> Add Guest
            </Button>
            {/* Party Mode Toggle */}
            <Button
                size="lg"
                onClick={togglePartyMode}
                className={cn(
                    'w-full font-bold transition-all duration-500 relative overflow-hidden',
                    partyMode
                        ? 'bg-[#064e3b] border border-[#d4af37]/50 text-[#f6e7b7] hover:bg-[#054030]'
                        : 'border border-[#d4af37]/30 bg-[#d4af37]/5 text-[#d4af37] hover:bg-[#d4af37]/15'
                )}
            >
                <Flame className="mr-2 h-5 w-5" />
                {partyMode ? 'End Party Mode' : 'Activate Party Mode'}
                {partyMode && (
                    <motion.span
                        className="ml-2 inline-block w-2 h-2 rounded-full bg-[#d4af37]"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                    />
                )}
            </Button>
            {/* Venue Projector link */}
            <Button
                size="lg"
                variant="outline"
                className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white/70"
                onClick={() => window.open('/venue-screen', '_blank')}
            >
                <MonitorPlay className="mr-2 h-4 w-4" /> Open Projector View
            </Button>
             <Button size="lg" variant="outline" className="w-full border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300" onClick={simulateEventDay}>
                <PartyPopper className="mr-2"/> Simulate Event Day
            </Button>
        </MotionCard>
    );
};

const MusicWidget = () => (
    <MotionCard variants={itemVariants} className="glass-card">
        <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vibe Check</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-2 text-center">
            <motion.div
                className="w-24 h-24 rounded-full bg-gradient-to-br from-black to-zinc-800 shadow-inner flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-aurora-soft-gold/80 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-black" />
                    </div>
                </div>
            </motion.div>
            <p className="font-bold text-base mt-2">I Wanna Dance With Somebody</p>
            <p className="text-xs text-muted-foreground">Top Genres: R&amp;B, Pop, Old School</p>
        </CardContent>
    </MotionCard>
);

const RSVPStatus = () => {
    const confirmed = 186;
    const total = 250;
    const percentage = Math.round((confirmed / total) * 100);
    const circumference = 2 * Math.PI * 40;
    const [offset, setOffset] = useState(circumference);
    
    useEffect(() => {
        // This effect runs only on the client
        const progressOffset = circumference - (percentage / 100) * circumference;
        setOffset(progressOffset);
    }, [percentage, circumference]);

    return (
        <MotionCard variants={itemVariants} className="glass-card flex flex-col items-center justify-center">
            <CardHeader className="p-4 pb-0">
                 <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">RSVP Status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-4">
                <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle className="text-white/10" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                        <motion.circle
                            className="text-aurora-gold"
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="40"
                            cx="50"
                            cy="50"
                            transform="rotate(-90 50 50)"
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-headline text-3xl text-white">{confirmed}</span>
                        <span className="text-sm text-muted-foreground">/ {total}</span>
                    </div>
                </div>
                 <p className="text-sm text-muted-foreground mt-2">Confirmed</p>
            </CardContent>
        </MotionCard>
    );
};

const LatestGift = () => (
    <MotionCard variants={itemVariants} className="glass-card">
         <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest Gift</CardTitle>
            <Gift className="absolute right-6 top-6 h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            <div className="flex items-center gap-4">
                <Image src="https://picsum.photos/seed/dutch-oven/64/64" alt="Le Creuset" width={64} height={64} className="rounded-lg" data-ai-hint="kitchenware cooking"/>
                <div>
                    <p className="font-bold">Le Creuset Dutch Oven</p>
                    <p className="text-sm text-muted-foreground">From Aunt Fatima</p>
                </div>
            </div>
        </CardContent>
    </MotionCard>
);

const SeatingMiniMap = () => (
    <MotionCard variants={itemVariants} className="glass-card md:col-span-3">
         <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seating Mini-Map</CardTitle>
             <Map className="absolute right-6 top-6 h-4 w-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full p-4">
            <Link href="/seating" className="text-center hover:scale-105 transition-transform duration-300">
                <div className="w-48 h-24 rounded-lg bg-black/20 flex items-center justify-center">
                    <p className="text-muted-foreground text-xs">Floor Plan Preview</p>
                </div>
                <p className="text-sm text-accent underline mt-2">Open Seating Studio</p>
            </Link>
        </CardContent>
    </MotionCard>
);

export function AnalyticsDashboard() {
  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
        <CountdownCard />
        <QuickActions />
        <MusicWidget />
        <RSVPStatus />
        <LatestGift />
        <SeatingMiniMap />
    </motion.div>
  )
}
