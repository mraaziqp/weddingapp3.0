'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { fetchTracks, updateTrackColumn } from "@/lib/supabase";
import type { TrackItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function PlaylistPage() {
    const [tracks, setTracks] = useState<TrackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        fetchTracks()
            .then(setTracks)
            .catch(err => {
                console.error('Failed to load tracks:', err);
                toast({ variant: 'destructive', title: 'Failed to load playlist' });
            })
            .finally(() => setLoading(false));
    }, [toast]);

    const handleApprove = async (trackId: string) => {
        try {
            await updateTrackColumn(trackId, 'must-play');
            setTracks(tracks.map(t => t.id === trackId ? { ...t, column: 'must-play' } : t));
        } catch (err) {
            console.error('Failed to approve:', err);
            toast({ variant: 'destructive', title: 'Failed to approve song' });
        }
    };

    const handleVeto = async (trackId: string) => {
        try {
            await updateTrackColumn(trackId, 'do-not-play');
            setTracks(tracks.map(t => t.id === trackId ? { ...t, column: 'do-not-play' } : t));
        } catch (err) {
            console.error('Failed to veto:', err);
            toast({ variant: 'destructive', title: 'Failed to veto song' });
        }
    };

    const pendingTracks = tracks.filter(t => t.column === 'must-play' || !t.column);
    const approvedTracks = tracks.filter(t => t.column === 'must-play');
    const vetoedTracks = tracks.filter(t => t.column === 'do-not-play');

  return (
    <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
    >
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">Guest Playlist Builder</h1>
        <p className="text-muted-foreground tracking-wide">Vet and approve song requests from your guests.</p>
      </div>

      {loading && (
        <div className="text-center py-12 text-white/40">
          <p>Loading playlist...</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Card className="glass-card lg:col-span-2">
              <CardHeader>
                  <CardTitle>Approval Queue</CardTitle>
                  <CardDescription>{pendingTracks.length} songs waiting for review.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-4">
                      <AnimatePresence>
                      {pendingTracks.map((track) => (
                          <motion.div
                              key={track.id}
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                             <div>
                                  <p className="font-medium text-lg text-aurora-soft-gold">{track.title}</p>
                                  <p className="text-sm text-muted-foreground">{track.artist} {track.requestedBy && <span className="italic">- requested by {track.requestedBy}</span>}</p>
                             </div>
                             <div className="flex gap-2">
                                  <Button size="icon" variant="ghost" className="h-10 w-10 text-green-400 rounded-full hover:bg-green-400/10 hover:text-green-300" onClick={() => handleApprove(track.id)}>
                                      <ThumbsUp className="h-5 w-5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400 rounded-full hover:bg-red-400/10 hover:text-red-300" onClick={() => handleVeto(track.id)}>
                                      <ThumbsDown className="h-5 w-5" />
                                  </Button>
                             </div>
                          </motion.div>
                      ))}
                      </AnimatePresence>
                      {pendingTracks.length === 0 && <p className="text-center text-muted-foreground py-8">No pending song requests!</p>}
                  </div>
              </CardContent>
          </Card>

          <div className="space-y-8">
              <Card className="glass-card">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Check className="text-green-400"/> Approved Songs</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ul className="space-y-2">
                          {approvedTracks.map(track => (
                              <li key={track.id} className="text-sm text-muted-foreground">{track.title} - <span className="font-medium text-foreground">{track.artist}</span></li>
                          ))}
                      </ul>
                  </CardContent>
              </Card>
              <Card className="glass-card">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><X className="text-red-400"/> Vetoed Songs</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <ul className="space-y-2">
                          {vetoedTracks.map(track => (
                               <li key={track.id} className="text-sm text-muted-foreground line-through">{track.title} - <span className="font-medium text-foreground">{track.artist}</span></li>
                          ))}
                      </ul>
                  </CardContent>
              </Card>
          </div>
        </div>
      )}
    </motion.div>
  );
}
