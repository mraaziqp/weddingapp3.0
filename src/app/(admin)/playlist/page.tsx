'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

const songRequests = [
    { id: 1, title: "I Wanna Dance with Somebody", artist: "Whitney Houston", guest: "Aunt Carol", status: "pending" },
    { id: 2, title: "Crazy Little Thing Called Love", artist: "Queen", guest: "John Doe", status: "approved" },
    { id: 3, title: "Chicken Fried", artist: "Zac Brown Band", guest: "Cousin Mike", status: "vetoed" },
    { id: 4, title: "Single Ladies (Put a Ring on It)", artist: "Beyoncé", guest: "Sarah Smith", status: "pending" },
    { id: 5, title: "Don't Stop Believin'", artist: "Journey", guest: "Uncle Bob", status: "pending" },
    { id: 6, title: "Despacito", artist: "Luis Fonsi", guest: "Maria Garcia", status: "pending" },
];

export default function PlaylistPage() {
    const [songs, setSongs] = useState(songRequests);

    const handleStatusChange = (id: number, status: 'approved' | 'vetoed') => {
        setSongs(songs.map(song => song.id === id ? { ...song, status } : song));
    };
    
    const pendingSongs = songs.filter(s => s.status === 'pending');
    const approvedSongs = songs.filter(s => s.status === 'approved');
    const vetoedSongs = songs.filter(s => s.status === 'vetoed');

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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
            <CardHeader>
                <CardTitle>Approval Queue</CardTitle>
                <CardDescription>{pendingSongs.length} songs waiting for review.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <AnimatePresence>
                    {pendingSongs.map((song) => (
                        <motion.div
                            key={song.id}
                            layout
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                           <div>
                                <p className="font-medium text-lg text-aurora-soft-gold">{song.title}</p>
                                <p className="text-sm text-muted-foreground">{song.artist} - <span className="italic">requested by {song.guest}</span></p>
                           </div>
                           <div className="flex gap-2">
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-green-400 rounded-full hover:bg-green-400/10 hover:text-green-300" onClick={() => handleStatusChange(song.id, 'approved')}>
                                    <ThumbsUp className="h-5 w-5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-10 w-10 text-red-400 rounded-full hover:bg-red-400/10 hover:text-red-300" onClick={() => handleStatusChange(song.id, 'vetoed')}>
                                    <ThumbsDown className="h-5 w-5" />
                                </Button>
                           </div>
                        </motion.div>
                    ))}
                    </AnimatePresence>
                    {pendingSongs.length === 0 && <p className="text-center text-muted-foreground py-8">No pending song requests!</p>}
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
                        {approvedSongs.map(song => (
                            <li key={song.id} className="text-sm text-muted-foreground">{song.title} - <span className="font-medium text-foreground">{song.artist}</span></li>
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
                        {vetoedSongs.map(song => (
                             <li key={song.id} className="text-sm text-muted-foreground line-through">{song.title} - <span className="font-medium text-foreground">{song.artist}</span></li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>
    </motion.div>
  );
}
