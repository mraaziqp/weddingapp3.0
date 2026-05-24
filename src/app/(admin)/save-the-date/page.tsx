'use client';

import { SaveTheDateEditor } from '@/components/save-the-date/editor';
import { Badge } from '@/components/ui/badge';
import { CalendarHeart, Sparkles } from 'lucide-react';

export default function SaveTheDatePage() {
  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <CalendarHeart className="h-7 w-7 text-accent" />
        <div>
          <div className="flex items-center gap-2">
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
            Design your perfect card — drag, type, style, and add AI magic. Double-click any text to edit it directly.
          </p>
        </div>
      </div>

      {/* Editor fills remaining space */}
      <div className="flex-1 min-h-0">
        <SaveTheDateEditor />
      </div>
    </div>
  );
}
