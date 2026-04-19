'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Armchair, ChefHat, Music2, Clock, ArrowRight,
  CheckCircle2, Circle, Crown,
} from 'lucide-react';
import { allGuests, initialMenuItems, initialTimeline, initialTracks } from '@/lib/mock-data';

// ── Derived stats ─────────────────────────────────────────────────────────
const confirmedGuests = allGuests.filter(g => g.rsvpStatus === 'Confirmed');
const unseatedCount   = confirmedGuests.length; // before any seating is done
const dishCount       = initialMenuItems.length;
const dietaryCount    = confirmedGuests.filter(g => g.dietaryRestrictions && g.dietaryRestrictions !== 'None').length;
const mustPlayCount   = initialTracks.filter(t => t.column === 'must-play').length;
const nextEvent       = initialTimeline.find(e => e.isPublic);

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring', stiffness: 100, damping: 14 } },
};

// ── Avatar progress ring ──────────────────────────────────────────────────
function PersonRing({ initials, name, role, progress, color }: {
  initials: string; name: string; role: string; progress: number; color: string;
}) {
  const r = 28; const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <motion.circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (progress / 100) * circ }}
            transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
          >
            {initials}
          </div>
        </div>
      </div>
      <p className="font-headline italic text-sm text-white/90">{name}</p>
      <span className="text-[10px] uppercase tracking-widest text-white/40">{role}</span>
      <span className="text-xs font-bold" style={{ color }}>{progress}% ready</span>
    </div>
  );
}

// ── Module card ───────────────────────────────────────────────────────────
function ModuleCard({
  href, icon: Icon, title, subtitle, accent, stats,
  tasks,
}: {
  href: string; icon: React.ElementType; title: string; subtitle: string;
  accent: string; stats: Array<{ label: string; value: string | number }>;
  tasks?: Array<{ label: string; done: boolean }>;
}) {
  return (
    <motion.div variants={item} className="group">
      <Link href={href}>
        <div
          className="relative h-full rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
            borderColor: `${accent}30`,
            boxShadow: `0 0 0 0 ${accent}00`,
          }}
        >
          {/* Hover glow sweep */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}12 0%, transparent 65%)` }}
          />

          {/* Top accent bar */}
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

          <div className="p-6 flex flex-col gap-4 h-full">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}
              >
                <Icon size={22} style={{ color: accent }} />
              </div>
              <motion.div
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ x: 2 }}
              >
                <ArrowRight size={18} className="text-white/30 mt-2" />
              </motion.div>
            </div>

            <div>
              <h3 className="font-headline italic text-xl text-white/90">{title}</h3>
              <p className="text-xs text-white/40 mt-0.5 tracking-wide">{subtitle}</p>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 mt-auto">
              {stats.map(s => (
                <div key={s.label}>
                  <p className="font-bold text-2xl" style={{ color: accent }}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/35">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Task checklist */}
            {tasks && (
              <div className="space-y-1.5 border-t border-white/5 pt-3">
                {tasks.map(t => (
                  <div key={t.label} className="flex items-center gap-2 text-xs text-white/50">
                    {t.done
                      ? <CheckCircle2 size={12} style={{ color: accent }} />
                      : <Circle size={12} className="text-white/20" />}
                    <span className={t.done ? 'line-through text-white/25' : ''}>{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  return (
    <div className="space-y-10 pb-10">
      {/* Hero header */}
      <div className="text-center space-y-1">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.35em] mb-3"
          style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#d4af37' }}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Crown size={11} /> Synergy Planner Suite
        </motion.div>
        <motion.h1
          className="font-headline text-4xl md:text-5xl italic"
          style={{ background: 'linear-gradient(135deg, #f6e7b7, #d4af37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Zero Effort. Maximum Control.
        </motion.h1>
        <motion.p
          className="text-white/40 text-sm tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          September 6, 2026 · Tuscany in Rylands, Cape Town
        </motion.p>
      </div>

      {/* Couple readiness rings */}
      <motion.div
        className="flex items-center justify-center gap-12"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
      >
        <PersonRing initials="R"  name="Razia"      role="Bride"  progress={72} color="#d4af37" />
        <div className="text-center">
          <motion.div
            className="font-headline italic text-5xl text-white/15 select-none"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            &amp;
          </motion.div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 mt-1">Together</p>
        </div>
        <PersonRing initials="A"  name="Abduraziq"  role="Groom"  progress={58} color="#10b981" />
      </motion.div>

      {/* Bento grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <ModuleCard
          href="/seating"
          icon={Armchair}
          accent="#d4af37"
          title="Smart Seating"
          subtitle="Magic Seat Engine · Conflict Radar"
          stats={[
            { label: 'Guests Confirmed', value: confirmedGuests.length },
            { label: 'Still Unseated',  value: unseatedCount },
          ]}
          tasks={[
            { label: 'Import confirmed guests', done: true },
            { label: 'Run Magic Seat algorithm', done: false },
            { label: 'Review conflict radar',    done: false },
          ]}
        />
        <ModuleCard
          href="/planner/culinary"
          icon={ChefHat}
          accent="#f97316"
          title="Culinary Manifest"
          subtitle="Menu Builder · Chef's Snapshot"
          stats={[
            { label: 'Dishes',             value: dishCount },
            { label: 'Dietary Flags',      value: dietaryCount },
          ]}
          tasks={[
            { label: 'Build 4-course menu',           done: true },
            { label: 'Review Chef\'s Snapshot',         done: false },
            { label: 'Download Kitchen Manifest PDF',  done: false },
          ]}
        />
        <ModuleCard
          href="/planner/music"
          icon={Music2}
          accent="#a78bfa"
          title="Vibe Controller"
          subtitle="DJ Queue · Guest Requests"
          stats={[
            { label: 'Must Play',    value: mustPlayCount },
            { label: 'Requests In', value: allGuests.filter(g => g.songRequest).length },
          ]}
          tasks={[
            { label: 'Seed DJ queue',              done: true },
            { label: 'Review guest requests',      done: false },
            { label: 'Confirm Do Not Play list',   done: false },
          ]}
        />
        <ModuleCard
          href="/planner/timeline"
          icon={Clock}
          accent="#38bdf8"
          title="Run of Show"
          subtitle="Event Timeline · Guest Program Sync"
          stats={[
            { label: 'Events',      value: initialTimeline.length },
            { label: 'Public',     value: initialTimeline.filter(e => e.isPublic).length },
          ]}
          tasks={[
            { label: 'Set arrival & ceremony times', done: true },
            { label: 'Adjust speeches timing',       done: false },
            { label: 'Publish to guest program',     done: false },
          ]}
        />
      </motion.div>

      {/* Next milestone banner */}
      {nextEvent && (
        <motion.div
          className="rounded-2xl px-6 py-4 flex items-center justify-between"
          style={{
            background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.15)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-sky-400/60 mb-0.5">Next milestone on Run of Show</p>
            <p className="font-headline italic text-white/80 text-lg">{nextEvent.time} — {nextEvent.title}</p>
            <p className="text-white/35 text-xs mt-0.5">{nextEvent.description}</p>
          </div>
          <Link href="/planner/timeline" className="flex items-center gap-1 text-xs text-sky-400/70 hover:text-sky-300 transition-colors">
            Edit <ArrowRight size={13} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
