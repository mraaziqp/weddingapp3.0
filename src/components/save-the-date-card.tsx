'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Share2,
  Download,
  Printer,
  Copy,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Heart,
} from 'lucide-react';

// ── Ornamental SVG decorations ────────────────────────────────────────────────

function CornerOrnament({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M2 2 L2 30 Q2 2 30 2 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.9"
      />
      <path
        d="M2 2 L30 2 Q2 2 2 30 Z"
        stroke="currentColor"
        strokeWidth="0.5"
        fill="currentColor"
        opacity="0.15"
      />
      {/* Inner corner bracket */}
      <path
        d="M8 8 L8 22 M8 8 L22 8"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.7"
      />
      {/* Diamond accent */}
      <rect
        x="1"
        y="1"
        width="4"
        height="4"
        transform="rotate(45 3 3)"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Floral curl */}
      <path
        d="M18 18 Q22 14 26 18 Q30 22 26 26"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
      <circle cx="18" cy="18" r="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="26" cy="26" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function DividerOrnament() {
  return (
    <svg viewBox="0 0 200 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px] h-5">
      <line x1="0" y1="10" x2="80" y2="10" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
      <path d="M85 10 L92 4 L99 10 L92 16 Z" fill="currentColor" opacity="0.8" />
      <circle cx="99" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <path d="M99 10 L106 4 L113 10 L106 16 Z" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.7" />
      <circle cx="113" cy="10" r="1.5" fill="currentColor" opacity="0.9" />
      <path d="M113 10 L120 4 L127 10 L120 16 Z" fill="currentColor" opacity="0.8" />
      <line x1="127" y1="10" x2="200" y2="10" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SaveTheDateConfig {
  partner1: string;
  partner2: string;
  date: string;         // e.g. "Saturday, 6th September 2025"
  venue: string;        // e.g. "The Grand Pavilion"
  city: string;         // e.g. "Cape Town, South Africa"
  websiteUrl: string;   // QR code target
}

interface SaveTheDateCardProps {
  config: SaveTheDateConfig;
  showControls?: boolean;
}

// ── Main Card ─────────────────────────────────────────────────────────────────

export function SaveTheDateCard({ config, showControls = true }: SaveTheDateCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(config.websiteUrl);
      toast({ title: 'Link copied!', description: 'Share it with your loved ones.' });
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy the URL manually.', variant: 'destructive' });
    }
  }, [config.websiteUrl, toast]);

  const handleWhatsApp = useCallback(() => {
    const text = `💍 Save the Date!\n\n${config.partner1} & ${config.partner2} are getting married!\n\n📅 ${config.date}\n📍 ${config.venue}, ${config.city}\n\nView our wedding website & RSVP here:\n${config.websiteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  }, [config]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(() => {
    if (!printRef.current) return;
    // Create a data URL via a hidden iframe for printing to PDF
    toast({
      title: 'Tip',
      description: 'Use "Save as PDF" in the print dialog to download a file.',
    });
    window.print();
  }, [toast]);

  return (
    <div className="flex flex-col items-center gap-8">
      {/* ── Card wrapper with 3D flip ── */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: '1200px', width: 380, height: 540 }}
        onClick={() => setIsFlipped(f => !f)}
        aria-label="Click to flip card"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsFlipped(f => !f)}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%' }}
          className="relative"
        >
          {/* ════ FRONT FACE ════ */}
          <CardFace position="front" config={config} />

          {/* ════ BACK FACE ════ */}
          <CardFace position="back" config={config} isMounted={isMounted} />
        </motion.div>

        {/* Flip hint */}
        <AnimatePresence>
          {!isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5 }}
              className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-[#d4af37]/60 pointer-events-none whitespace-nowrap"
            >
              <RotateCcw size={10} />
              <span>Click card to reveal QR code</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Action buttons ── */}
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-4 print:hidden"
        >
          <Button
            variant="outline"
            size="sm"
            className="glass-card !rounded-xl border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 gap-2"
            onClick={(e) => { e.stopPropagation(); handleWhatsApp(); }}
          >
            <MessageCircle size={15} />
            WhatsApp
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="glass-card !rounded-xl border-white/20 hover:bg-white/10 gap-2"
            onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
          >
            <Copy size={15} />
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="glass-card !rounded-xl border-white/20 hover:bg-white/10 gap-2"
            onClick={(e) => { e.stopPropagation(); handlePrint(); }}
          >
            <Printer size={15} />
            Print / PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="glass-card !rounded-xl border-white/20 hover:bg-white/10 gap-2"
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          >
            <Download size={15} />
            Download
          </Button>
        </motion.div>
      )}

      {/* ── Hidden print target ── */}
      <div ref={printRef} className="hidden" />

      {/* Print styles injected into head */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .save-the-date-print-target,
          .save-the-date-print-target * { visibility: visible !important; }
          .save-the-date-print-target {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #022c22 !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Card Face ─────────────────────────────────────────────────────────────────

function CardFace({
  position,
  config,
  isMounted,
}: {
  position: 'front' | 'back';
  config: SaveTheDateConfig;
  isMounted?: boolean;
}) {
  const isFront = position === 'front';

  return (
    <div
      className="absolute inset-0 rounded-3xl overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: isFront ? undefined : 'rotateY(180deg)',
      }}
    >
      {isFront ? (
        <FrontContent config={config} />
      ) : (
        <BackContent config={config} isMounted={isMounted ?? false} />
      )}
    </div>
  );
}

// ── Front content ─────────────────────────────────────────────────────────────

function FrontContent({ config }: { config: SaveTheDateConfig }) {
  return (
    <div className="save-the-date-print-target relative w-full h-full flex flex-col items-center justify-between py-8 px-6 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #064e3b 0%, #022c22 45%, #010a06 100%)',
        boxShadow: 'inset 0 0 80px rgba(212,175,55,0.06)',
      }}
    >
      {/* Texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M20 0v40M0 20h40' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gold border frame */}
      <div className="absolute inset-3 rounded-2xl pointer-events-none"
        style={{ border: '1px solid rgba(212,175,55,0.35)' }}
      />
      <div className="absolute inset-5 rounded-xl pointer-events-none"
        style={{ border: '0.5px solid rgba(212,175,55,0.15)' }}
      />

      {/* Corner ornaments */}
      <CornerOrnament className="absolute top-4 left-4 w-16 h-16 text-[#d4af37]" />
      <CornerOrnament className="absolute top-4 right-4 w-16 h-16 text-[#d4af37] scale-x-[-1]" />
      <CornerOrnament className="absolute bottom-4 left-4 w-16 h-16 text-[#d4af37] scale-y-[-1]" />
      <CornerOrnament className="absolute bottom-4 right-4 w-16 h-16 text-[#d4af37] scale-[-1]" />

      {/* ── Top section ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-1 z-10"
      >
        <p
          className="text-[10px] uppercase tracking-[0.35em] font-light"
          style={{ color: 'rgba(212,175,55,0.7)', fontFamily: "'Cinzel', serif" }}
        >
          Together with their families
        </p>
      </motion.div>

      {/* ── Names ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 200 }}
        className="text-center z-10 space-y-0"
      >
        <p
          className="text-[62px] leading-tight"
          style={{
            fontFamily: "'Great Vibes', cursive",
            color: '#f6e7b7',
            textShadow: '0 0 30px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {config.partner1}
        </p>

        {/* Ampersand */}
        <div className="flex items-center justify-center gap-4 my-1">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.5))' }} />
          <p
            className="text-3xl"
            style={{
              fontFamily: "'Great Vibes', cursive",
              color: '#d4af37',
              textShadow: '0 0 20px rgba(212,175,55,0.6)',
            }}
          >
            &amp;
          </p>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, rgba(212,175,55,0.5))' }} />
        </div>

        <p
          className="text-[62px] leading-tight"
          style={{
            fontFamily: "'Great Vibes', cursive",
            color: '#f6e7b7',
            textShadow: '0 0 30px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {config.partner2}
        </p>
      </motion.div>

      {/* ── Save the date headline ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-center z-10 space-y-3"
      >
        <div className="flex items-center justify-center">
          <DividerOrnament />
        </div>
        <p
          className="text-[11px] uppercase tracking-[0.5em]"
          style={{ color: 'rgba(212,175,55,0.7)', fontFamily: "'Cinzel', serif" }}
        >
          are joyfully announcing
        </p>
        <p
          className="text-[22px] tracking-widest uppercase font-bold"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#d4af37',
            textShadow: '0 0 20px rgba(212,175,55,0.3)',
            letterSpacing: '0.3em',
          }}
        >
          Save the Date
        </p>
        <div className="flex items-center justify-center">
          <DividerOrnament />
        </div>
      </motion.div>

      {/* ── Date & Venue ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="text-center z-10 space-y-2"
      >
        <p
          className="text-[17px] font-medium"
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f6e7b7',
            letterSpacing: '0.05em',
          }}
        >
          {config.date}
        </p>
        <p
          className="text-[11px] uppercase tracking-[0.25em]"
          style={{ color: 'rgba(246,231,183,0.6)', fontFamily: "'Cinzel', serif" }}
        >
          {config.venue}
        </p>
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: 'rgba(246,231,183,0.4)', fontFamily: "'Cinzel', serif" }}
        >
          {config.city}
        </p>
      </motion.div>

      {/* ── Bottom note ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center z-10"
      >
        <p
          className="text-[9px] uppercase tracking-[0.3em]"
          style={{ color: 'rgba(212,175,55,0.4)', fontFamily: "'Cinzel', serif" }}
        >
          Formal invitation to follow
        </p>
        <div className="flex items-center justify-center gap-2 mt-1.5 opacity-40">
          <div className="h-px w-8" style={{ background: 'rgba(212,175,55,0.5)' }} />
          <Heart size={8} className="text-[#d4af37] fill-[#d4af37]" />
          <div className="h-px w-8" style={{ background: 'rgba(212,175,55,0.5)' }} />
        </div>
      </motion.div>
    </div>
  );
}

// ── Back content ──────────────────────────────────────────────────────────────

function BackContent({ config, isMounted }: { config: SaveTheDateConfig; isMounted: boolean }) {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-between py-8 px-7 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #022c22 0%, #010a06 60%, #031a26 100%)',
        boxShadow: 'inset 0 0 80px rgba(212,175,55,0.04)',
      }}
    >
      {/* Gold border frame */}
      <div className="absolute inset-3 rounded-2xl pointer-events-none"
        style={{ border: '1px solid rgba(212,175,55,0.3)' }}
      />

      {/* Corner ornaments */}
      <CornerOrnament className="absolute top-4 left-4 w-12 h-12 text-[#d4af37]" />
      <CornerOrnament className="absolute top-4 right-4 w-12 h-12 text-[#d4af37] scale-x-[-1]" />
      <CornerOrnament className="absolute bottom-4 left-4 w-12 h-12 text-[#d4af37] scale-y-[-1]" />
      <CornerOrnament className="absolute bottom-4 right-4 w-12 h-12 text-[#d4af37] scale-[-1]" />

      {/* Top text */}
      <div className="text-center z-10 space-y-1">
        <p
          className="text-[10px] uppercase tracking-[0.4em]"
          style={{ color: 'rgba(212,175,55,0.6)', fontFamily: "'Cinzel', serif" }}
        >
          Scan to visit our
        </p>
        <p
          className="text-[18px] tracking-widest"
          style={{
            fontFamily: "'Cinzel', serif",
            color: '#d4af37',
            letterSpacing: '0.25em',
          }}
        >
          Wedding Website
        </p>
      </div>

      {/* QR Code */}
      <div className="z-10 flex flex-col items-center gap-4">
        <div
          className="relative p-4 rounded-2xl"
          style={{ background: 'rgba(255,255,255,0.97)' }}
        >
          {/* Gold glow ring */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ boxShadow: '0 0 30px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.1)' }}
          />
          {isMounted && (
            <QRCode
              value={config.websiteUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#022c22"
              level="H"
            />
          )}
          {/* Center monogram overlay on QR */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{
                background: '#064e3b',
                color: '#d4af37',
                fontFamily: "'Cinzel', serif",
                border: '1.5px solid #d4af37',
              }}
            >
              {config.partner1[0]}{config.partner2[0]}
            </div>
          </div>
        </div>
        <p
          className="text-[9px] uppercase tracking-[0.25em] text-center max-w-[200px] leading-relaxed"
          style={{ color: 'rgba(246,231,183,0.45)', fontFamily: "'Cinzel', serif", wordBreak: 'break-all' }}
        >
          {config.websiteUrl.replace(/^https?:\/\//, '')}
        </p>
      </div>

      {/* Bottom details */}
      <div className="text-center z-10 space-y-2">
        <div className="flex items-center justify-center">
          <DividerOrnament />
        </div>
        <p
          className="text-[14px]"
          style={{
            fontFamily: "'Great Vibes', cursive",
            color: '#f6e7b7',
          }}
        >
          {config.partner1} &amp; {config.partner2}
        </p>
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: 'rgba(212,175,55,0.5)', fontFamily: "'Cinzel', serif" }}
        >
          {config.date}
        </p>
        <div className="flex items-center justify-center gap-2 mt-1 opacity-40">
          <Sparkles size={8} className="text-[#d4af37]" />
          <p
            className="text-[8px] uppercase tracking-[0.3em]"
            style={{ color: 'rgba(212,175,55,0.6)', fontFamily: "'Cinzel', serif" }}
          >
            RSVP & details inside
          </p>
          <Sparkles size={8} className="text-[#d4af37]" />
        </div>
      </div>
    </div>
  );
}
