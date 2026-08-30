'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, CheckCircle2, AlertCircle, Film, Loader2, Trash2 } from 'lucide-react';

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
 * Bulk upload for the Memory Vault.
 *
 * Takes any number of photos and videos in one go — the file input is
 * `multiple`, and the drop zone accepts a whole selection at once, so adding
 * an evening's worth of media is one action rather than one file at a time.
 */

type Props = {
  visibility: 'public' | 'private';
  /** Called once the queue drains, so the grid can refetch. */
  onUploaded: () => void;
};

let taskSeq = 0;

export function VaultUploader({ visibility, onUploaded }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Object URLs pin the full file in memory until revoked, which on a batch of
  // forty camera videos is a real amount of it.
  const tasksRef = useRef<UploadTask[]>([]);
  tasksRef.current = tasks;
  useEffect(() => {
    return () => {
      for (const task of tasksRef.current) {
        if (task.previewUrl) URL.revokeObjectURL(task.previewUrl);
      }
    };
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
          description: 'Only photos and videos can go in the vault.',
        });
      }
      if (accepted.length === 0) return;

      setTasks(current => [
        ...current,
        ...accepted.map<UploadTask>(file => ({
          id: `task-${++taskSeq}`,
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

  const patch = useCallback((id: string, changes: Partial<UploadTask>) => {
    setTasks(current => current.map(t => (t.id === id ? { ...t, ...changes } : t)));
  }, []);

  const startUpload = useCallback(async () => {
    const pending = tasksRef.current.filter(t => t.status === 'queued' || t.status === 'error');
    if (pending.length === 0) return;

    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;

    let succeeded = 0;
    let failed = 0;

    // A shared cursor over the queue: each worker takes the next item as it
    // frees up, so one slow 200MB video does not hold back the rest.
    let cursor = 0;
    const worker = async () => {
      for (;;) {
        const index = cursor++;
        if (index >= pending.length) return;
        const task = pending[index];

        patch(task.id, { status: 'preparing', progress: 0, error: undefined });
        try {
          await uploadOne(
            task,
            visibility,
            percent => patch(task.id, { status: 'uploading', progress: percent }),
            controller.signal
          );
          patch(task.id, { status: 'done', progress: 100 });
          succeeded++;
        } catch (err) {
          if (controller.signal.aborted) return;
          patch(task.id, {
            status: 'error',
            error: (err as Error).message || 'Upload failed',
          });
          failed++;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, pending.length) }, worker)
    );

    setRunning(false);
    abortRef.current = null;

    if (succeeded > 0) {
      toast({
        title: `${succeeded} added to the vault`,
        description: failed > 0 ? `${failed} could not be uploaded.` : undefined,
      });
      onUploaded();
    } else if (failed > 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing uploaded',
        description: 'Tap Retry to try the failed files again.',
      });
    }
  }, [visibility, patch, toast, onUploaded]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setTasks(current =>
      current.map(t =>
        t.status === 'uploading' || t.status === 'preparing'
          ? { ...t, status: 'queued', progress: 0 }
          : t
      )
    );
  }, []);

  const clearFinished = useCallback(() => {
    setTasks(current => {
      for (const t of current) {
        if (t.status === 'done' && t.previewUrl) URL.revokeObjectURL(t.previewUrl);
      }
      return current.filter(t => t.status !== 'done');
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(current => {
      const target = current.find(t => t.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter(t => t.id !== id);
    });
  }, []);

  const pendingCount = tasks.filter(t => t.status === 'queued' || t.status === 'error').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          dragging
            ? 'border-amber-400 bg-amber-400/10'
            : 'border-white/15 bg-white/[0.03] hover:border-amber-400/50'
        )}
      >
        <UploadCloud className="text-amber-400" size={26} />
        <p className="text-sm font-medium text-amber-50">
          Drop photos and videos here, or tap to choose
        </p>
        <p className="text-xs text-white/40">
          Select as many as you like — they upload together
        </p>
      </div>

      {/* `multiple` is the whole point: the picker opens straight into
          multi-select on both desktop and mobile. */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        hidden
        onChange={e => {
          if (e.target.files?.length) addFiles(e.target.files);
          // Reset so re-picking the same file still fires a change event.
          e.target.value = '';
        }}
      />

      {/* Queue */}
      {tasks.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/50">
              {tasks.length} file{tasks.length === 1 ? '' : 's'}
              {doneCount > 0 && ` · ${doneCount} uploaded`}
            </p>
            <div className="flex gap-2">
              {doneCount > 0 && !running && (
                <button
                  onClick={clearFinished}
                  className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70"
                >
                  <Trash2 size={12} /> Clear done
                </button>
              )}
              {running ? (
                <button
                  onClick={cancel}
                  className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/20"
                >
                  Cancel
                </button>
              ) : (
                pendingCount > 0 && (
                  <button
                    onClick={startUpload}
                    className="rounded-md bg-amber-500 px-3 py-1 text-xs font-bold text-black shadow-lg shadow-amber-500/25 hover:bg-amber-400"
                  >
                    Upload {pendingCount}
                  </button>
                )
              )}
            </div>
          </div>

          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            <AnimatePresence initial={false}>
              {tasks.map(task => (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-2"
                >
                  {/* Thumb */}
                  <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-black/40">
                    {task.previewUrl ? (
                      // A local object URL for a file that exists only in this
                      // tab — nothing for next/image to optimise.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={task.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Film className="absolute inset-0 m-auto text-white/40" size={16} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-white/80">{task.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className={cn(
                            'h-full rounded-full',
                            task.status === 'error' ? 'bg-red-500' : 'bg-amber-400'
                          )}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <span className="w-20 flex-shrink-0 text-right text-[10px] text-white/35">
                        {task.status === 'error'
                          ? 'Failed'
                          : task.status === 'done'
                            ? 'Done'
                            : task.status === 'uploading'
                              ? `${task.progress}%`
                              : task.status === 'preparing'
                                ? 'Preparing…'
                                : formatBytes(task.sizeBytes)}
                      </span>
                    </div>
                    {task.error && (
                      <p className="mt-0.5 truncate text-[10px] text-red-400">{task.error}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {task.status === 'done' ? (
                      <CheckCircle2 size={16} className="text-green-500" />
                    ) : task.status === 'error' ? (
                      <AlertCircle size={16} className="text-red-500" />
                    ) : task.status === 'uploading' || task.status === 'preparing' ? (
                      <Loader2 size={15} className="animate-spin text-amber-400" />
                    ) : (
                      <button
                        onClick={() => removeTask(task.id)}
                        aria-label={`Remove ${task.name}`}
                        className="text-white/30 transition-colors hover:text-white/70"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
