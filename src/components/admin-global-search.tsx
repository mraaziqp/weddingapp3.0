'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, Armchair, LayoutDashboard, Gift, Heart, Music, ChevronDown, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchHouseholds } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Guest } from '@/lib/types';

type RsvpStatus = Guest['rsvpStatus'];

type Result = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  type: 'guest' | 'page';
  icon: ReactNode;
  guestData?: { rsvp: RsvpStatus; householdName: string };
};

const PAGES: Result[] = [
  { id: 'p-dashboard', label: 'Dashboard', href: '/dashboard', type: 'page', icon: <LayoutDashboard size={14} /> },
  { id: 'p-guests', label: 'Guest Ledger', href: '/guests', type: 'page', icon: <Users size={14} /> },
  { id: 'p-seating', label: 'Seating Studio', href: '/seating', type: 'page', icon: <Armchair size={14} /> },
  { id: 'p-registry', label: 'Registry', href: '/registry', type: 'page', icon: <Gift size={14} /> },
  { id: 'p-vault', label: 'Memory Vault', href: '/vault', type: 'page', icon: <Heart size={14} /> },
  { id: 'p-playlist', label: 'Playlist', href: '/playlist', type: 'page', icon: <Music size={14} /> },
];

function buildGuestIndex(households: { name: string; guests: Guest[] }[]): Result[] {
  return households.flatMap(h =>
    h.guests.map(g => ({
      id: g.id,
      label: `${g.firstName} ${g.lastName}`,
      sublabel: `${h.name} · ${g.rsvpStatus}`,
      href: '/guests',
      type: 'guest' as const,
      icon: <Users size={14} />,
      guestData: { rsvp: g.rsvpStatus, householdName: h.name },
    }))
  );
}

const RSVP_CONFIG: Record<RsvpStatus, { color: string; dot: string }> = {
  Confirmed: { color: 'hover:bg-green-500/20 text-green-400', dot: 'bg-green-400' },
  Pending:   { color: 'hover:bg-yellow-500/20 text-yellow-400', dot: 'bg-yellow-400' },
  Regret:    { color: 'hover:bg-red-500/20 text-red-400', dot: 'bg-red-400' },
};

// ── Inline RSVP + Table override panel ──────────────────────────────────
function GuestOverridePanel({
  guestId,
  currentRsvp,
  tableValue,
  onRsvpChange,
  onTableChange,
}: {
  guestId: string;
  currentRsvp: RsvpStatus;
  tableValue: string;
  onRsvpChange: (id: string, status: RsvpStatus) => void;
  onTableChange: (id: string, table: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-3 pt-1 flex flex-wrap items-center gap-2 border-t border-white/5">
        <span className="text-[10px] text-white/30 uppercase tracking-widest mr-1">RSVP</span>
        {(Object.keys(RSVP_CONFIG) as RsvpStatus[]).map(status => {
          const cfg = RSVP_CONFIG[status];
          const isActive = currentRsvp === status;
          return (
            <button
              key={status}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRsvpChange(guestId, status); }}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                isActive
                  ? 'border-white/30 bg-white/15 text-white'
                  : `border-white/10 bg-transparent ${cfg.color}`
              )}
            >
              {isActive && <Check size={10} />}
              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {status}
            </button>
          );
        })}
        <span className="text-[10px] text-white/30 uppercase tracking-widest ml-2">Table</span>
        <input
          type="text"
          value={tableValue}
          onChange={e => onTableChange(guestId, e.target.value)}
          onMouseDown={e => e.stopPropagation()}
          placeholder="—"
          maxLength={3}
          className="w-12 rounded-md bg-white/10 border border-white/10 text-center text-xs text-white px-1 py-1 outline-none focus:border-[#d4af37]/50"
        />
      </div>
    </motion.div>
  );
}

export function AdminGlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rsvpOverrides, setRsvpOverrides] = useState<Record<string, RsvpStatus>>({});
  const [tableOverrides, setTableOverrides] = useState<Record<string, string>>({});
  const [guestResults, setGuestResults] = useState<Result[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchHouseholds()
      .then(households => setGuestResults(buildGuestIndex(households)))
      .catch(() => setGuestResults([]));
  }, []);

  const allResults: Result[] = [...PAGES, ...guestResults];

  // Results with RSVP overrides reflected in the sublabel
  const results: Result[] = query.trim().length > 0
    ? allResults.filter(r =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8)
      .map(r => {
        if (r.type !== 'guest' || !r.guestData) return r;
        const liveRsvp = rsvpOverrides[r.id] ?? r.guestData.rsvp;
        return {
          ...r,
          sublabel: `${r.guestData.householdName} · ${liveRsvp}`,
          guestData: { ...r.guestData, rsvp: liveRsvp },
        };
      })
    : [];

  const handlePageSelect = useCallback((result: Result) => {
    router.push(result.href);
    setQuery('');
    setIsOpen(false);
  }, [router]);

  const handleGuestRowClick = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const handleRsvpChange = useCallback((guestId: string, status: RsvpStatus) => {
    setRsvpOverrides(prev => ({ ...prev, [guestId]: status }));
    toast({ title: 'RSVP Override Applied', description: `Status set to "${status}". Confirm in Guest Ledger.` });
  }, [toast]);

  const handleTableChange = useCallback((guestId: string, table: string) => {
    setTableOverrides(prev => ({ ...prev, [guestId]: table }));
  }, []);

  // Keyboard shortcut — Cmd/Ctrl + K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setQuery('');
        setIsOpen(false);
        setExpandedId(null);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative w-full max-w-md mx-auto" data-print-hide>
      <div className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 transition-all duration-200',
        'bg-white/5 backdrop-blur-md border-white/10',
        isOpen && 'border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]'
      )}>
        <Search size={15} className="text-[#d4af37]/60 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); setExpandedId(null); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => { setIsOpen(false); }, 200)}
          placeholder="Search guests, pages… (⌘K)"
          className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
            <X size={13} className="text-white/40 hover:text-white/70" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl bg-[#0a1f18]/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
          >
            {results.map((result, i) => (
              <div key={result.id} className={cn(i !== 0 && 'border-t border-white/5')}>
                {result.type === 'guest' ? (
                  <>
                    {/* Guest row — click to expand the override panel */}
                    <button
                      onMouseDown={e => { e.preventDefault(); handleGuestRowClick(result.id); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                    >
                      <span className="text-[#d4af37]/70">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{result.label}</p>
                        {result.sublabel && (
                          <p className="text-xs text-white/40 truncate">{result.sublabel}</p>
                        )}
                      </div>
                      <ChevronDown
                        size={13}
                        className={cn(
                          'text-white/25 transition-transform duration-200 shrink-0',
                          expandedId === result.id && 'rotate-180 text-[#d4af37]/60'
                        )}
                      />
                    </button>

                    {/* Inline RSVP + Table override panel */}
                    <AnimatePresence>
                      {expandedId === result.id && (
                        <GuestOverridePanel
                          key={`panel-${result.id}`}
                          guestId={result.id}
                          currentRsvp={rsvpOverrides[result.id] ?? result.guestData?.rsvp ?? 'Pending'}
                          tableValue={tableOverrides[result.id] ?? ''}
                          onRsvpChange={handleRsvpChange}
                          onTableChange={handleTableChange}
                        />
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  /* Page result — navigate on click */
                  <button
                    onMouseDown={() => handlePageSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                  >
                    <span className="text-[#d4af37]/70">{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{result.label}</p>
                    </div>
                    <span className="text-xs text-white/20 capitalize shrink-0">{result.type}</span>
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
