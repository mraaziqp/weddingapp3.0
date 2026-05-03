
'use client';
import { useState } from "react";
import { Lock, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DisposableCameraUI } from "../disposable-camera-ui";

interface CaptureViewProps {
    guestId: string;
    questTag: string | null;
    onUploadComplete: (blob?: unknown) => void;
}

const VisibilityToggle = ({ selected, onSelect }: { selected: 'public' | 'private', onSelect: (val: 'public' | 'private') => void }) => {
    return (
        <div className="flex items-center space-x-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 p-1">
            <button
                onClick={() => onSelect('public')}
                className={cn("relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors w-1/2", selected === 'public' ? 'text-black' : 'text-white/50 hover:text-white/80')}
            >
                {selected === 'public' && <motion.div layoutId="toggle-bg" className="absolute inset-0 rounded-full bg-orange-400 z-0" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5 text-xs"><Globe size={14} /> Live Wall</span>
            </button>
            <button
                onClick={() => onSelect('private')}
                className={cn("relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors w-1/2", selected === 'private' ? 'text-black' : 'text-white/50 hover:text-white/80')}
            >
                {selected === 'private' && <motion.div layoutId="toggle-bg" className="absolute inset-0 rounded-full bg-orange-400 z-0" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                <span className="relative z-10 flex items-center justify-center gap-1.5 text-xs"><Lock size={14} /> The Vault</span>
            </button>
        </div>
    );
};

export function CaptureView({ guestId, questTag, onUploadComplete }: CaptureViewProps) {
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');

    return (
        <div className="h-full flex flex-col bg-[#111]">
            <div className="flex-1 w-full h-full overflow-hidden">
                <DisposableCameraUI guestId={guestId} visibility={visibility} questTag={questTag} onUploadComplete={onUploadComplete} />
            </div>
            <div className="py-3 px-4 z-20 w-full bg-[#111] border-t border-white/10">
                <div className="max-w-sm mx-auto">
                    <VisibilityToggle selected={visibility} onSelect={setVisibility} />
                </div>
            </div>
        </div>
    );
}
