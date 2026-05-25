'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CalendarHeart, MailOpen, Globe } from "lucide-react";

export default function DashboardPage() {
  const [redirectToStd, setRedirectToStd] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Load config on mount
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

  // Update redirect config in database
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
          title: 'Landing Route Updated!',
          description: checked 
            ? 'Guests visiting raziaraaziq.co.za will now go straight to the Save the Date.'
            : 'Guests visiting raziaraaziq.co.za will now go straight to the Event RSVP Hub.',
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold italic tracking-tight">Our Wedding Command</h1>
          <p className="text-muted-foreground tracking-wide text-sm">Salaam, Abduraziq. Here is the status of the big day.</p>
        </div>
        
        {/* Quick Domain Controller Badge */}
        <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-accent/30 text-accent self-start py-1.5 px-3 bg-white/5">
          <Globe size={11} className="mr-1.5 animate-pulse" />
          Live Domain: raziaraaziq.co.za
        </Badge>
      </div>

      {/* Website Routing Panel */}
      <Card className="glass-card border-white/10 bg-white/5 backdrop-blur-md overflow-hidden relative">
        <div className="absolute top-0 right-0 h-32 w-32 bg-accent/5 rounded-full filter blur-xl pointer-events-none" />
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Globe className="text-accent h-5 w-5" />
            Website Route Controller
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Control which landing page guests see when they visit your wedding domain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-black/20">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">
                Current Landing Route:{' '}
                <span className={redirectToStd ? 'text-[#d4af37]' : 'text-emerald-400'}>
                  {redirectToStd ? 'Save the Date Envelope' : 'Event RSVP Hub'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {redirectToStd
                  ? 'Guests will see the beautiful animated envelope reveal at /std. Untick to activate the full wedding website.'
                  : 'Guests will go straight to the wedding details, events, and RSVP ledger.'}
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-end md:self-auto bg-white/5 border border-white/10 rounded-xl p-2 px-4 shadow-inner">
              <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase flex items-center gap-1.5">
                {redirectToStd ? (
                  <CalendarHeart size={14} className="text-[#d4af37]" />
                ) : (
                  <MailOpen size={14} className="text-emerald-400" />
                )}
                Save the Date Mode:
              </span>
              <Switch 
                checked={redirectToStd} 
                onCheckedChange={handleToggle}
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <AnalyticsDashboard />
    </div>
  );
}
