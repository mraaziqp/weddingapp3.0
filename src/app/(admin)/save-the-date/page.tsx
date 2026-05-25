'use client';

import { useEffect, useState } from 'react';
import { SaveTheDateEditor } from '@/components/save-the-date/editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarHeart, Sparkles, Eye, MailOpen, ExternalLink, Settings2, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';

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

      {/* Analytics banner for the /std envelope page */}
      <StdAnalyticsBanner />

      {/* Quick text config */}
      <QuickConfigPanel />

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <SaveTheDateEditor />
      </div>
    </div>
  );
}
