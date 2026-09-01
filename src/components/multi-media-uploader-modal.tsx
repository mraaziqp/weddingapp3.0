'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Film, Sparkles, Lock, Globe, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { uploadOne } from '@/lib/bulk-upload';
import { cn } from '@/lib/utils';
import type { WallItem } from '@/lib/media';

interface MultiMediaUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (items: WallItem[]) => void;
  defaultQuestTag?: string | null;
  /**
   * The guest's invite code. Large files go straight to Drive through a
   * resumable session, and the server only mints one for a code it can
   * resolve to a real household — which is also what credits the photo by
   * name. Without it only small files can go through the app's own route.
   */
  guestId?: string;
}

interface QueuedFile {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
  sizeFormatted: string;
}

const POPULAR_QUESTS = [
  '💃 Best Dance Move',
  '🍰 Cake Moment',
  '🥂 Table Cheers',
  '💍 Bride & Groom Love',
  '✨ Best Dressed Guest',
  '🎉 Candid Laugh',
];

export function MultiMediaUploaderModal({
  isOpen,
  onClose,
  onUploadSuccess,
  defaultQuestTag = null,
  guestId,
}: MultiMediaUploaderModalProps) {
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedQuest, setSelectedQuest] = useState<string | null>(defaultQuestTag);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wedding_guest_name');
      if (saved) setAuthorName(saved);
    }
  }, []);

  const handleNameChange = (name: string) => {
    setAuthorName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wedding_guest_name', name);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const newQueue: QueuedFile[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/') || f.type.startsWith('video/')) {
        const isVideo = f.type.startsWith('video/');
        const previewUrl = URL.createObjectURL(f);
        newQueue.push({
          id: `${f.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file: f,
          previewUrl,
          isVideo,
          sizeFormatted: formatFileSize(f.size),
        });
      }
    }
    setQueuedFiles(prev => [...prev, ...newQueue]);
  }, []);

  const removeQueuedFile = (id: string) => {
    setQueuedFiles(prev => {
      const target = prev.find(f => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(f => f.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUploadSubmit = async () => {
    if (queuedFiles.length === 0) return;

    let finalName = authorName.trim();
    if (!finalName) {
      finalName = prompt('Please enter your name or family tag (e.g. Tariq Table 3):') || 'Wedding Guest';
      handleNameChange(finalName);
    }

    setIsUploading(true);
    setUploadPercent(15);
    setUploadStatus(`Preparing ${queuedFiles.length} item${queuedFiles.length > 1 ? 's' : ''}...`);

    try {
      // Files go to Drive one at a time through a resumable session, not as
      // one multipart POST to our own API. The host rejects a request body
      // over ~4.5MB before the handler ever runs and answers in plain text,
      // so batching a night's photos — let alone a video — into a single
      // request produced a 413 the client could not even parse.
      //
      // uploadOne compresses photos, opens the session and falls back to the
      // app route only for files small enough to fit through it.
      let completed = 0;
      const failures: string[] = [];

      for (const item of queuedFiles) {
        setUploadStatus(
          `Uploading ${completed + 1} of ${queuedFiles.length}${item.isVideo ? ' (video)' : ''}...`
        );

        try {
          await uploadOne(
            {
              id: item.id ?? `modal-${completed}`,
              file: item.file,
              name: item.file.name,
              sizeBytes: item.file.size,
              isVideo: item.isVideo,
              status: 'queued',
              progress: 0,
            },
            { visibility, guestId, questTag: selectedQuest || null },
            filePercent => {
              // Weight each file's own progress into the overall bar so a
              // large video doesn't leave it frozen.
              const overall = ((completed + filePercent / 100) / queuedFiles.length) * 100;
              setUploadPercent(Math.min(99, Math.round(overall)));
            }
          );
          completed++;
        } catch (err) {
          failures.push(item.file.name);
          console.error('[uploader] failed:', item.file.name, err);
        }
      }

      if (completed === 0) {
        throw new Error(
          failures.length ? 'None of those uploaded. Check your signal and try again.' : 'Upload failed'
        );
      }

      setUploadPercent(100);
      setUploadStatus('Complete!');

      toast({
        title: `🎉 ${completed} Memory Added!`,
        description: failures.length
          ? `${failures.length} didn't upload — try those again.`
          : visibility === 'public'
            ? 'Live on the Memories Wall.'
            : 'Saved secretly to Couple’s Vault.',
      });

      import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.65 },
          colors: ['#d4af37', '#ffffff', '#fb923c', '#a78bfa'],
        });
      });

      onUploadSuccess?.([]);

      // Cleanup preview URLs
      queuedFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
      setQueuedFiles([]);
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: 'Unable to upload files. Please try again.',
      });
    } finally {
      setIsUploading(false);
      setUploadPercent(0);
      setUploadStatus('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-[#121513] border border-amber-500/30 text-white shadow-2xl overflow-hidden"
          >
            {/* Hidden multi-file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => {
                if (e.target.files) addFilesToQueue(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="font-headline italic text-xl sm:text-2xl font-bold text-[#f6e7b7]">
                    Upload Photos &amp; Videos
                  </h3>
                  <p className="text-xs text-white/60">Share your moments live on the celebration wall</p>
                </div>
              </div>

              <button
                onClick={onClose}
                disabled={isUploading}
                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Drag & Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5',
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                    : 'border-white/20 bg-white/[0.03] hover:border-amber-400/60 hover:bg-white/[0.06]'
                )}
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shadow-inner">
                  📸
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Tap to browse or drop multiple photos &amp; videos here
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">
                    Supports JPG, PNG, HEIC, MP4, MOV (Multiple files at once)
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-xs pointer-events-none mt-1"
                >
                  <Plus size={14} className="mr-1" /> Select Files
                </Button>
              </div>

              {/* Queued File Preview Grid */}
              {queuedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/70">
                    <span className="font-bold uppercase tracking-wider text-amber-300">
                      Selected Files ({queuedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setQueuedFiles([])}
                      className="text-[11px] text-red-400 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1 bg-black/30 rounded-2xl border border-white/10">
                    {queuedFiles.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-xl overflow-hidden aspect-square bg-white/5 border border-white/10 group shadow-md"
                      >
                        {item.isVideo ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-amber-400">
                            <Film size={24} className="mb-1" />
                            <span className="text-[9px] text-white/60">Video</span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* File size badge */}
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] text-white/80">
                          {item.sizeFormatted}
                        </div>

                        {/* Remove file button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQueuedFile(item.id);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Name & Table Tag */}
              <div className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} /> Your Name / Family Tag
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Aunt Fatima & Uncle Zaid / Table 4"
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Optional Photo Quest Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                  Tag a Quest Challenge (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_QUESTS.map((quest) => (
                    <button
                      key={quest}
                      type="button"
                      onClick={() => setSelectedQuest(selectedQuest === quest ? null : quest)}
                      className={cn(
                        'px-3 py-1 rounded-full text-[11px] font-medium transition-all border',
                        selectedQuest === quest
                          ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-md'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      )}
                    >
                      {quest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visibility Switcher */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold',
                    visibility === 'public'
                      ? 'bg-gradient-to-r from-amber-400/20 to-amber-500/20 border-amber-400 text-[#f6e7b7] shadow-md'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  )}
                >
                  <Globe size={15} className="text-amber-400" />
                  <span>🌍 Public Live Wall</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-bold',
                    visibility === 'private'
                      ? 'bg-gradient-to-r from-purple-400/20 to-purple-500/20 border-purple-400 text-purple-200 shadow-md'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  )}
                >
                  <Lock size={15} className="text-purple-400" />
                  <span>🔒 Couple’s Vault</span>
                </button>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs text-amber-300 font-mono">
                    <span>{uploadStatus}</span>
                    <span>{uploadPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-200"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 sm:p-6 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isUploading}
                className="rounded-full text-white/70 hover:text-white text-xs"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleUploadSubmit}
                disabled={isUploading || queuedFiles.length === 0}
                className="rounded-full bg-gradient-to-r from-[#f6e7b7] via-[#d4af37] to-[#c8a030] text-black font-extrabold px-7 text-xs shadow-lg hover:scale-105 transition-all disabled:opacity-50 h-11"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Upload size={15} /> Upload {queuedFiles.length > 0 ? `(${queuedFiles.length})` : ''}
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
