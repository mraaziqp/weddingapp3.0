'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CalendarHeart, Sparkles, Trophy, Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { InvitationCard } from "@/components/invitation-card";
import { downloadElementAsImage } from "@/lib/download-card";
import { InvitationConfig } from "@/lib/invitation-config";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

export default function DashboardPage() {
  const [redirectToStd, setRedirectToStd] = useState(true);
  const [weddingDayMode, setWeddingDayMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [_showGuestView, _setShowGuestView] = useState(false);
  const [invitationConfig, setInvitationConfig] = useState<InvitationConfig | null>(null);
  const [downloadingNikkahCard, setDownloadingNikkahCard] = useState(false);
  const { toast } = useToast();

  const weddingDate = new Date('2026-09-06');
  const daysUntilWedding = Math.ceil((weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const downloadNikkahOnlyCard = async () => {
    if (downloadingNikkahCard) return;
    setDownloadingNikkahCard(true);
    try {
      await downloadElementAsImage('nikkah-only-print-card', 'nikkah-invitation.png');
      toast({
        title: '✓ Download Complete',
        description: 'General Nikaah invitation has been downloaded successfully.',
      });
    } catch (err) {
      console.error('[Dashboard] Download Nikkah card failed:', err);
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: 'Unable to capture invitation card as image. Please try again.',
      });
    } finally {
      setDownloadingNikkahCard(false);
    }
  };

  const handleThemeToggle = async (newTheme: 'classic-botanical' | 'navy-royal') => {
    if (!invitationConfig) return;
    setIsUpdating(true);
    const updatedConfig = { ...invitationConfig, theme: newTheme };
    try {
      const res = await fetch('/api/invitation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      const data = await res.json();
      if (data.ok) {
        setInvitationConfig(updatedConfig);
        toast({
          title: '✓ Theme Saved',
          description: `Active invitation theme is now ${newTheme === 'navy-royal' ? 'Navy Royal' : 'Classic Botanical'}.`,
        });
      } else {
        toast({ title: 'Failed to update theme', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    } finally {
      setIsUpdating(false);
    }
  };

  // Load config
  useEffect(() => {
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(data => setInvitationConfig(data))
      .catch(() => {});
  }, []);

  // Load config std
  useEffect(() => {
    fetch('/api/std/config')
      .then(r => r.json())
      .then((data) => {
        if (data.config) {
          setRedirectToStd(data.config.redirectToStd !== false);
          setWeddingDayMode(data.config.weddingDayMode === true);
        }
      })
      .catch(() => {});
  }, []);

  // Generic switch handler
  const handleSwitchChange = async (key: string, checked: boolean) => {
    setIsUpdating(true);
    try {
      const getRes = await fetch('/api/std/config');
      const getData = await getRes.json();
      const existingConfig = getData.config || {};
      const newConfig = { ...existingConfig, [key]: checked };

      const res = await fetch('/api/std/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig, designState: getData.designState }),
      });

      const data = await res.json();
      if (data.ok) {
        // Update local state based on key
        if (key === 'redirectToStd') setRedirectToStd(checked);
        if (key === 'weddingDayMode') setWeddingDayMode(checked);

        const messages: Record<string, string> = {
          redirectToStd: checked ? 'Save the Date mode ACTIVE ✨' : 'RSVP mode ACTIVE 📧',
          weddingDayMode: checked ? '🎉 WEDDING DAY MODE ACTIVATED! 🎉' : 'Back to planning mode',
        };

        toast({
          title: '✓ Settings Updated',
          description: messages[key] || 'Configuration updated',
        });
      } else {
        toast({ title: 'Failed to update', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: String(err) });
    } finally {
      setIsUpdating(false);
    }
  };

  const getActiveMode = () => {
    if (weddingDayMode) return { label: '🎊 WEDDING DAY MODE', color: 'text-red-400', bgColor: 'bg-red-500/10' };
    return { label: '💌 SAVE THE DATE MODE', color: 'text-amber-400', bgColor: 'bg-amber-500/10' };
  };

  const activeMode = getActiveMode();

  return (
    <div className="relative min-h-screen space-y-6 p-4 md:p-8 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-purple-900/30 blur-[140px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-900/30 blur-[160px] mix-blend-screen" />
        <div className="absolute top-[40%] right-[10%] w-[40%] h-[40%] rounded-full bg-amber-600/15 blur-[120px] mix-blend-screen animate-pulse delay-1000" />
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* GREETING FOR FIANCÉE */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="space-y-3">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
              className="font-headline text-5xl md:text-7xl font-light tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-300 to-amber-500"
            >
              Greetings, my soon-to-be wife 💍
            </motion.h1>
            <p className="text-white/60 text-lg font-light tracking-wide max-w-2xl">
              Welcome to your wedding command center. Everything you need to create the perfect day is here.
            </p>
          </div>
        </motion.div>

        {/* MODE STATUS CARD */}
        <motion.div variants={itemVariants}>
          <Card className={`relative overflow-hidden border-white/5 backdrop-blur-2xl shadow-2xl transition-all duration-500 ${activeMode.bgColor} border-l-4 ${activeMode.color.replace('text-', 'border-')}`}>
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent rounded-full filter blur-3xl" />
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 uppercase tracking-widest mb-1">Current Mode</p>
                <p className={`text-3xl font-bold font-headline ${activeMode.color}`}>{activeMode.label}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60 mb-1">Days Until</p>
                <p className="text-3xl font-bold text-amber-400">{daysUntilWedding} days</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CONTROL PANEL - ALL SWITCHES */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="text-amber-400" size={20} />
                Control Panel
              </CardTitle>
              <CardDescription>Manage your wedding&apos;s public experience</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Switch 1: Save the Date */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <CalendarHeart className="text-amber-400" size={18} />
                      Save the Date Envelope
                    </h3>
                    <p className="text-xs text-white/50">Let guests open the interactive envelope first</p>
                  </div>
                  <Switch
                    checked={redirectToStd}
                    onCheckedChange={(checked) => handleSwitchChange('redirectToStd', checked)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>

              {/* Switch 2: Wedding Day Mode */}
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium text-red-300 flex items-center gap-2">
                      <Sparkles className="text-red-400 animate-pulse" size={18} />
                      Wedding Day Mode
                    </h3>
                    <p className="text-xs text-red-300/70">🎉 Activate celebration mode & special features</p>
                  </div>
                  <Switch
                    checked={weddingDayMode}
                    onCheckedChange={(checked) => handleSwitchChange('weddingDayMode', checked)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* INVITATION THEME SELECTOR & PREVIEW */}
        {invitationConfig && (
          <motion.div variants={itemVariants}>
            <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl text-amber-300">
                    <Sparkles size={20} />
                    Invitation Theme Settings
                  </CardTitle>
                  <CardDescription>Select the active theme for your guests and preview both styles live</CardDescription>
                </div>
                <button
                  onClick={() => window.open('/invitation', '_blank')}
                  className="flex items-center justify-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-5 py-2.5 font-body text-[10px] uppercase tracking-[0.24em] text-amber-300 shadow-md transition-all hover:bg-amber-500/25 hover:border-amber-500/60"
                >
                  <Sparkles size={12} className="animate-pulse" /> Preview Live
                </button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Active Selector Toggle buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => handleThemeToggle('classic-botanical')}
                    disabled={isUpdating}
                    className={`rounded-full px-6 py-2.5 font-body text-xs uppercase tracking-[0.2em] transition-all border ${
                      (invitationConfig.theme || 'classic-botanical') === 'classic-botanical'
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                        : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white bg-white/5'
                    }`}
                  >
                    Style 1: Botanical Garden
                  </button>
                  <button
                    onClick={() => handleThemeToggle('navy-royal')}
                    disabled={isUpdating}
                    className={`rounded-full px-6 py-2.5 font-body text-xs uppercase tracking-[0.2em] transition-all border ${
                      invitationConfig.theme === 'navy-royal'
                        ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20'
                        : 'border-white/10 text-white/70 hover:border-white/20 hover:text-white bg-white/5'
                    }`}
                  >
                    Style 2: Navy Royal &amp; Gold
                  </button>
                </div>

                {/* Side-by-side previews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  {/* Style 1 preview */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">Style 1: Botanical Garden</p>
                    </div>
                    <div className="w-[280px] aspect-[5/7] rounded-xl overflow-hidden shadow-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <InvitationCard 
                        config={{ ...invitationConfig, theme: 'classic-botanical' }} 
                        guestName="The Parker Family" 
                        widthClass="w-full h-full"
                      />
                    </div>
                    <button
                      onClick={() => window.open('/invitation?theme=classic-botanical', '_blank')}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-body text-[9px] uppercase tracking-[0.2em] text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    >
                      👁 Preview Style 1
                    </button>
                  </div>

                  {/* Style 2 preview */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/55">Style 2: Navy Royal &amp; Gold</p>
                    </div>
                    <div className="w-[280px] aspect-[5/7] rounded-xl overflow-hidden shadow-2xl border border-white/5 hover:border-white/10 transition-colors">
                      <InvitationCard 
                        config={{ ...invitationConfig, theme: 'navy-royal' }} 
                        guestName="The Parker Family" 
                        widthClass="w-full h-full"
                      />
                    </div>
                    <button
                      onClick={() => window.open('/invitation?theme=navy-royal', '_blank')}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-body text-[9px] uppercase tracking-[0.2em] text-white/70 transition-all hover:bg-white/10 hover:text-white"
                    >
                      👁 Preview Style 2
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* INVITATION EXPORTS CARD */}
        {invitationConfig && (
          <motion.div variants={itemVariants}>
            <Card className="border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-amber-300">
                  <Sparkles size={20} />
                  Invitation Assets Exporter
                </CardTitle>
                <CardDescription>Export and download invitation cards to share on WhatsApp or print</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-white/70 max-w-md">
                  Download the general, non-personalized Nikaah-Only invitation card. This card has no guest names and no reception details, making it safe to share with anyone.
                </p>
                <button
                  onClick={downloadNikkahOnlyCard}
                  disabled={downloadingNikkahCard}
                  className="flex items-center gap-2 rounded-full border border-amber-500/35 bg-[#122217] px-6 py-3 font-body text-xs uppercase tracking-[0.24em] text-[#f6e7b7] shadow-lg transition-colors hover:bg-[#1a3220] disabled:opacity-60"
                >
                  {downloadingNikkahCard ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {downloadingNikkahCard ? 'Generating Card...' : 'Download Nikaah Invite'}
                </button>

                {/* Hidden Nikaah-Only card container for exporting general Nikaah card */}
                <div 
                  className="absolute pointer-events-none select-none opacity-0"
                  style={{ left: '-9999px', top: '-9999px', width: '540px' }}
                  data-print-hide
                >
                  <InvitationCard 
                    config={invitationConfig} 
                    nikkahOnly 
                    id="nikkah-only-print-card" 
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ANALYTICS DASHBOARD */}
        <motion.div variants={itemVariants}>
          <AnalyticsDashboard />
        </motion.div>
      </motion.div>
    </div>
  );
}
