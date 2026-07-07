'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image as ImageIcon, Eye, Save, Loader, Music, Video, X, Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImageFile, withTimeout } from '@/lib/image-utils';
import { supabase } from '@/lib/supabase';
import { InvitationConfig, DEFAULT_INVITATION_CONFIG } from '@/lib/invitation-config';
import { InvitationCard, GiftingCard } from '@/components/invitation-card';

const BUCKET = 'wedding-assets';

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const { data, error } = await withTimeout(
    supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }),
    30000
  );
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicUrl;
}

export function InvitationEditor() {
  const [config, setConfig] = useState<InvitationConfig>(DEFAULT_INVITATION_CONFIG);

  // Load the live config so Save never silently overwrites saved media with defaults.
  useEffect(() => {
    fetch('/api/invitation/config')
      .then(r => (r.ok ? r.json() : null))
      .then(saved => {
        if (saved && saved.title) setConfig(current => ({ ...current, ...saved }));
      })
      .catch(() => {});
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const toggleMusicPreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (isMusicPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsMusicPlaying(!isMusicPlaying);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const compressed = await compressImageFile(file, { maxDimension: 1600, quality: 0.85 });
      const publicUrl = await uploadToStorage(compressed, 'invitation-photos');
      setConfig(current => ({ ...current, imageUrl: publicUrl }));
      toast({ title: 'Image uploaded!', description: 'Your invitation image is ready.' });
    } catch (_err) {
      toast({ title: 'Upload failed', description: 'Please check your connection and try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: 'Invalid file', description: 'Please upload an audio file (MP3, WAV, etc.)', variant: 'destructive' });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 20MB', variant: 'destructive' });
      return;
    }

    setUploadingMusic(true);
    try {
      const publicUrl = await uploadToStorage(file, 'invitation-music');
      setConfig(current => ({ ...current, musicUrl: publicUrl }));
      toast({ title: 'Music uploaded!', description: 'Your invitation soundtrack is ready.' });
    } catch (_err) {
      toast({ title: 'Upload failed', description: 'Please check your connection and try again.', variant: 'destructive' });
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({ title: 'Invalid file', description: 'Please upload a video file (MP4, MOV, etc.)', variant: 'destructive' });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 100MB', variant: 'destructive' });
      return;
    }

    setUploadingVideo(true);
    try {
      const publicUrl = await uploadToStorage(file, 'invitation-videos');
      setConfig(current => ({ ...current, videoUrl: publicUrl }));
      toast({ title: 'Video uploaded!', description: 'Your invitation video is ready.' });
    } catch (_err) {
      toast({ title: 'Upload failed', description: 'Please check your connection and try again.', variant: 'destructive' });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = document.getElementById('image-upload') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      await handleImageUpload({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/invitation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast({ title: 'Saved! 🎉', description: 'Guests now see this version of the invitation.' });
      } else {
        toast({ title: 'Save failed', description: 'The server rejected the update. Please try again.', variant: 'destructive' });
      }
    } catch (_err) {
      toast({ title: 'Save failed', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Editor Panel */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="text-amber-400" size={20} />
              Edit Invitation
            </CardTitle>
            <CardDescription>Customize your beautiful invitation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Section: Media ── */}
            <div className="flex items-center gap-3 pt-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4af37]/80 whitespace-nowrap">✨ Set the mood</p>
              <div className="luxe-divider flex-1 opacity-50" />
            </div>
            <p className="-mt-3 text-xs text-white/40">
              Upload from your phone or paste a link. The photo/video plays full-screen behind the
              invitation card; the music plays softly while guests read it.
            </p>

            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Backdrop Photo (hero_image_url)</Label>
              <div
                className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer bg-white/5"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer space-y-2">
                  {uploading ? (
                    <>
                      <Loader className="mx-auto animate-spin text-amber-400" size={32} />
                      <p className="text-sm text-white/60">Processing image...</p>
                    </>
                  ) : config.imageUrl ? (
                    <>
                      <ImageIcon className="mx-auto text-emerald-400" size={32} />
                      <p className="text-sm text-emerald-400 font-semibold">Image uploaded ✓</p>
                      <p className="text-xs text-white/40">Click to change</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto text-white/40" size={32} />
                      <p className="text-sm text-white/60">Click to upload or drag & drop</p>
                      <p className="text-xs text-white/40">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
              {config.imageUrl && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Badge className="bg-emerald-500/20 text-emerald-400">✓ Ready for guests</Badge>
                </motion.div>
              )}
              <Input
                value={config.imageUrl ?? ''}
                onChange={(e) => setConfig(c => ({ ...c, imageUrl: e.target.value.trim() || undefined }))}
                placeholder="…or paste a hero image URL (hero_image_url)"
                className="border-white/15 bg-white/5 text-xs placeholder:text-white/25"
              />
            </div>

            {/* Music Upload */}
            <div className="space-y-3">
              <Label>Background Music (background_music_url)</Label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors bg-white/5">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleMusicUpload}
                  disabled={uploadingMusic}
                  className="hidden"
                  id="music-upload"
                />
                {config.musicUrl ? (
                  <div className="space-y-3">
                    <audio ref={previewAudioRef} src={config.musicUrl} onEnded={() => setIsMusicPlaying(false)} className="hidden" />
                    <div className="flex items-center justify-center gap-3">
                      <Button type="button" size="icon" variant="outline" onClick={toggleMusicPreview}>
                        {isMusicPlaying ? <Pause size={16} /> : <Play size={16} />}
                      </Button>
                      <p className="text-sm text-emerald-400 font-semibold">Music uploaded ✓</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => { setConfig(c => ({ ...c, musicUrl: undefined })); setIsMusicPlaying(false); }}
                      >
                        <X size={14} className="text-red-400" />
                      </Button>
                    </div>
                    <label htmlFor="music-upload" className="cursor-pointer text-xs text-white/40 hover:text-white/60">
                      Click to replace
                    </label>
                  </div>
                ) : (
                  <label htmlFor="music-upload" className="cursor-pointer space-y-2 block">
                    {uploadingMusic ? (
                      <>
                        <Loader className="mx-auto animate-spin text-amber-400" size={28} />
                        <p className="text-sm text-white/60">Uploading music...</p>
                      </>
                    ) : (
                      <>
                        <Music className="mx-auto text-white/40" size={28} />
                        <p className="text-sm text-white/60">Click to upload background music</p>
                        <p className="text-xs text-white/40">MP3, WAV up to 20MB</p>
                      </>
                    )}
                  </label>
                )}
              </div>
              <Input
                value={config.musicUrl ?? ''}
                onChange={(e) => { setConfig(c => ({ ...c, musicUrl: e.target.value.trim() || undefined })); setIsMusicPlaying(false); }}
                placeholder="…or paste a music URL (background_music_url)"
                className="border-white/15 bg-white/5 text-xs placeholder:text-white/25"
              />
            </div>

            {/* Video Upload */}
            <div className="space-y-3">
              <Label>Backdrop Video (hero_video_url) — plays instead of the photo</Label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors bg-white/5">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  disabled={uploadingVideo}
                  className="hidden"
                  id="video-upload"
                />
                {config.videoUrl ? (
                  <div className="space-y-2">
                    <video src={config.videoUrl} controls className="w-full max-h-40 rounded-lg mx-auto" />
                    <div className="flex items-center justify-center gap-3">
                      <p className="text-sm text-emerald-400 font-semibold">Video uploaded ✓</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfig(c => ({ ...c, videoUrl: undefined }))}
                      >
                        <X size={14} className="text-red-400" />
                      </Button>
                    </div>
                    <label htmlFor="video-upload" className="cursor-pointer text-xs text-white/40 hover:text-white/60">
                      Click to replace
                    </label>
                  </div>
                ) : (
                  <label htmlFor="video-upload" className="cursor-pointer space-y-2 block">
                    {uploadingVideo ? (
                      <>
                        <Loader className="mx-auto animate-spin text-amber-400" size={28} />
                        <p className="text-sm text-white/60">Uploading video...</p>
                      </>
                    ) : (
                      <>
                        <Video className="mx-auto text-white/40" size={28} />
                        <p className="text-sm text-white/60">Click to upload a welcome video</p>
                        <p className="text-xs text-white/40">MP4, MOV up to 100MB</p>
                      </>
                    )}
                  </label>
                )}
              </div>
              <Input
                value={config.videoUrl ?? ''}
                onChange={(e) => setConfig(c => ({ ...c, videoUrl: e.target.value.trim() || undefined }))}
                placeholder="…or paste a video URL (hero_video_url)"
                className="border-white/15 bg-white/5 text-xs placeholder:text-white/25"
              />
            </div>

            {/* ── Section: Wording ── */}
            <div className="flex items-center gap-3 pt-2">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#d4af37]/80 whitespace-nowrap">✍️ Wording</p>
              <div className="luxe-divider flex-1 opacity-50" />
            </div>

            {/* Text Fields */}
            <div className="space-y-3">
              <Label>Script line above the names</Label>
              <Input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="e.g., Together in Love"
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Your names — keep the &amp; between them</Label>
              <Input
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="e.g., Abduraziq & Razia"
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Date & Time (Display Text)</Label>
              <Input
                value={config.dateTime}
                onChange={(e) => setConfig({ ...config, dateTime: e.target.value })}
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Countdown Target Date & Time (SAST)</Label>
              <Input
                type="datetime-local"
                value={config.weddingDate ? config.weddingDate.substring(0, 16) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setConfig(c => ({ ...c, weddingDate: val ? `${val}:00+02:00` : undefined }));
                }}
                className="border-white/20 bg-white/5 text-white"
              />
              <p className="text-[10px] text-white/40 -mt-1">
                Select the exact date and time for the countdown clock. Timezone is SAST (GMT+2).
              </p>
            </div>

            <div className="space-y-3">
              <Label>Location</Label>
              <Input
                value={config.location}
                onChange={(e) => setConfig({ ...config, location: e.target.value })}
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Dress Code</Label>
              <Input
                value={config.dressCode}
                onChange={(e) => setConfig({ ...config, dressCode: e.target.value })}
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>RSVP Deadline</Label>
              <Input
                value={config.rsvpDeadline}
                onChange={(e) => setConfig({ ...config, rsvpDeadline: e.target.value })}
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Extra Information</Label>
              <Textarea
                value={config.extraInfo}
                onChange={(e) => setConfig({ ...config, extraInfo: e.target.value })}
                placeholder="Reception details, transportation, accommodations, etc."
                className="border-white/20 min-h-24"
              />
            </div>

            <div className="space-y-3">
              <Label>Gifting card poem — shown on a cream enclosure card</Label>
              <Textarea
                value={config.giftingPoem ?? ''}
                onChange={(e) => setConfig({ ...config, giftingPoem: e.target.value })}
                placeholder="Leave empty to hide the gifting card"
                className="border-white/20 min-h-28"
              />
              <p className="text-[11px] text-white/35">
                Each line of the poem stays on its own line, exactly as typed. Clear the box to
                remove the card from the invitation.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button asChild variant="outline" className="flex-1">
                <a href="/invitation" target="_blank" rel="noopener noreferrer">
                  <Eye size={16} className="mr-2" />
                  Open Live Page
                </a>
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-[#e9cf8a] via-[#d4af37] to-[#b98a2e] font-semibold text-black hover:shadow-[0_6px_24px_rgba(212,175,55,0.35)]"
              >
                {isSaving ? <Loader size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                {isSaving ? 'Publishing…' : 'Save & Publish'}
              </Button>
            </div>
            <p className="text-center text-[11px] text-white/35">
              Nothing changes for guests until you press Save &amp; Publish.
            </p>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card className="glass-card h-full">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>The exact card guests see — it updates as you type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* The real invitation card, rendered over the chosen backdrop */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-7">
                <div className="absolute inset-0 -z-0">
                  {config.videoUrl ? (
                    <video src={config.videoUrl} autoPlay loop muted playsInline className="h-full w-full object-cover" />
                  ) : config.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={config.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-[linear-gradient(150deg,var(--aurora-midnight)_0%,var(--aurora-emerald-deep)_45%,#03040a_100%)]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/30 to-black/70" />
                </div>
                <div className="relative">
                  <InvitationCard config={config} widthClass="w-full max-w-[380px]" />
                </div>
              </div>

              {config.musicUrl && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <Music size={14} className="text-amber-400" />
                  <p className="text-xs text-white/60">Background music will play softly when guests open this invitation</p>
                </div>
              )}

              {config.extraInfo && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70 mb-1">Good to know (shown under the card)</p>
                  <p className="text-xs text-white/50 leading-relaxed">{config.extraInfo}</p>
                </div>
              )}

              {config.giftingPoem?.trim() && (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#d4af37]/70">Gifting card (shown under the invitation)</p>
                  <GiftingCard poem={config.giftingPoem} widthClass="w-full max-w-[380px]" />
                </div>
              )}

              <p className="text-center text-[11px] text-white/35">
                🖨️ Printing tip: open the live page and press Ctrl+P — only the card prints, at exactly 5×7 inches.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
