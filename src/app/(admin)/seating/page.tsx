'use client';

import { useState } from "react";
import { SeatingChart } from "@/components/seating-chart";
import { SeatingManager } from "@/components/seating-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Map, ListTodo } from "lucide-react";
import { motion } from "framer-motion";

export default function SeatingPage() {
  const [activeTab, setActiveTab] = useState<'visual' | 'manage'>('visual');

  return (
    <div className="relative min-h-screen space-y-8 p-4 md:p-8 overflow-hidden font-sans">
      {/* Background Animated Blobs for Premium Feel */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-blue-900/15 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-900/15 blur-[150px] mix-blend-screen" />
        <div className="absolute top-[40%] right-[30%] w-[35%] h-[35%] rounded-full bg-purple-900/10 blur-[100px] mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-white/10"
      >
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em] border-blue-500/30 text-blue-300 py-1 px-3 bg-blue-500/10 mb-2">
            <Sparkles size={12} className="mr-2 inline" /> Seating Control
          </Badge>
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-tight text-white/90">
            {activeTab === 'visual' ? 'Visual' : 'Table'} <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-blue-500">Seating</span> Studio
          </h1>
          <p className="text-muted-foreground tracking-wide text-sm md:text-base max-w-2xl font-light">
            {activeTab === 'visual'
              ? 'Venue preset loaded for a 21-person layout with a bride & groom head table and stage-front flow. Drag and drop guests to optimize the floor plan.'
              : 'Manage table assignments, track guest placement, and organize seating arrangements with real-time analytics.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveTab('visual')}
            variant={activeTab === 'visual' ? 'default' : 'outline'}
            className={activeTab === 'visual' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            <Map size={16} className="mr-2" />
            Visual Planner
          </Button>
          <Button
            onClick={() => setActiveTab('manage')}
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            className={activeTab === 'manage' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <ListTodo size={16} className="mr-2" />
            Table Manager
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {activeTab === 'visual' && <SeatingChart />}
        {activeTab === 'manage' && <SeatingManager />}
      </motion.div>
    </div>
  );
}

