'use client';

import { Button } from './ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Undo2, Redo2, Download } from 'lucide-react';
import { motion } from 'framer-motion';

interface SeatingControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function SeatingControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onUndo,
  onRedo,
  onExport,
  canUndo,
  canRedo,
}: SeatingControlsProps) {
  return (
    <motion.div
      className="fixed bottom-32 right-4 z-40 flex flex-col gap-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Button size="icon" variant="ghost" onClick={onZoomIn} title="Zoom in (↑)">
        <ZoomIn size={18} />
      </Button>
      <div className="text-center text-xs text-white/60 w-full">{Math.round(zoom * 100)}%</div>
      <Button size="icon" variant="ghost" onClick={onZoomOut} title="Zoom out (↓)">
        <ZoomOut size={18} />
      </Button>
      <div className="w-6 h-px bg-white/10" />
      <Button size="icon" variant="ghost" onClick={onResetZoom} title="Reset zoom (0)">
        <RotateCcw size={18} />
      </Button>
      <div className="w-6 h-px bg-white/10" />
      <Button
        size="icon"
        variant="ghost"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={18} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 size={18} />
      </Button>
      <div className="w-6 h-px bg-white/10" />
      <Button size="icon" variant="ghost" onClick={onExport} title="Export as PNG">
        <Download size={18} />
      </Button>
    </motion.div>
  );
}
