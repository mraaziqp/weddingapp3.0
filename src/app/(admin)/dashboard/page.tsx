'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CalendarHeart, MailOpen, Globe, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [redirectToStd, setRedirectToStd] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/std/config')
      .then(r => r.json())
      .then((data) => {
        if (data.config && typeof data.config.redirectToStd === 'boolean') {
          setRedirectToStd(data.config.redirectToStd);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggle = async (checked: boolean) => {
    setRedirectToStd(checked);
    setIsUpdating(true);
    try {
      const getRes = await fetch('/api/std/config');
      const getData = await getRes.json();
      const existingConfig = getData.config || {};
      const newConfig = { ...existingConfig, redirectToStd: checked };

      const res = await fetch('/api/std/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig, designState: getData.designState }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: 'Routing Updated',
          description: checked 
            ? 'Guests will now see the Save the Date envelope.'
            : 'Guests will now see the main RSVP Hub.',
        });
      } else {
        toast({ title: 'Failed to update', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error updating route', description: String(err), variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden font-sans">
      {/* Background Animated Blobs for Premium Feel */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px] mix-blend-screen" />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] rounded-full bg-amber-600/10 blur-[100px] mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-white/10"
      >
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-amber-500/30 text-amber-300 py-1 px-3 bg-amber-500/10 mb-2">
            <Sparkles size={12} className="mr-2 inline" /> Admin Command Center
          </Badge>
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight text-white/90">
            The <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Master</span> Plan
          </h1>
          <p className="text-muted-foreground tracking-wide text-sm md:text-base max-w-lg font-light">
            Welcome back, Abduraziq. Every detail is at your fingertips. Orchestrate the perfect day.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 items-end">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-emerald-500/30 text-emerald-400 py-1.5 px-3 bg-black/40 backdrop-blur-md shadow-xl">
            <Globe size={11} className="mr-2 animate-pulse text-emerald-400" />
            Live: raziaraaziq.co.za
          </Badge>
        </div>
      </motion.div>

      {/* Website Routing Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="relative overflow-hidden border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl group transition-all hover:bg-black/50">
          <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-amber-500/5 to-transparent rounded-full filter blur-3xl pointer-events-none transition-opacity group-hover:opacity-100 opacity-50" />
          <CardHeader className="pb-4 border-b border-white/5">
            <CardTitle className="text-xl font-serif font-medium flex items-center gap-3 text-white/90">
              <Globe className="text-amber-400 h-5 w-5" />
              Domain Traffic Controller
            </CardTitle>
            <CardDescription className="text-sm text-white/50 font-light">
              Toggle the public landing page experience for your guests.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-inner transition-all hover:border-white/10">
              <div className="space-y-2 flex-1">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  Active Gateway:{' '}
                  <span className={redirectToStd ? 'text-amber-400 font-serif italic' : 'text-emerald-400 font-serif italic'}>
                    {redirectToStd ? 'The Envelope Reveal' : 'The Event Ledger'}
                  </span>
                </h3>
                <p className="text-sm text-white/50 font-light leading-relaxed">
                  {redirectToStd
                    ? 'Visitors are currently greeted by the interactive Save the Date envelope.'
                    : 'Visitors bypass the envelope and enter the comprehensive wedding portal.'}
                </p>
              </div>
              
              <div className="flex items-center gap-4 bg-black/50 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Status</span>
                  <span className="text-sm font-medium text-white tracking-wide flex items-center gap-2">
                    {redirectToStd ? (
                      <CalendarHeart size={16} className="text-amber-400" />
                    ) : (
                      <MailOpen size={16} className="text-emerald-400" />
                    )}
                    STD Mode
                  </span>
                </div>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <Switch 
                  checked={redirectToStd} 
                  onCheckedChange={handleToggle}
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <AnalyticsDashboard />
      </motion.div>
    </div>
  );
}

