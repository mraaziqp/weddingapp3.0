'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image as ImageIcon, Eye, Save, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationConfig {
  title: string;
  subtitle: string;
  dateTime: string;
  location: string;
  dressCode: string;
  rsvpDeadline: string;
  extraInfo: string;
  imageUrl?: string;
}

export function InvitationEditor() {
  const [config, setConfig] = useState<InvitationConfig>({
    title: 'Together in Love',
    subtitle: 'Abduraziq & Razia',
    dateTime: 'Saturday, 6th September 2026 at 6:00 PM',
    location: 'Tuscany in Rylands, Cape Town',
    dressCode: 'Formal Attire',
    rsvpDeadline: 'August 20, 2026',
    extraInfo: 'Reception to follow. Transportation available. Hotel accommodations arranged.',
  });

  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setConfig({ ...config, imageUrl: data.url });
        toast({ title: 'Image uploaded!', description: 'Your invitation image is ready.' });
      }
    } catch (err) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
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
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors cursor-pointer">
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
                      <p className="text-sm text-white/60">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto text-white/40" size={32} />
                      <p className="text-sm text-white/60">Click to upload or drag and drop</p>
                      <p className="text-xs text-white/40">PNG, JPG up to 10MB</p>
                    </>
                  )}
                </label>
              </div>
              {config.imageUrl && (
                <Badge className="bg-emerald-500/20 text-emerald-400">✓ Image ready</Badge>
              )}
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
              {config.imageUrl ? (
                <motion.img
                  src={config.imageUrl}
                  alt="Invitation preview"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : (
                <div className="w-full h-64 bg-white/5 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center mb-4">
                  <p className="text-white/40 text-center">Upload an image to see preview</p>
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
