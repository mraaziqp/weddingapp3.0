'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarHeart, MailOpen, Globe, Sparkles, Play, Users, Clock, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

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
  const [invitationMode, setInvitationMode] = useState(false);
  const [weddingDayMode, setWeddingDayMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showGuestView, setShowGuestView] = useState(false);
  const { toast } = useToast();

  const weddingDate = new Date('2026-09-06');
  const daysUntilWedding = Math.ceil((weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Load config
  useEffect(() => {
    fetch('/api/std/config')
      .then(r => r.json())
      .then((data) => {
        if (data.config) {
          setRedirectToStd(data.config.redirectToStd !== false);
          setInvitationMode(data.config.invitationMode === true);
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
        if (key === 'invitationMode') setInvitationMode(checked);
        if (key === 'weddingDayMode') setWeddingDayMode(checked);

        const messages: Record<string, string> = {
          redirectToStd: checked ? 'Save the Date mode ACTIVE ✨' : 'RSVP mode ACTIVE 📧',
          invitationMode: checked ? 'Invitation link is LIVE 🎫' : 'Save the Date link is LIVE 💌',
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
    if (invitationMode) return { label: '🎫 INVITATION MODE', color: 'text-blue-400', bgColor: 'bg-blue-500/10' };
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
              <CardDescription>Manage your wedding's public experience</CardDescription>
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

              {/* Switch 2: Invitation Mode */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <MailOpen className="text-blue-400" size={18} />
                      Invitation Mode
                    </h3>
                    <p className="text-xs text-white/50">Switch to invitation & RSVP experience</p>
                  </div>
                  <Switch
                    checked={invitationMode}
                    onCheckedChange={(checked) => handleSwitchChange('invitationMode', checked)}
                    disabled={isUpdating}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
              </div>

              {/* Switch 3: Wedding Day Mode */}
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



        {/* ANALYTICS DASHBOARD */}
        <motion.div variants={itemVariants}>
          <AnalyticsDashboard />
        </motion.div>
      </motion.div>
    </div>
  );
}
