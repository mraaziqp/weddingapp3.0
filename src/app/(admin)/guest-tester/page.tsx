'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Smartphone, ShieldCheck, Heart, User, Table, 
  Music, Sparkle, RefreshCw, AlertCircle, Play, Globe, ExternalLink, HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { households } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function GuestTesterPage() {
  const { toast } = useToast();
  const [selectedGuestQr, setSelectedGuestQr] = useState<string>('fatima-fassi');
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [deviceFrame, setDeviceFrame] = useState<'iphone' | 'ipad' | 'desktop'>('iphone');

  // Simulation switches
  const [simEventDay, setSimEventDay] = useState<boolean>(false);
  const [partyMode, setPartyMode] = useState<boolean>(false);

  // Real households from mock data
  const availableHouseholds = households.map(h => ({
    id: h.qrCode,
    name: h.name,
    guestCount: h.guests?.length || 0,
  }));

  // Sync state with localStorage/cookies on mount
  useEffect(() => {
    setSimEventDay(localStorage.getItem('eventDayActive') === 'true');
    setPartyMode(localStorage.getItem('partyMode') === 'true');
  }, []);

  const handleSimEventDayToggle = (checked: boolean) => {
    setSimEventDay(checked);
    if (checked) {
      localStorage.setItem('eventDayActive', 'true');
      toast({
        title: 'Event Day Mode: ON',
        description: 'Mock guest views will now skip envelopes and load camera / interactive cards directly.'
      });
    } else {
      localStorage.removeItem('eventDayActive');
      toast({
        title: 'Event Day Mode: OFF',
        description: 'Standard guest flow activated.'
      });
    }
    // Reload iframe to apply simulated environment changes
    setIframeKey(prev => prev + 1);
  };

  const handlePartyModeToggle = (checked: boolean) => {
    setPartyMode(checked);
    if (checked) {
      localStorage.setItem('partyMode', 'true');
      toast({
        title: 'Emerald Party Mode: ON',
        description: 'The guest hub will now load in a high-end luxury dark emerald aesthetic!'
      });
    } else {
      localStorage.removeItem('partyMode');
      toast({
        title: 'Emerald Party Mode: OFF',
        description: 'Guest hub returned to standard champagne theme.'
      });
    }
    setIframeKey(prev => prev + 1);
  };

  const handleReload = () => {
    setIframeKey(prev => prev + 1);
    toast({ title: 'Simulator Reloaded', description: 'Interactive view refreshed.' });
  };

  const currentHousehold = households.find(h => h.qrCode === selectedGuestQr);
  const currentGuest = currentHousehold?.guests[0];

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden font-sans text-white">
      {/* Background Cinematic Lighting */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-950/20 blur-[130px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-900/15 blur-[150px] mix-blend-screen" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-white/10"
      >
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-emerald-500/30 text-emerald-300 py-1 px-3 bg-emerald-500/10 mb-2">
            <Sparkles size={12} className="mr-2 inline" /> Quality Assurance
          </Badge>
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight text-white/90">
            Guest <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-emerald-500">Simulation</span> Lab
          </h1>
          <p className="text-muted-foreground tracking-wide text-sm md:text-base max-w-2xl font-light">
            Act as any guest. Test RSVPs, digital passes, food options, camera capture, private folders, and song requests in a fully sandboxed mobile device environment.
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild variant="outline" className="border-white/10 hover:bg-white/10 text-white">
            <Link href="/dashboard">
              Admin Command
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">
        
        {/* Left Side: Selectors & Diagnostics */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Guest Selector */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <User size={16} /> Choose Mock Persona
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <p className="text-xs text-white/40 mb-3">Select a guest from the wedding registry to assume their invite privileges.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {households.map((h) => {
                  const guest = h.guests[0];
                  const isSelected = selectedGuestQr === h.qrCode;
                  return (
                    <button
                      key={h.id}
                      onClick={() => {
                        setSelectedGuestQr(h.qrCode);
                        toast({
                          title: `Persona Switched: ${guest.firstName}`,
                          description: `Simulating ${h.name}.`
                        });
                      }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                        isSelected 
                          ? 'bg-emerald-950/30 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                      )}
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                        isSelected ? 'bg-emerald-500 text-black' : 'bg-white/5 group-hover:bg-white/10'
                      )}>
                        {guest.firstName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{guest.firstName} {guest.lastName}</p>
                        <p className="text-[10px] text-white/40 truncate">{guest.tags?.[0] || 'General'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Simulation Settings */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <RefreshCw size={16} /> Environment Controllers
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/5">
                <div className="space-y-1 pr-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    Simulate Event Day <Play className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" />
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Instantly skips initial landing page envelopes, loading the camera capture and digital event widgets directly.
                  </p>
                </div>
                <Switch checked={simEventDay} onCheckedChange={handleSimEventDayToggle} className="data-[state=checked]:bg-emerald-400" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl border border-white/5 bg-white/5">
                <div className="space-y-1 pr-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    Activate Party Mode 🎉
                  </h4>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Transforms the guest portal styling into a sleek, rich, dark emerald aesthetic!
                  </p>
                </div>
                <Switch checked={partyMode} onCheckedChange={handlePartyModeToggle} className="data-[state=checked]:bg-emerald-400" />
              </div>
            </CardContent>
          </Card>

          {/* Diagnostic Console */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border">
            <CardHeader className="pb-3 border-b border-white/5 bg-black/20 flex flex-row justify-between items-center">
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                <ShieldCheck size={16} /> Sandboxed Diagnostics
              </CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white" onClick={handleReload} title="Reload Device Frame">
                <RefreshCw size={14} />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 font-mono text-xs text-white/80">
              
              <div className="grid grid-cols-3 gap-y-2 gap-x-4 border-b border-white/5 pb-4">
                <span className="text-white/40 uppercase">Guest Name:</span>
                <span className="col-span-2 font-semibold text-emerald-300">{currentGuest?.firstName} {currentGuest?.lastName}</span>

                <span className="text-white/40 uppercase">Household:</span>
                <span className="col-span-2">{currentHousehold?.name}</span>

                <span className="text-white/40 uppercase">Simulated QR:</span>
                <span className="col-span-2 text-amber-400">{currentHousehold?.qrCode}</span>

                <span className="text-white/40 uppercase">Group Tag:</span>
                <span className="col-span-2">
                  <Badge variant="outline" className="text-[9px] border-emerald-400/30 text-emerald-300 py-0.5">
                    {currentGuest?.tags?.[0] || 'General'}
                  </Badge>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-y-2 gap-x-4 border-b border-white/5 pb-4">
                <span className="text-white/40 uppercase">RSVP State:</span>
                <span className="col-span-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {currentGuest?.rsvpStatus || 'Pending'}
                </span>

                <span className="text-white/40 uppercase">Dietary Flags:</span>
                <span className="col-span-2 text-purple-300">{currentGuest?.dietaryRestrictions || 'None'}</span>

                <span className="text-white/40 uppercase">Song Request:</span>
                <span className="col-span-2 italic">"{currentGuest?.songRequest || 'None'}"</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] text-white/40 uppercase">Simulated URL Path:</span>
                <a 
                  href={`/event?guestId=${selectedGuestQr}`} 
                  target="_blank" 
                  className="text-emerald-400 flex items-center gap-1 hover:underline hover:text-emerald-300 transition-colors"
                >
                  Open in New Tab <ExternalLink size={12} />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: iPhone Device Frame Preview */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          
          <div className="relative z-10 w-full max-w-[340px] aspect-[9/19.5] bg-[#1a1c20] rounded-[52px] border-8 border-[#3b3e45] shadow-[0_30px_70px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.1)] flex items-center justify-center p-3 overflow-hidden">
            
            {/* iPhone Top Notch Speaker/Camera */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#000] rounded-full z-30 flex items-center justify-between px-5 pointer-events-none">
              <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-white/5" />
              <div className="w-12 h-1 bg-[#222] rounded-full" />
              <div className="w-2 h-2 rounded-full bg-blue-900/40" />
            </div>

            {/* Simulated Guest Iframe Interface */}
            <div className="w-full h-full rounded-[42px] overflow-hidden bg-black relative">
              <iframe
                key={`${selectedGuestQr}-${iframeKey}`}
                src={`/event?guestId=${selectedGuestQr}`}
                className="w-full h-full border-none select-none"
                style={{ height: '100%', width: '100%' }}
              />
            </div>
            
            {/* Home bar Indicator bottom */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/45 rounded-full pointer-events-none z-30" />
          </div>

          <p className="text-[10px] text-white/30 tracking-widest uppercase mt-4 flex items-center gap-1.5">
            <Smartphone size={12} /> Interactive Live Sandbox Preview
          </p>
        </div>

      </div>
    </div>
  );
}
