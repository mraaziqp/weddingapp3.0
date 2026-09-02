'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileUp, Loader2, CheckCircle2, AlertTriangle, Users, Table2, Save, X, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type Assignment = {
  tableName: string;
  parsedName: string;
  guestId: string | null;
  guestName: string | null;
  match: 'exact' | 'initial' | 'first-name' | 'none';
};

type Preview = {
  layout: 'grouped' | 'per-line' | 'none';
  warnings: string[];
  sourceFileName: string;
  tables: { name: string; guests: string[] }[];
  assignments: Assignment[];
  unseated: { id: string; name: string }[];
  matched: number;
  unmatched: number;
};

type SavedPlan = {
  tables: { name: string; guestNames: string[] }[];
  importedAt: string | null;
  sourceFileName: string | null;
};

const MATCH_LABEL: Record<Assignment['match'], string> = {
  exact: 'Matched',
  initial: 'Matched by initial',
  'first-name': 'Matched by first name',
  none: 'Not on the guest list',
};

export function SeatingPdfImport() {
  const [saved, setSaved] = useState<SavedPlan | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadSaved = useCallback(async () => {
    try {
      const res = await fetch('/api/seating', { cache: 'no-store' });
      if (res.ok) setSaved(await res.json());
    } catch {
      /* the importer still works without knowing the current plan */
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const readPdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ variant: 'destructive', title: 'Please choose a PDF' });
      return;
    }
    setIsReading(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/seating/import', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Import failed (${res.status})`);

      setPreview(data);
      if (data.tables.length === 0) {
        toast({ variant: 'destructive', title: 'Nothing recognised in that PDF' });
      } else {
        toast({ title: `Read ${data.tables.length} tables`, description: `${data.matched} guests matched.` });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not read that PDF', description: (err as Error).message });
    } finally {
      setIsReading(false);
    }
  };

  const save = async () => {
    if (!preview) return;
    setIsSaving(true);
    try {
      const seatByGuestId: Record<string, string> = {};
      for (const a of preview.assignments) {
        if (a.guestId) seatByGuestId[a.guestId] = a.tableName;
      }
      const res = await fetch('/api/seating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: preview.tables.map(t => ({ name: t.name, guestNames: t.guests })),
          seatByGuestId,
          sourceFileName: preview.sourceFileName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Save failed (${res.status})`);

      toast({
        title: '🪑 Seating chart published',
        description: `${data.tables} tables live. ${data.seated} guests can now see their seat.`,
      });
      setPreview(null);
      loadSaved();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not save', description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-white">
      {/* Current plan */}
      {saved && saved.tables.length > 0 && !preview && (
        <div className="flex flex-col gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-200">
                {saved.tables.length} tables are live for guests
              </p>
              <p className="text-xs text-white/55">
                {saved.sourceFileName ? `From ${saved.sourceFileName}. ` : ''}
                Every guest sees their table on their VIP Pass.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dropzone */}
      {!preview && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) readPdf(file);
          }}
          className={`rounded-3xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${
            isDragging ? 'border-amber-400 bg-amber-400/10' : 'border-white/15 bg-white/5'
          }`}
        >
          <FileUp size={34} className="mx-auto mb-3 text-amber-400/70" />
          <p className="font-headline text-lg italic text-[#f6e7b7]">
            Drop your seating chart PDF here
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
            Works with a chart grouped under table headings, or a name-per-line list
            with the table number alongside. Nothing is saved until you review it.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) readPdf(file);
              e.target.value = '';
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={isReading}
            className="mt-4 min-h-[44px] rounded-full bg-[#d4af37] font-bold text-black hover:bg-[#c49f2f]"
          >
            {isReading
              ? <><Loader2 size={16} className="mr-2 animate-spin" /> Reading the PDF…</>
              : <><FileUp size={16} className="mr-2" /> Choose PDF</>}
          </Button>
        </div>
      )}

      {/* Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Stat icon={<Table2 size={13} />} label="tables" value={preview.tables.length} />
                <Stat icon={<Users size={13} />} label="matched" value={preview.matched} tone="good" />
                {preview.unmatched > 0 && (
                  <Stat icon={<AlertTriangle size={13} />} label="unmatched" value={preview.unmatched} tone="warn" />
                )}
                {preview.unseated.length > 0 && (
                  <Stat icon={<Users size={13} />} label="not seated" value={preview.unseated.length} tone="warn" />
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  onClick={() => setPreview(null)}
                  variant="ghost"
                  className="min-h-[44px] rounded-full text-white/70 hover:text-white"
                >
                  <X size={15} className="mr-1.5" /> Discard
                </Button>
                <Button
                  onClick={save}
                  disabled={isSaving || preview.tables.length === 0}
                  className="min-h-[44px] rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                >
                  {isSaving
                    ? <Loader2 size={15} className="mr-1.5 animate-spin" />
                    : <Save size={15} className="mr-1.5" />}
                  Publish to guests
                </Button>
              </div>
            </div>

            {preview.warnings.map(w => (
              <p key={w} className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {w}
              </p>
            ))}

            <p className="text-xs text-white/45">
              Publishing replaces the current chart and updates every guest&apos;s table.
              Names not on the guest list are still shown on the table, they just
              have no personal card to update.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {preview.tables.map(table => {
                const rows = preview.assignments.filter(a => a.tableName === table.name);
                return (
                  <div key={table.name} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-white/10 pb-2">
                      <h4 className="font-headline text-base font-bold italic text-[#f6e7b7]">{table.name}</h4>
                      <span className="shrink-0 font-mono text-[11px] text-white/45">{rows.length} seats</span>
                    </div>
                    <ul className="space-y-1.5">
                      {rows.map((a, i) => (
                        <li key={`${a.parsedName}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                          <span className={a.guestId ? 'text-white/85' : 'text-white/50'}>{a.parsedName}</span>
                          <span
                            title={MATCH_LABEL[a.match]}
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              a.match === 'exact' ? 'bg-emerald-500/20 text-emerald-300'
                                : a.match === 'none' ? 'bg-white/10 text-white/45'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {a.match === 'exact' ? '✓' : a.match === 'none' ? 'guest?' : '≈'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {preview.unseated.length > 0 && (
              <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <summary className="cursor-pointer text-sm font-bold text-amber-200">
                  {preview.unseated.length} guests on your list are not in this chart
                </summary>
                <p className="mt-1 text-xs text-white/50">
                  They will simply see no table on their pass. Add them to the PDF and
                  import again if that is not right.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {preview.unseated.map(g => (
                    <span key={g.id} className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-white/60">
                      {g.name}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {saved && saved.tables.length > 0 && !preview && (
        <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <summary className="cursor-pointer text-sm font-bold text-white/80">
            <RotateCcw size={13} className="mr-1.5 inline" /> View the published chart
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {saved.tables.map(t => (
              <div key={t.name} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <h4 className="font-headline text-sm font-bold italic text-[#f6e7b7]">{t.name}</h4>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{t.guestNames.join(' · ')}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone?: 'good' | 'warn' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] ${
        tone === 'good' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : tone === 'warn' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
          : 'border-white/15 bg-white/5 text-white/70'
      }`}
    >
      {icon} {value} {label}
    </span>
  );
}
