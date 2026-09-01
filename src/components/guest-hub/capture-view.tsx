'use client';
import { useState } from "react";
import { Lock, Globe, Camera, Images } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DisposableCameraUI } from "../disposable-camera-ui";
import { GuestUploader } from "./guest-uploader";

interface CaptureViewProps {
    guestId: string;
    questTag: string | null;
    onUploadComplete: (blob?: unknown) => void;
}

type Mode = 'camera' | 'upload';

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

/**
 * Two ways to contribute, because they are genuinely different moments.
 *
 * The disposable camera is for one considered shot, taken now. "From my phone"
 * is for the guest who already has the whole evening in their camera roll and
 * wants to hand all of it over at once — which the camera's single-file picker
 * could not do.
 */
const ModeToggle = ({ mode, onSelect }: { mode: Mode; onSelect: (m: Mode) => void }) => (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {([
            { id: 'camera' as const, label: 'Camera', icon: Camera },
            { id: 'upload' as const, label: 'From my phone', icon: Images },
        ]).map(({ id, label, icon: Icon }) => (
            <button
                key={id}
                onClick={() => onSelect(id)}
                aria-pressed={mode === id}
                className={cn(
                    'relative flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    mode === id ? 'text-black' : 'text-white/50 hover:text-white/80'
                )}
            >
                {mode === id && (
                    <motion.div
                        layoutId="capture-mode-bg"
                        className="absolute inset-0 z-0 rounded-full bg-[#d4af37]"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Icon size={13} /> {label}
                </span>
            </button>
        ))}
    </div>
);

export function CaptureView({ guestId, questTag, onUploadComplete }: CaptureViewProps) {
    const [visibility, setVisibility] = useState<'public' | 'private'>('public');
    const [mode, setMode] = useState<Mode>('camera');

    return (
        <div className="h-full flex flex-col bg-[#111]">
            <div className="flex-1 w-full h-full overflow-hidden">
                {mode === 'camera' ? (
                    <DisposableCameraUI guestId={guestId} visibility={visibility} questTag={questTag} onUploadComplete={onUploadComplete} />
                ) : (
                    <GuestUploader
                        guestId={guestId}
                        visibility={visibility}
                        questTag={questTag}
                        onUploaded={onUploadComplete}
                    />
                )}
            </div>
            {/* Clearance for the hub's bottom nav. That nav is `fixed` at z-50
                while each tab's content is positioned `absolute inset-0`, so
                the container's own padding does not hold it back — anything
                anchored to the bottom of this tab ends up underneath the nav
                and unclickable, which is what hid the upload button. */}
            <div className="py-3 px-4 pb-[6.5rem] z-20 w-full bg-[#111] border-t border-white/10">
                <div className="max-w-sm mx-auto space-y-2">
                    <ModeToggle mode={mode} onSelect={setMode} />
                    <VisibilityToggle selected={visibility} onSelect={setVisibility} />
                </div>
            </div>
        </div>
    );
}
