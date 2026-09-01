'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, AlertCircle, Film, Loader2, X, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  ACCEPTED_TYPES,
  UPLOAD_CONCURRENCY,
  isAcceptedFile,
  uploadOne,
  type UploadTask,
} from '@/lib/bulk-upload';

/**
 * "Upload from my camera roll" for guests.
 *
 * The disposable camera beside this is for one considered shot at a time. This
 * is the other half of the evening: a guest who has already filled their phone
 * with photos and video wants to hand over all of it at once, watch it go, and
 * know which ones landed.
 *
 * Large files go straight to Drive through a resumable session, because phone
 * video is comfortably larger than the request body the app itself can accept.
 */

type Props = {
  guestId: string;
  visibility: 'public' | 'private';
  questTag?: string | null;
  onUploaded?: () => void;
};

let taskSeq = 0;

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function GuestUploader({ guestId, visibility, questTag, onUploaded }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Object URLs pin the whole file in memory until revoked, which across a
  // camera roll's worth of photos is a real amount of it.
  const tasksRef = useRef<UploadTask[]>([]);
  tasksRef.current = tasks;
  useEffect(
    () => () => {
      for (const task of tasksRef.current) {
        if (task.previewUrl) URL.revokeObjectURL(task.previewUrl);
      }
      abortRef.current?.abort();
    },
    []
  );

  const patch = useCallback((id: string, next: Partial<UploadTask>) => {
    setTasks(current => current.map(t => (t.id === id ? { ...t, ...next } : t)));
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const accepted = incoming.filter(isAcceptedFile);
      const rejected = incoming.length - accepted.length;

      if (rejected > 0) {
        toast({
          variant: 'destructive',
          title: `Skipped ${rejected} file${rejected === 1 ? '' : 's'}`,
          description: 'Only photos and videos can be shared.',
        });
      }
      if (!accepted.length) return;

      setTasks(current => [
        ...current,
        ...accepted.map<UploadTask>(file => ({
          id: `guest-task-${++taskSeq}`,
          file,
          name: file.name,
          sizeBytes: file.size,
          isVideo: file.type.startsWith('video/'),
          status: 'queued',
          progress: 0,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        })),
      ]);
    },
    [toast]
  );

  /** Runs everything still queued or failed, a few at a time. */
  const runQueue = useCallback(async () => {
    const pending = tasksRef.current.filter(t => t.status === 'queued' || t.status === 'error');
    if (!pending.length || running) return;

    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let succeeded = 0;
    let failed = 0;
    const queue = [...pending];

    // A small fixed pool: serial is painfully slow across forty files, and
    // unbounded saturates the venue's wifi so every upload crawls at once.
    const worker = async () => {
      for (;;) {
        const task = queue.shift();
        if (!task || controller.signal.aborted) return;

        patch(task.id, { status: 'preparing', progress: 0, error: undefined });
        try {
          await uploadOne(
            task,
            { visibility, guestId, questTag },
            percent => patch(task.id, { status: 'uploading', progress: percent }),
            controller.signal
          );
          patch(task.id, { status: 'done', progress: 100 });
          succeeded++;
        } catch (err) {
          if (controller.signal.aborted) return;
          failed++;
          patch(task.id, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Upload failed',
          });
        }
      }
    };

    await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));

    setRunning(false);
    abortRef.current = null;

    if (controller.signal.aborted) return;

    if (succeeded > 0) {
      toast({
        title:
          visibility === 'public'
            ? `${succeeded} shared to the Live Wall`
            : `${succeeded} sent to the couple`,
        description: failed
          ? `${failed} didn't make it — tap Retry on those.`
          : 'Thank you for sharing your memories.',
      });
      onUploaded?.();
    } else if (failed > 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing uploaded',
        description: 'Check your signal and tap Retry.',
      });
    }
  }, [guestId, onUploaded, patch, questTag, running, toast, visibility]);

  const removeTask = (id: string) => {
    setTasks(current => {
      const target = current.find(t => t.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter(t => t.id !== id);
    });
  };

  const clearFinished = () => {
    setTasks(current => {
      for (const t of current) {
        if (t.status === 'done' && t.previewUrl) URL.revokeObjectURL(t.previewUrl);
      }
      return current.filter(t => t.status !== 'done');
    });
  };

  const done = tasks.filter(t => t.status === 'done').length;
  const failedCount = tasks.filter(t => t.status === 'error').length;
  const pendingCount = tasks.filter(t => t.status === 'queued' || t.status === 'error').length;

  // Weighted by each file's own progress, so a 200MB video doesn't make the
  // bar sit still while thirty photos fly past it.
  const overall = tasks.length
    ? Math.round(tasks.reduce((sum, t) => sum + (t.status === 'done' ? 100 : t.progress), 0) / tasks.length)
    : 0;

  return (
    <div className="flex h-full flex-col bg-[#111] text-white">
      <input
        ref={inputRef}
        type="file"
        // `multiple` with no `capture` attribute: `capture` forces the camera
        // and silently restricts the picker to a single item, which is what
        // stopped guests choosing more than one photo at a time.
        multiple
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={e => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
        <div className="mx-auto w-full max-w-md space-y-4">
          <header className="text-center">
            <h2 className="font-headline text-2xl italic text-[#d4af37]">Share your night</h2>
            <p className="mt-1 text-sm text-white/50">
              Pick as many photos and videos as you like — they upload together.
            </p>
          </header>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d4af37]/40 bg-[#d4af37]/5 px-6 py-8 transition-colors hover:border-[#d4af37]/70 hover:bg-[#d4af37]/10"
          >
            <UploadCloud className="text-[#d4af37]" size={30} />
            <span className="font-medium text-[#f6e7b7]">Choose photos &amp; videos</span>
            <span className="text-xs text-white/40">Select as many as you want</span>
          </button>

          {tasks.length > 0 && (
            <>
              {/* Overall progress */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-[#f6e7b7]">
                    {done} of {tasks.length} uploaded
                  </span>
                  <span className="tabular-nums text-white/50">{overall}%</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuenow={overall}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Overall upload progress"
                >
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f6e7b7]"
                    animate={{ width: `${overall}%` }}
                    transition={{ ease: 'easeOut', duration: 0.3 }}
                  />
                </div>
                {failedCount > 0 && (
                  <p className="mt-2 text-xs text-red-300">
                    {failedCount} didn&apos;t upload. Tap Retry to try again.
                  </p>
                )}
              </div>

              {/* Per-file rows */}
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {tasks.map(task => (
                    <motion.li
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2"
                    >
                      <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-black/40">
                        {task.previewUrl ? (
                          // Local object URL for a file the guest just picked;
                          // next/image would only add an optimiser round trip.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={task.previewUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Film className="absolute inset-0 m-auto text-white/40" size={20} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs text-white/80">{task.name}</p>
                        <p className="text-[11px] text-white/40">
                          {formatSize(task.sizeBytes)}
                          {task.isVideo ? ' · video' : ''}
                          {task.status === 'error' && task.error ? ` · ${task.error}` : ''}
                        </p>
                        {(task.status === 'uploading' || task.status === 'preparing') && (
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#d4af37] transition-[width] duration-200"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 pr-1">
                        {task.status === 'done' && (
                          <CheckCircle2 className="text-emerald-400" size={18} />
                        )}
                        {task.status === 'error' && (
                          <AlertCircle className="text-red-400" size={18} />
                        )}
                        {(task.status === 'uploading' || task.status === 'preparing') && (
                          <Loader2 className="animate-spin text-[#d4af37]" size={18} />
                        )}
                        {task.status === 'queued' && !running && (
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            aria-label={`Remove ${task.name}`}
                            className="text-white/30 hover:text-white/70"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Action bar */}
      {tasks.length > 0 && (
        <div className="flex-shrink-0 border-t border-white/10 bg-[#111] px-4 py-3">
          <div className="mx-auto flex w-full max-w-md items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="flex-1 rounded-full border border-white/15 py-3 text-sm font-medium text-white/70"
              >
                Stop
              </button>
            ) : (
              <>
                {done > 0 && (
                  <button
                    type="button"
                    onClick={clearFinished}
                    className="rounded-full border border-white/15 px-4 py-3 text-sm text-white/60"
                  >
                    Clear done
                  </button>
                )}
                <button
                  type="button"
                  onClick={runQueue}
                  disabled={pendingCount === 0}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-colors',
                    pendingCount === 0
                      ? 'bg-white/10 text-white/30'
                      : 'bg-[#d4af37] text-black hover:bg-[#c19f2f]'
                  )}
                >
                  {failedCount > 0 && done + failedCount === tasks.length ? (
                    <>
                      <RotateCcw size={16} /> Retry {failedCount}
                    </>
                  ) : (
                    <>Upload {pendingCount}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
