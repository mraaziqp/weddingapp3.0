
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { ArrowRight, Music2, Palette, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DEFAULT_EXPERIENCE_SETTINGS,
  readExperienceSettings,
  saveExperienceSettings,
  type EnvelopeMusic,
  type EnvelopeStyle,
  type IntroMusic,
  type ThemeSettings,
} from '@/lib/experience-settings';
import { useToast } from '@/hooks/use-toast';

const PRESETS = {
  'Midnight Emerald': { primaryColor: '#064e3b', accentColor: '#d4af37', foregroundColor: '#f6e7b7', headingFont: 'Playfair Display' },
  'Champagne Blush': { primaryColor: '#f7e9de', accentColor: '#c08497', foregroundColor: '#5f4b4b', headingFont: 'Great Vibes' },
  'Classic Ivory': { primaryColor: '#fefdfa', accentColor: '#3b3b3b', foregroundColor: '#2a2a2a', headingFont: 'Cinzel' },
  'Royal Sapphire': { primaryColor: '#0b2447', accentColor: '#a5d7e8', foregroundColor: '#f1f6f9', headingFont: 'Cinzel' },
} as const;

const ENVELOPE_STYLES: Array<{ value: EnvelopeStyle; label: string; description: string }> = [
  { value: 'royal-cinematic', label: 'Royal Cinematic', description: 'Dramatic dark glow and premium reveal.' },
  { value: 'soft-romance', label: 'Soft Romance', description: 'Warm blush tones and gentle mood.' },
  { value: 'modern-minimal', label: 'Modern Minimal', description: 'Clean modern frame with subtle luxe.' },
];

const ENVELOPE_MUSIC_OPTIONS: Array<{ value: EnvelopeMusic; label: string }> = [
  { value: 'golden-chimes', label: 'Golden Chimes' },
  { value: 'velvet-pulse', label: 'Velvet Pulse' },
  { value: 'silent', label: 'Silent' },
];

const INTRO_MUSIC_OPTIONS: Array<{ value: IntroMusic; label: string }> = [
  { value: 'spark-rise', label: 'Spark Rise' },
  { value: 'ceremony-bloom', label: 'Ceremony Bloom' },
  { value: 'silent', label: 'Silent' },
];

const START_HERE_LINKS = [
  { href: '/planner', title: 'Open Planner Suite', subtitle: 'See all planning modules' },
  { href: '/seating', title: 'Seat Guests', subtitle: 'Drag-drop and run Magic Seat' },
  { href: '/planner/culinary', title: 'Plan Menu', subtitle: 'Shape dishes and kitchen manifest' },
  { href: '/planner/timeline', title: 'Draft Timeline', subtitle: 'Publish guest-facing run sheet' },
];

const FONT_OPTIONS = ['Playfair Display', 'Cinzel', 'Great Vibes'];

function stylePreviewBackground(style: EnvelopeStyle, primaryColor: string) {
  if (style === 'soft-romance') {
    return `radial-gradient(circle at 50% 30%, #ffe8ef 0%, ${primaryColor} 55%, #2b1f29 100%)`;
  }
  if (style === 'modern-minimal') {
    return `linear-gradient(145deg, #0f1115 0%, ${primaryColor} 48%, #030407 100%)`;
  }
  return `radial-gradient(ellipse at 50% 45%, ${primaryColor} 0%, #041d16 45%, #000 100%)`;
};

export default function ThemeStudioPage() {
  const { toast } = useToast();
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_EXPERIENCE_SETTINGS.theme);
  const [envelopeStyle, setEnvelopeStyle] = useState<EnvelopeStyle>(DEFAULT_EXPERIENCE_SETTINGS.envelopeStyle);
  const [envelopeMusic, setEnvelopeMusic] = useState<EnvelopeMusic>(DEFAULT_EXPERIENCE_SETTINGS.envelopeMusic);
  const [introMusic, setIntroMusic] = useState<IntroMusic>(DEFAULT_EXPERIENCE_SETTINGS.introMusic);

  useEffect(() => {
    const saved = readExperienceSettings();
    setTheme(saved.theme);
    setEnvelopeStyle(saved.envelopeStyle);
    setEnvelopeMusic(saved.envelopeMusic);
    setIntroMusic(saved.introMusic);
  }, []);

  const themeStyle = useMemo(() => ({
    '--aurora-emerald': theme.primaryColor,
    '--aurora-gold': theme.accentColor,
    '--aurora-soft-gold': theme.foregroundColor,
    '--wedu-heading-font': `'${theme.headingFont}', serif`,
  } as CSSProperties), [theme]);

  const selectedStyle = ENVELOPE_STYLES.find(s => s.value === envelopeStyle) || ENVELOPE_STYLES[0];

  const handlePresetChange = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    setTheme({
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      foregroundColor: preset.foregroundColor,
      headingFont: preset.headingFont,
    });
  };

  const handleSave = () => {
    saveExperienceSettings({
      theme,
      envelopeStyle,
      envelopeMusic,
      introMusic,
    });

    toast({
      title: 'Experience saved',
      description: 'Your look, envelope style, and music preferences are now live.',
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">Bride Control Dashboard</h1>
        <p className="text-muted-foreground tracking-wide">Adjust the entire experience in minutes: style, music, and planning launch points.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette size={18} /> Look & Feel</CardTitle>
            <CardDescription>Set color palette, typography, and brand mood.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Color Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PRESETS).map(name => (
                  <Button key={name} variant="outline" size="sm" onClick={() => handlePresetChange(name as keyof typeof PRESETS)}>
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-color">Primary Color</Label>
              <Input
                id="primary-color"
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">Accent Color</Label>
              <Input
                id="accent-color"
                type="color"
                value={theme.accentColor}
                onChange={(e) => setTheme(prev => ({ ...prev, accentColor: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text-color">Text / Foreground Color</Label>
              <Input
                id="text-color"
                type="color"
                value={theme.foregroundColor}
                onChange={(e) => setTheme(prev => ({ ...prev, foregroundColor: e.target.value }))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heading-font">Heading Font</Label>
              <Select value={theme.headingFont} onValueChange={(value) => setTheme(prev => ({ ...prev, headingFont: value }))}>
                <SelectTrigger id="heading-font">
                  <SelectValue placeholder="Select a font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map(font => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Music2 size={18} /> Envelope & Intro Sound</CardTitle>
            <CardDescription>Simple switches for how guests feel the moment they arrive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Envelope Style</Label>
              <Select value={envelopeStyle} onValueChange={(value) => setEnvelopeStyle(value as EnvelopeStyle)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose envelope style" />
                </SelectTrigger>
                <SelectContent>
                  {ENVELOPE_STYLES.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-white/45">{selectedStyle.description}</p>
            </div>

            <div className="space-y-2">
              <Label>Envelope Music</Label>
              <Select value={envelopeMusic} onValueChange={(value) => setEnvelopeMusic(value as EnvelopeMusic)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose envelope music" />
                </SelectTrigger>
                <SelectContent>
                  {ENVELOPE_MUSIC_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Event Intro Music</Label>
              <Select value={introMusic} onValueChange={(value) => setIntroMusic(value as IntroMusic)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose intro music" />
                </SelectTrigger>
                <SelectContent>
                  {INTRO_MUSIC_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium shadow-lg shadow-[#d4af37]/30 glossy-sweep" onClick={handleSave}>
              Save Experience
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-1 flex items-start justify-center">
          <div className="w-full max-w-sm space-y-4">
            <Card className="bg-black/50 rounded-[40px] p-4 border-4 border-zinc-700 shadow-2xl shadow-black">
              <motion.div
                className="bg-zinc-900 rounded-[30px] overflow-hidden"
                style={themeStyle}
                animate={{
                  '--aurora-emerald': theme.primaryColor as string,
                  '--aurora-gold': theme.accentColor as string,
                  '--aurora-soft-gold': theme.foregroundColor as string,
                  '--wedu-heading-font': `'${theme.headingFont}', serif` as string,
                } as Record<string, string>}
              >
                <div className="h-[530px] w-full relative" style={{ background: stylePreviewBackground(envelopeStyle, theme.primaryColor) }}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_45%)]" />
                  <div className="relative z-10 flex flex-col h-full p-6 text-center justify-center items-center">
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="w-28 h-28 rounded-full mb-6 flex items-center justify-center"
                      style={{ background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}66` }}
                    >
                      <Wand2 size={26} style={{ color: theme.accentColor }} />
                    </motion.div>

                    <h1 style={{ color: theme.foregroundColor }} className="font-headline text-4xl italic mb-3">The Union of R & A</h1>
                    <p style={{ color: theme.foregroundColor }} className="text-sm opacity-80 mb-6">{selectedStyle.label}</p>

                    <div className="w-full space-y-3 text-left">
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80">
                        <span className="text-white/40">Envelope:</span> {ENVELOPE_MUSIC_OPTIONS.find(x => x.value === envelopeMusic)?.label}
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80">
                        <span className="text-white/40">Event Intro:</span> {INTRO_MUSIC_OPTIONS.find(x => x.value === introMusic)?.label}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><Sparkles size={16} /> Start Planning Fast</CardTitle>
                <CardDescription>One-tap routes for your wife to begin plotting today.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {START_HERE_LINKS.map(link => (
                  <Link key={link.href} href={link.href} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-sm text-white/85 font-medium">{link.title}</p>
                      <p className="text-xs text-white/40">{link.subtitle}</p>
                    </div>
                    <ArrowRight size={14} className="text-white/35" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
