'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [preview, setPreview] = useState(false);
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
      await handleImageUpload({ target: input } as any);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/invitation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast({ title: 'Saved!', description: 'Invitation config updated' });
      }
    } catch (err) {
      toast({ title: 'Save failed', variant: 'destructive' });
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
            {/* Image Upload */}
            <div className="space-y-3">
              <Label>Invitation Background Image</Label>
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
              <Label>Background Music (optional)</Label>
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
              <Label>Welcome Video (optional)</Label>
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

            {/* Text Fields */}
            <div className="space-y-3">
              <Label>Title</Label>
              <Input
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="e.g., Together in Love"
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Subtitle (Names)</Label>
              <Input
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                placeholder="e.g., Abduraziq & Razia"
                className="border-white/20"
              />
            </div>

            <div className="space-y-3">
              <Label>Date & Time</Label>
              <Input
                value={config.dateTime}
                onChange={(e) => setConfig({ ...config, dateTime: e.target.value })}
                className="border-white/20"
              />
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

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setPreview(!preview)}
                variant="outline"
                className="flex-1"
              >
                <Eye size={16} className="mr-2" />
                {preview ? 'Edit' : 'Preview'}
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save size={16} className="mr-2" />
                Save Config
              </Button>
            </div>
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
              <CardDescription>How guests will see it</CardDescription>
            </CardHeader>
            <CardContent>
              {config.videoUrl ? (
                <video src={config.videoUrl} controls className="w-full h-64 object-cover rounded-lg mb-4 bg-black" />
              ) : config.imageUrl ? (
                <motion.img
                  src={config.imageUrl}
                  alt="Invitation preview"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : (
                <div className="w-full h-64 bg-white/5 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-white/40 text-center">Upload an image or video to see preview</p>
                </div>
              )}

              {config.musicUrl && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <Music size={14} className="text-amber-400" />
                  <p className="text-xs text-white/60">Background music will play softly when guests open this invitation</p>
                </div>
              )}

              <div className="space-y-4 text-white">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h1 className="text-4xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-300 to-amber-500">
                    {config.title}
                  </h1>
                  <p className="text-2xl text-white/80 mt-2">{config.subtitle}</p>
                </motion.div>

                <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                  <p>📅 <span className="text-white/70">{config.dateTime}</span></p>
                  <p>📍 <span className="text-white/70">{config.location}</span></p>
                  <p>👔 <span className="text-white/70">{config.dressCode}</span></p>
                  <p>🔔 <span className="text-white/70">RSVP by {config.rsvpDeadline}</span></p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/50 leading-relaxed">{config.extraInfo}</p>
                </div>

                <Button className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white mt-6">
                  Accept / Decline RSVP
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
