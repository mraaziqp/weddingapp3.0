'use client';

import { useEffect, useState } from 'react';
import { SaveTheDateEditor } from '@/components/save-the-date/editor';
import { Badge } from '@/components/ui/badge';
import { CalendarHeart, Sparkles, Eye, MailOpen, ExternalLink } from 'lucide-react';

interface StdStats { views: number; opens: number }

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

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <SaveTheDateEditor />
      </div>
    </div>
  );
}
