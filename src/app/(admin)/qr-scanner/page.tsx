'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoardingPass } from '@/components/boarding-pass';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { lookupHouseholdByQr } from '@/lib/supabase';

type GuestData = {
    name: string;
    tableNumber: number;
    plusOne: string | null;
    qrCodeValue: string;
};

/**
 * html5-qrcode's stop() throws *synchronously* when the scanner isn't
 * currently running ("Cannot stop, scanner is not running or paused."), so
 * `scanner.stop().catch(…)` never gets a chance to swallow it — the throw
 * escapes before a promise exists.
 *
 * That mattered a lot here: a successful scan stops the scanner and flips
 * isScanning to false, and the effect cleanup that runs on that state change
 * then tried to stop it a second time. The synchronous throw landed in a
 * React effect cleanup, uncaught, and took the whole page down to
 * "Application error: a client-side exception has occurred" — so every
 * successful scan killed the page until it was reloaded.
 */
async function stopScannerSafely(scanner: import('html5-qrcode').Html5Qrcode | null) {
    if (!scanner) return;
    try {
        await scanner.stop();
    } catch {
        // Already stopped, or never started — nothing to clean up.
    }
}

/** Outcome of writing the scan to guests.checked_in_at. */
type CheckInState =
    | { status: 'saving' }
    | { status: 'done'; newlyCheckedIn: number; total: number }
    | { status: 'repeat'; alreadyCheckedIn: number; total: number; previouslySeenAt: string | null }
    | { status: 'failed'; message: string };

export default function BouncerPage() {
    const [scannedData, setScannedData] = useState<GuestData | null>(null);
    const [checkIn, setCheckIn] = useState<CheckInState | null>(null);
    const [scanError, setScanError] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
    const scannerDivRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    /**
     * Writes the arrival to the guest rows. Celebrate only on a genuine first
     * scan — a repeat means this QR has already come through the door, which
     * the person working the door needs to see, not a second burst of confetti.
     */
    const recordCheckIn = async (householdId: string, householdName: string) => {
        setCheckIn({ status: 'saving' });
        try {
            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ householdId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'Check-in failed');

            if (json.firstScan) {
                setCheckIn({ status: 'done', newlyCheckedIn: json.newlyCheckedIn, total: json.total });
                confetti({
                    particleCount: 150,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#d4af37', '#f6e7b7', '#ffffff'],
                });
            } else {
                setCheckIn({
                    status: 'repeat',
                    alreadyCheckedIn: json.alreadyCheckedIn,
                    total: json.total,
                    previouslySeenAt: json.previouslySeenAt ?? null,
                });
                toast({
                    variant: 'destructive',
                    title: 'Already checked in',
                    description: `${householdName} was scanned before${
                        json.previouslySeenAt
                            ? ` at ${new Date(json.previouslySeenAt).toLocaleTimeString()}`
                            : ''
                    }.`,
                });
            }
        } catch (err) {
            console.error('[Bouncer] Check-in failed:', err);
            setCheckIn({
                status: 'failed',
                message: err instanceof Error ? err.message : 'Check-in failed',
            });
            toast({
                variant: 'destructive',
                title: 'Check-in not saved',
                description: 'The guest is on the list, but their arrival was not recorded. Try scanning again.',
            });
        }
    };

    const handleScanResult = async (result: string) => {
        setIsScanning(false);
        await stopScannerSafely(scannerRef.current);

        const hh = await lookupHouseholdByQr(result.trim());
        if (hh) {
            const plusOne = hh.guests.length > 1
                ? `${hh.guests[1].firstName} ${hh.guests[1].lastName}`
                : null;
            setScannedData({ name: hh.name, tableNumber: 0, plusOne, qrCodeValue: hh.qrCode });
            setScanError(false);
            await recordCheckIn(hh.id, hh.name);
        } else {
            setScanError(true);
            setScannedData(null);
            toast({
                variant: 'destructive',
                title: 'QR Code Not Found',
                description: `No guest matched: "${result}"`,
            });
        }
    };

    const startScanner = async () => {
        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            if (!scannerDivRef.current) return;

            await stopScannerSafely(scannerRef.current);

            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText: string) => {
                    handleScanResult(decodedText);
                },
                () => {}
            );
        } catch {
            // No camera, permission denied, or the library failed to load.
            setCameraError(true);
            setIsScanning(false);
            toast({
                variant: 'destructive',
                title: 'Camera Unavailable',
                description: 'Allow camera access and try again.',
            });
        }
    };

    const resetScanner = async () => {
        setScannedData(null);
        setCheckIn(null);
        setScanError(false);
        setCameraError(false);
        setIsScanning(true);
    };

    useEffect(() => {
        if (isScanning) {
            // Fire-and-forget, but never let a rejection escape unhandled.
            startScanner().catch(() => {});
        }
        return () => {
            void stopScannerSafely(scannerRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanning]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold italic tracking-tight">Bouncer Mode</h1>
                <p className="text-muted-foreground tracking-wide">Scan guest QR codes for instant check-in.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <Card className="glass-card aspect-video flex flex-col items-center justify-center p-0 overflow-hidden">
                    <div className="relative w-full h-full bg-black">
                        {isScanning && (
                            <div
                                id="qr-reader"
                                ref={scannerDivRef}
                                className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover [&>img]:hidden [&_#qr-reader__scan_region]:hidden [&_#qr-reader__dashboard]:hidden"
                            />
                        )}

                        {isScanning && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="relative w-52 h-52">
                                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#d4af37] rounded-tl-md" />
                                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#d4af37] rounded-tr-md" />
                                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#d4af37] rounded-bl-md" />
                                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#d4af37] rounded-br-md" />
                                    <div className="absolute left-0 right-0 h-0.5 bg-[#d4af37]/80 shadow-[0_0_8px_2px_#d4af37] animate-scan" />
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {!isScanning && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 gap-3"
                                >
                                    {scannedData ? (
                                        checkIn?.status === 'repeat' ? (
                                            <AlertTriangle className="h-28 w-28 text-amber-400" />
                                        ) : (
                                            <CheckCircle2 className="h-28 w-28 text-green-400" />
                                        )
                                    ) : (
                                        <XCircle className="h-28 w-28 text-red-500" />
                                    )}
                                    <p className="text-2xl font-bold">
                                        {scannedData
                                            ? checkIn?.status === 'repeat' ? 'Already Checked In' : 'Welcome!'
                                            : cameraError ? 'Camera Unavailable' : 'Not Found'}
                                    </p>
                                    <p className="text-muted-foreground text-center px-4">
                                        {scannedData
                                            ? scannedData.name
                                            : cameraError
                                                ? 'Allow camera access in your browser, then try again.'
                                                : 'This QR code is not on the guest list.'}
                                    </p>

                                    {/* Arrival record — the scan is only real once it's saved. */}
                                    {scannedData && checkIn && (
                                        <p
                                            className={cn(
                                                'px-4 text-center text-sm font-medium',
                                                checkIn.status === 'done' && 'text-green-400',
                                                checkIn.status === 'repeat' && 'text-amber-400',
                                                checkIn.status === 'failed' && 'text-red-400',
                                                checkIn.status === 'saving' && 'text-white/60'
                                            )}
                                        >
                                            {checkIn.status === 'saving' && 'Recording arrival…'}
                                            {checkIn.status === 'done' &&
                                                `Checked in ${checkIn.newlyCheckedIn} of ${checkIn.total} ${checkIn.total === 1 ? 'guest' : 'guests'}`}
                                            {checkIn.status === 'repeat' &&
                                                `This QR was already used — ${checkIn.alreadyCheckedIn} of ${checkIn.total} already through${
                                                    checkIn.previouslySeenAt
                                                        ? ` at ${new Date(checkIn.previouslySeenAt).toLocaleTimeString()}`
                                                        : ''
                                                }`}
                                            {checkIn.status === 'failed' && 'Arrival NOT saved — scan again'}
                                        </p>
                                    )}
                                    <Button
                                        onClick={resetScanner}
                                        variant="outline"
                                        className="mt-2 gap-2 border-white/20"
                                    >
                                        <RefreshCw size={15} /> {cameraError ? 'Retry Camera' : 'Scan Next Guest'}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Card>

                <AnimatePresence mode="wait">
                    {scannedData ? (
                        <motion.div
                            key="pass"
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <BoardingPass guest={scannedData} onReset={resetScanner} />
                        </motion.div>
                    ) : (
                        <motion.div key="waiting">
                            <Card className="glass-card flex items-center justify-center min-h-[400px]">
                                <div className="text-center text-muted-foreground px-6">
                                    <svg width="80" height="80" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 rounded-md text-white/50">
                                        <path d="M0 0H11V11H0V0ZM2 2V9H9V2H2Z" fill="currentColor"/>
                                        <path d="M4 4H7V7H4V4Z" fill="currentColor"/>
                                        <path d="M22 0H33V11H22V0ZM24 2V9H31V2H24Z" fill="currentColor"/>
                                        <path d="M26 4H29V7H26V4Z" fill="currentColor"/>
                                        <path d="M0 22H11V33H0V22ZM2 24V31H9V24H2Z" fill="currentColor"/>
                                        <path d="M4 26H7V29H4V26Z" fill="currentColor"/>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M31 22H33V24H31V22ZM29 24H31V26H29V24ZM24 22H26V24H24V22ZM26 24H29V26H26V24ZM31 26H33V29H31V26ZM29 29H31V31H29V29ZM26 31H29V33H26V31ZM22 29H24V31H22V29ZM24 26H26V29H24V26ZM22 24H24V26H22V24ZM15 22H17V24H15V22ZM13 24H15V26H13V24ZM17 24H20V26H17V24ZM20 26H22V29H20V26ZM17 29H20V31H17V29ZM15 31H17V33H15V31ZM13 29H15V31H13V29ZM20 22H22V24H20V22ZM13 13H15V15H13V13ZM15 15H17V17H15V15ZM17 13H20V15H17V13ZM20 15H22V17H20V15ZM13 17H15V20H13V17ZM17 20H20V22H17V20ZM15 20H17V22H15V20ZM13 0H15V2H13V0ZM17 2H20V4H17V2ZM20 0H22V2H20V0ZM15 4H17V6H15V4ZM13 6H15V8H13V6ZM17 8H20V10H17V8ZM20 6H22V8H20V6ZM15 10H17V13H15V10Z" fill="currentColor"/>
                                    </svg>
                                    <p className="font-medium mb-1">Awaiting scan</p>
                                    <p className="text-sm">Point the camera at a guest&apos;s QR code to check them in.</p>
                                    {scanError && (
                                        <Button onClick={resetScanner} className="mt-4 gap-2">
                                            <RefreshCw size={14} /> Try Again
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
