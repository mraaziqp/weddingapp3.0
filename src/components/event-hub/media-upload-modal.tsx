'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Loader2, Send, Mic, Square, Type, Image as ImageIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SCAVENGER_TASKS, findTask } from '@/lib/event-config';
import { postNote, uploadEventPhoto, uploadVoiceMemo } from '@/lib/event-client';
import type { EventProgress } from '@/lib/event-client';

/**
 * The one place a guest adds anything to the wall — photo, written note, or
 * voice memo.
 *
 * A bottom sheet rather than a centred dialog: it opens next to the thumb, and
 * it does not fight the on-screen keyboard the way a vertically centred modal
 * does once the caption field is focused.
 */

type Mode = 'photo' | 'note' | 'voice';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-selected when the guest opened this from a scavenger task. */
  initialQuestTag?: string | null;
  onUploaded: (progress: EventProgress | null) => void;
  onNotePosted: () => void;
};

export function MediaUploadModal({
  open,
  onClose,
  initialQuestTag = null,
  onUploaded,
  onNotePosted,
}: Props) {
  const [mode, setMode] = useState<Mode>('photo');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [note, setNote] = useState('');
  const [questTag, setQuestTag] = useState<string | null>(initialQuestTag);
  const [stage, setStage] = useState<'idle' | 'compressing' | 'uploading'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Opening from a task pre-selects it and jumps straight to the camera.
  useEffect(() => {
    if (open && initialQuestTag) {
      setQuestTag(initialQuestTag);
      setMode('photo');
    }
  }, [open, initialQuestTag]);

  // Object URLs are a real leak on a phone that uploads forty photos in an
  // evening — each one pins the full-size image in memory until revoked.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const reset = useCallback(() => {
    setFile(null);
    setCaption('');
    setNote('');
    setQuestTag(null);
    setStage('idle');
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (stage !== 'idle') return; // never drop an in-flight upload
    reset();
    onClose();
  }, [stage, reset, onClose]);

  const handlePhotoSubmit = useCallback(async () => {
    if (!file) return;
    setError(null);
    try {
      const { progress } = await uploadEventPhoto({
        file,
        caption: caption.trim() || undefined,
        questTag,
        onProgress: setStage,
      });
      onUploaded(progress);
      reset();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'That did not go through. Try again.');
      setStage('idle');
    }
  }, [file, caption, questTag, onUploaded, reset, onClose]);

  const handleNoteSubmit = useCallback(async () => {
    const message = note.trim();
    if (!message) return;
    setStage('uploading');
    setError(null);
    try {
      await postNote(message);
      onNotePosted();
      reset();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setStage('idle');
    }
  }, [note, onNotePosted, reset, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="Add a memory"
            className="fixed inset-x-0 bottom-0 z-[100] max-h-[92dvh] overflow-y-auto rounded-t-3xl border-t border-[#d4af37]/30 bg-[#FAF9F6]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-[#FAF9F6]/95 px-5 py-3 backdrop-blur">
              <h2 className="font-headline text-xl italic text-[#1C1C1C]">Add a memory</h2>
              <button
                onClick={close}
                disabled={stage !== 'idle'}
                aria-label="Close"
                className="rounded-full p-1.5 text-black/40 transition hover:bg-black/5 disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pt-4">
              {/* Mode switch */}
              <div className="mb-4 flex gap-1 rounded-xl bg-black/[0.04] p-1">
                {(
                  [
                    { id: 'photo', icon: ImageIcon, label: 'Photo' },
                    { id: 'note', icon: Type, label: 'Note' },
                    { id: 'voice', icon: Mic, label: 'Voice' },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setMode(tab.id)}
                    disabled={stage !== 'idle'}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition',
                      mode === tab.id
                        ? 'bg-white text-[#a07820] shadow-sm'
                        : 'text-black/40 hover:text-black/60'
                    )}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {mode === 'photo' && (
                <PhotoPane
                  file={file}
                  previewUrl={previewUrl}
                  caption={caption}
                  questTag={questTag}
                  stage={stage}
                  onPickCamera={() => cameraInputRef.current?.click()}
                  onPickLibrary={() => fileInputRef.current?.click()}
                  onCaptionChange={setCaption}
                  onQuestChange={setQuestTag}
                  onClear={() => setFile(null)}
                  onSubmit={handlePhotoSubmit}
                />
              )}

              {mode === 'note' && (
                <div className="space-y-3 pb-5">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value.slice(0, 400))}
                    placeholder="A memory, a message, a terrible joke…"
                    rows={5}
                    className="w-full resize-none rounded-xl border border-[#d4af37]/25 bg-white/80 px-4 py-3 text-base leading-relaxed text-[#1C1C1C] outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-black/30">{note.length}/400</span>
                    <PrimaryButton
                      onClick={handleNoteSubmit}
                      disabled={!note.trim() || stage !== 'idle'}
                      busy={stage !== 'idle'}
                      label="Post it"
                      icon={Send}
                    />
                  </div>
                </div>
              )}

              {mode === 'voice' && (
                <VoicePane
                  onDone={() => {
                    onNotePosted();
                    reset();
                    onClose();
                  }}
                  onError={setError}
                />
              )}

              {error && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
            </div>

            {/* Two inputs, not one: `capture` opens the camera directly, which is
                what a guest wants mid-party, but it also removes the option to
                pick an earlier shot from the roll. */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={e => {
                const picked = e.target.files?.[0];
                if (picked) setFile(picked);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={e => {
                const picked = e.target.files?.[0];
                if (picked) setFile(picked);
                e.target.value = '';
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Photo pane ────────────────────────────────────────────────────────────

function PhotoPane({
  file,
  previewUrl,
  caption,
  questTag,
  stage,
  onPickCamera,
  onPickLibrary,
  onCaptionChange,
  onQuestChange,
  onClear,
  onSubmit,
}: {
  file: File | null;
  previewUrl: string | null;
  caption: string;
  questTag: string | null;
  stage: 'idle' | 'compressing' | 'uploading';
  onPickCamera: () => void;
  onPickLibrary: () => void;
  onCaptionChange: (value: string) => void;
  onQuestChange: (value: string | null) => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  const task = questTag ? findTask(questTag) : undefined;

  if (!file) {
    return (
      <div className="space-y-3 pb-5">
        <button
          onClick={onPickCamera}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d4af37]/40 bg-white/60 py-10 transition active:scale-[0.99]"
        >
          <Camera size={30} className="text-[#d4af37]" />
          <span className="text-sm font-medium text-[#1C1C1C]">Take a photo</span>
          <span className="text-xs text-black/35">Opens your camera</span>
        </button>
        <button
          onClick={onPickLibrary}
          className="w-full rounded-xl border border-black/8 bg-white py-3 text-sm font-medium text-black/55 transition active:scale-[0.99]"
        >
          Choose from my photos
        </button>
      </div>
    );
  }

  const busy = stage !== 'idle';

  return (
    <div className="space-y-3 pb-5">
      <div className="relative overflow-hidden rounded-2xl border border-black/5">
        {previewUrl && (
          // A plain <img>: this is a local object URL for a file that exists
          // only in this tab, so there is nothing for next/image to optimise
          // and routing it through the optimizer would just fail.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="The photo you are about to share" className="w-full" />
        )}
        {!busy && (
          <button
            onClick={onClear}
            aria-label="Choose a different photo"
            className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white backdrop-blur"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <input
        value={caption}
        onChange={e => onCaptionChange(e.target.value.slice(0, 140))}
        placeholder="Say something about it (optional)"
        className="w-full rounded-xl border border-[#d4af37]/25 bg-white/80 px-4 py-3 text-base text-[#1C1C1C] outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#d4af37]/20"
      />

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-black/35">
          Counts towards a quest?
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TagChip active={questTag === null} onClick={() => onQuestChange(null)} label="None" />
          {SCAVENGER_TASKS.map(t => (
            <TagChip
              key={t.tag}
              active={questTag === t.tag}
              onClick={() => onQuestChange(t.tag)}
              label={`${t.emoji} ${t.title}`}
            />
          ))}
        </div>
        {task && (
          <p className="mt-1.5 text-xs text-[#a07820]">
            +{task.points} points when this uploads.
          </p>
        )}
      </div>

      <PrimaryButton
        onClick={onSubmit}
        disabled={busy}
        busy={busy}
        full
        icon={Send}
        label={
          stage === 'compressing'
            ? 'Shrinking it for the wifi…'
            : stage === 'uploading'
              ? 'Sending…'
              : 'Share it'
        }
      />
    </div>
  );
}

function TagChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition',
        active
          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#a07820]'
          : 'border-black/8 bg-white text-black/45'
      )}
    >
      {label}
    </button>
  );
}

// ── Voice pane ────────────────────────────────────────────────────────────

const MAX_RECORDING_MS = 60_000;

function VoicePane({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach(track => track.stop());
    recorderRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Releasing the microphone matters: an un-stopped track leaves the recording
  // indicator lit on the guest's phone long after they close the sheet.
  useEffect(() => stopTracks, [stopTracks]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Codec support differs across the two browsers that matter here: iOS
      // Safari records mp4/aac, Android Chrome webm/opus. Passing an
      // unsupported mimeType throws, so let the browser pick its own.
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        stopTracks();
        setRecording(false);

        if (blob.size === 0) {
          onError('That recording came through empty. Try again.');
          return;
        }

        setSending(true);
        try {
          await uploadVoiceMemo(blob);
          onDone();
        } catch (err) {
          onError((err as Error).message);
        } finally {
          setSending(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1;
          // Hard stop: a forgotten recording would otherwise run until the tab
          // closed and then try to upload minutes of audio over venue wifi.
          if (next * 1000 >= MAX_RECORDING_MS) recorderRef.current?.stop();
          return next;
        });
      }, 1000);
    } catch {
      onError('We could not reach your microphone. Check the permission and try again.');
    }
  }, [onDone, onError, stopTracks]);

  const stop = useCallback(() => recorderRef.current?.stop(), []);

  return (
    <div className="flex flex-col items-center gap-4 py-8 pb-10">
      <motion.button
        onClick={recording ? stop : start}
        disabled={sending}
        whileTap={{ scale: 0.92 }}
        animate={recording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={recording ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        className="flex h-24 w-24 items-center justify-center rounded-full disabled:opacity-50"
        style={{
          background: recording
            ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
            : 'linear-gradient(135deg, #f6e7b7, #d4af37)',
          boxShadow: recording
            ? '0 8px 30px rgba(239,68,68,0.4)'
            : '0 8px 30px rgba(212,175,55,0.4)',
        }}
      >
        {sending ? (
          <Loader2 className="animate-spin text-black/60" size={30} />
        ) : recording ? (
          <Square className="text-white" size={28} fill="currentColor" />
        ) : (
          <Mic className="text-black/65" size={32} />
        )}
      </motion.button>

      <p className="font-mono text-2xl text-[#1C1C1C]">
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:
        {String(seconds % 60).padStart(2, '0')}
      </p>
      <p className="max-w-[16rem] text-center text-xs leading-relaxed text-black/40">
        {sending
          ? 'Sending your voice note…'
          : recording
            ? 'Tap the square when you are done. Up to a minute.'
            : 'Leave the couple a message they can play back tomorrow.'}
      </p>
    </div>
  );
}

// ── Shared button ─────────────────────────────────────────────────────────

function PrimaryButton({
  onClick,
  disabled,
  busy,
  label,
  icon: Icon,
  full,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  label: string;
  icon: typeof Send;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-black/80 transition active:scale-[0.98] disabled:opacity-45',
        full && 'w-full'
      )}
      style={{
        background: 'linear-gradient(135deg, #f6e7b7 0%, #d4af37 60%, #b8992d 100%)',
        boxShadow: '0 6px 20px rgba(212,175,55,0.35)',
      }}
    >
      {busy ? <Loader2 className="animate-spin" size={16} /> : <Icon size={16} />}
      {label}
    </button>
  );
}
