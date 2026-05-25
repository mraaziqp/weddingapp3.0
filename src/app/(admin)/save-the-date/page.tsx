'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { SaveTheDateEditor } from '@/components/save-the-date/editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarHeart, Sparkles, Eye, MailOpen, ExternalLink, Settings2, ChevronDown, ChevronUp, Save, Loader2, Download } from 'lucide-react';

interface StdStats { views: number; opens: number }

interface StdConfig {
  partner1Short: string;
  partner2Short: string;
  partner1Full: string;
  partner2Full: string;
  date: string;
  dateVerbose: string;
  venue: string;
  city: string;
}

// ── Helper: draw text wrapping at maxWidth on canvas ─────────────────────────
function canvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
) {
  if (!text) return;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

// ── Poster export ─────────────────────────────────────────────────────────────
function PosterExportButton() {
  const [generating, setGenerating] = useState(false);

  const exportPoster = async () => {
    setGenerating(true);
    try {
      // Fetch latest published config
      const res = await fetch('/api/std/config');
      const { config } = (await res.json()) as { config: StdConfig };

      const W = 1080, H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // ── Background image ────────────────────────────────────────────────────
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      await new Promise<void>(resolve => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => resolve();
        bgImg.src = '/couple-bg.jpg';
      });

      if (bgImg.naturalWidth > 0) {
        const scale = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
        const sw = bgImg.naturalWidth * scale;
        const sh = bgImg.naturalHeight * scale;
        ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
      } else {
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, W, H);
      }

      // ── Gradient overlay ─────────────────────────────────────────────────────
      const overlay = ctx.createLinearGradient(0, 0, 0, H);
      overlay.addColorStop(0,   'rgba(0,0,0,0.82)');
      overlay.addColorStop(0.45,'rgba(0,0,0,0.52)');
      overlay.addColorStop(0.72,'rgba(0,0,0,0.62)');
      overlay.addColorStop(1,   'rgba(0,0,0,0.90)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);

      // ── Ensure web-fonts are loaded ───────────────────────────────────────────
      await Promise.allSettled([
        document.fonts.load('bold 80px Cinzel'),
        document.fonts.load('80px "Great Vibes"'),
        document.fonts.load('italic 50px "Playfair Display"'),
      ]);

      const GOLD  = '#c9a96e';
      const WHITE = '#ffffff';
      const CREAM = 'rgba(255,248,235,0.92)';
      const DIM   = 'rgba(255,248,235,0.50)';

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'alphabetic';

      // ── "YOU ARE INVITED TO" ─────────────────────────────────────────────────
      ctx.font      = '500 36px Cinzel';
      ctx.fillStyle = GOLD;
      canvasText(ctx, 'YOU  ARE  INVITED  TO', W / 2, 158);

      ctx.strokeStyle = GOLD;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(160, 184); ctx.lineTo(W - 160, 184); ctx.stroke();

      // ── SAVE THE DATE ────────────────────────────────────────────────────────
      ctx.font      = 'bold 120px Cinzel';
      ctx.fillStyle = WHITE;
      canvasText(ctx, 'SAVE THE DATE', W / 2, 340, W - 80);

      ctx.strokeStyle = GOLD;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(160, 368); ctx.lineTo(W - 160, 368); ctx.stroke();

      // ── Diamond ornament ─────────────────────────────────────────────────────
      ctx.fillStyle = GOLD;
      ctx.save();
      ctx.translate(W / 2, 408);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();

      // ── Names in Great Vibes ─────────────────────────────────────────────────
      ctx.font      = '134px "Great Vibes"';
      ctx.fillStyle = GOLD;
      canvasText(ctx, config.partner2Full || 'Partner One', W / 2, 646, W - 80);

      ctx.font      = 'italic 76px "Playfair Display"';
      ctx.fillStyle = CREAM;
      canvasText(ctx, '\u0026', W / 2, 762);

      ctx.font      = '134px "Great Vibes"';
      ctx.fillStyle = GOLD;
      canvasText(ctx, config.partner1Full || 'Partner Two', W / 2, 930, W - 80);

      // ── Divider line ─────────────────────────────────────────────────────────
      ctx.strokeStyle = GOLD;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(220, 978); ctx.lineTo(W - 220, 978); ctx.stroke();

      // ── Date & venue ─────────────────────────────────────────────────────────
      ctx.font      = '58px Cinzel';
      ctx.fillStyle = WHITE;
      canvasText(ctx, config.dateVerbose || config.date || 'TBD', W / 2, 1066, W - 80);

      ctx.font      = '44px "Playfair Display"';
      ctx.fillStyle = CREAM;
      canvasText(ctx, config.venue || '', W / 2, 1136, W - 80);

      ctx.font      = '36px Cinzel';
      ctx.fillStyle = DIM;
      canvasText(ctx, config.city || '', W / 2, 1192);

      // ── Scan label ────────────────────────────────────────────────────────────
      ctx.font      = '36px Cinzel';
      ctx.fillStyle = CREAM;
      canvasText(ctx, 'SCAN  TO  VIEW  YOUR  INVITATION', W / 2, 1290);

      // ── QR Code ────────────────────────────────────────────────────────────────
      const QR_SIZE = 340;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, 'https://www.raziaraaziq.co.za/std', {
        width: QR_SIZE,
        margin: 2,
        color: { dark: '#1a0e00', light: '#f5e8d0' },
      });

      const qrX = (W - QR_SIZE - 40) / 2;
      const qrY = 1318;

      // Cream card backing
      ctx.fillStyle = '#f5e8d0';
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect
        ? (ctx as any).roundRect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40, 18)
        : ctx.rect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40);
      ctx.fill();

      // Gold border
      ctx.strokeStyle = GOLD;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      (ctx as any).roundRect
        ? (ctx as any).roundRect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40, 18)
        : ctx.rect(qrX - 20, qrY - 20, QR_SIZE + 40, QR_SIZE + 40);
      ctx.stroke();

      ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE);

      // URL below QR
      ctx.font      = '36px Cinzel';
      ctx.fillStyle = GOLD;
      canvasText(ctx, 'raziaraaziq.co.za/std', W / 2, qrY + QR_SIZE + 68);

      // ── Bottom caption ───────────────────────────────────────────────────────
      ctx.font      = 'italic 32px "Playfair Display"';
      ctx.fillStyle = DIM;
      canvasText(ctx, 'With love \u2014 please keep this date free \u2665', W / 2, 1876);

      // ── Download ─────────────────────────────────────────────────────────────
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href     = url;
        a.download = 'razia-abduraziq-save-the-date.png';
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={exportPoster}
      disabled={generating}
      size="sm"
      className="bg-gradient-to-r from-[#c9a96e] to-[#e2c98a] text-black font-semibold hover:opacity-90 flex-shrink-0 gap-1.5"
    >
      {generating
        ? <><Loader2 size={13} className="animate-spin" />Generating…</>
        : <><Download size={13} />Export Poster</>}
    </Button>
  );
}


function QuickConfigPanel() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<StdConfig>({
    partner1Short: '', partner2Short: '',
    partner1Full: '', partner2Full: '',
    date: '', dateVerbose: '', venue: '', city: '',
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/std/config')
      .then(r => r.json())
      .then((d: { config: StdConfig }) => {
        if (d?.config) setConfig(c => ({ ...c, ...d.config }));
      })
      .catch(() => {});
  }, []);

  const field = (key: keyof StdConfig, label: string, placeholder?: string) => (
    <div className="flex flex-col gap-1">
      <Label className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      <Input
        value={config[key]}
        onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
        placeholder={placeholder}
        className="h-8 text-sm bg-white/5 border-white/10"
      />
    </div>
  );

  const save = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/std/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      setStatus(res.ok ? 'ok' : 'error');
      if (!res.ok) console.error(await res.text());
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl bg-white/[0.03] flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-white/5 transition-colors rounded-xl"
      >
        <span className="flex items-center gap-2">
          <Settings2 size={14} className="text-accent" />
          Quick Config — Edit Names, Date &amp; Venue
        </span>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {field('partner1Full', "Partner 1 — Full Name", "e.g. Abdu-Raazig Sarber")}
            {field('partner2Full', "Partner 2 — Full Name", "e.g. Razia Shade")}
            {field('partner1Short', "Partner 1 — Short Name", "e.g. Abdu-Raazig")}
            {field('partner2Short', "Partner 2 — Short Name", "e.g. Razia")}
            {field('date', "Date (short)", "e.g. 06.09.2026")}
            {field('dateVerbose', "Date (full text)", "e.g. Saturday, 6th September 2026")}
            {field('venue', "Venue Name", "e.g. The Grand Pavilion")}
            {field('city', "City", "e.g. Cape Town")}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={save}
              disabled={saving}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-black font-semibold"
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin mr-1.5" />Saving…</>
                : <><Save size={13} className="mr-1.5" />Save &amp; Publish</>}
            </Button>
            {status === 'ok' && <span className="text-xs text-emerald-400">Saved successfully!</span>}
            {status === 'error' && <span className="text-xs text-red-400">Save failed — check console</span>}
          </div>
        </div>
      )}
    </div>
  );
}



function StdAnalyticsBanner() {
  const [stats, setStats] = useState<StdStats | null>(null);

  useEffect(() => {
    fetch('/api/std/track')
      .then(r => r.json())
      .then((d: StdStats) => setStats(d))
      .catch(() => {/* analytics table may not be set up yet */});
  }, []);

  const openRate = stats && stats.views > 0
    ? Math.round((stats.opens / stats.views) * 100)
    : null;

  return (
    <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
      {/* Share link */}
      <a
        href="/std"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest border border-accent/30 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/10 transition-colors"
      >
        <ExternalLink size={11} />
        Guest Link: /std
      </a>

      {/* Stats pills */}
      {stats !== null && (
        <>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <Eye size={12} className="text-accent" />
            <span className="font-semibold text-foreground">{stats.views.toLocaleString()}</span>
            <span>views</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
            <MailOpen size={12} className="text-accent" />
            <span className="font-semibold text-foreground">{stats.opens.toLocaleString()}</span>
            <span>opened seal</span>
          </div>
          {openRate !== null && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Sparkles size={12} className="text-accent" />
              <span className="font-semibold text-foreground">{openRate}%</span>
              <span>open rate</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SaveTheDatePage() {
  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        <CalendarHeart className="h-7 w-7 text-accent flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="font-headline text-3xl font-bold italic tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Save the Date Studio
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-accent/30 text-accent">
              <Sparkles size={9} className="mr-1" />
              Canva-style
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide">
            Design your card below — or share the animated envelope reveal with guests at{' '}
            <a href="/std" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">/std</a>.
          </p>
        </div>
      </div>

      {/* Analytics banner + poster export */}
      <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
        <StdAnalyticsBanner />
        <PosterExportButton />
      </div>

      {/* Quick text config */}
      <QuickConfigPanel />

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <SaveTheDateEditor />
      </div>
    </div>
  );
}
