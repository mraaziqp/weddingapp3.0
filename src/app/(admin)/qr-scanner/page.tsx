'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle2, XCircle } from 'lucide-react';
import { BoardingPass } from '@/components/boarding-pass';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { allGuests } from '@/lib/mock-data';

const mockGuestData = {
  'WEDU-HOUSEHOLD-1': {
    name: 'The Ahmed Family',
    tableNumber: 2,
    plusOne: 'Fatima Ahmed',
    qrCodeValue: 'WEDU-HOUSEHOLD-1',
  },
  'WEDU-HOUSEHOLD-2': {
    name: 'Peter Jones',
    tableNumber: 5,
    plusOne: null,
    qrCodeValue: 'WEDU-HOUSEHOLD-2',
  },
  'WEDU-HOUSEHOLD-3': {
    name: 'The Williams Family',
    tableNumber: 3,
    plusOne: 'David Williams',
    qrCodeValue: 'WEDU-HOUSEHOLD-3',
  },
  'WEDU-HOUSEHOLD-4': {
    name: 'Susan Davis',
    tableNumber: 9,
    plusOne: null,
    qrCodeValue: 'WEDU-HOUSEHOLD-4',
  },
  'WEDU-HOUSEHOLD-5': {
    name: 'The Miller Family',
    tableNumber: 1,
    plusOne: 'Sarah Miller',
    qrCodeValue: 'WEDU-HOUSEHOLD-5',
  },
  'WEDU-HOUSEHOLD-6': {
    name: 'Chris Lee',
    tableNumber: 7,
    plusOne: null,
    qrCodeValue: 'WEDU-HOUSEHOLD-6',
  },
  'WEDU-HOUSEHOLD-7': {
    name: 'Patricia Garcia',
    tableNumber: 7,
    plusOne: null,
    qrCodeValue: 'WEDU-HOUSEHOLD-7',
  }
};

type GuestData = {
    name: string;
    tableNumber: number;
    plusOne: string | null;
    qrCodeValue: string;
}

export default function BouncerPage() {
  const [scannedData, setScannedData] = useState<GuestData | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const { toast } = useToast();

  const handleScan = (result: string | null) => {
    if (result) {
      setIsScanning(false);
      
      const guest = mockGuestData[result as keyof typeof mockGuestData];
      if (guest) {
        setScannedData(guest);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#d4af37', '#f6e7b7', '#ffffff']
        });
      } else {
        toast({
            variant: "destructive",
            title: "Invalid QR Code",
            description: "Guest not found in the system.",
        });
        setTimeout(() => setIsScanning(true), 2000);
      }
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setIsScanning(true);
  };

  // Mock scanning for demonstration
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isScanning) {
      timeout = setTimeout(() => {
        // Simulate a scan
        handleScan('WEDU-HOUSEHOLD-1');
      }, 2500);
    }
    return () => clearTimeout(timeout);
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
                    <>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                            <Camera className="h-12 w-12 text-muted-foreground mb-4"/>
                             <p className="text-muted-foreground">Searching for QR code...</p>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-[70%] h-[70%] border-4 border-dashed border-white/50 rounded-3xl animate-pulse"/>
                        </div>
                        <div className="absolute left-0 right-0 h-1 bg-aurora-gold/80 shadow-[0_0_10px_2px_#d4af37] animate-scan" />
                    </>
                )}

                <AnimatePresence>
                {!isScanning && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex flex-col items-center justify-center bg-black/80"
                    >
                        {scannedData ? (
                            <CheckCircle2 className="h-32 w-32 text-green-400" />
                        ) : (
                            <XCircle className="h-32 w-32 text-red-500" />
                        )}
                        <p className="mt-4 text-2xl font-bold">{scannedData ? 'Scan Successful' : 'Scan Failed'}</p>
                        <p className="text-muted-foreground">{scannedData ? scannedData.name : 'Guest not found'}</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </Card>
        
        <AnimatePresence>
        {scannedData ? (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
                <BoardingPass guest={scannedData} onReset={resetScanner} />
            </motion.div>
        ) : (
            <Card className="glass-card flex items-center justify-center min-h-[400px]">
                <motion.div 
                    className="text-center text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.3 } }}
                >
                    <svg width="80" height="80" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 rounded-md text-white/50">
                        <path d="M0 0H11V11H0V0ZM2 2V9H9V2H2Z" fill="currentColor"/>
                        <path d="M4 4H7V7H4V4Z" fill="currentColor"/>
                        <path d="M22 0H33V11H22V0ZM24 2V9H31V2H24Z" fill="currentColor"/>
                        <path d="M26 4H29V7H26V4Z" fill="currentColor"/>
                        <path d="M0 22H11V33H0V22ZM2 24V31H9V24H2Z" fill="currentColor"/>
                        <path d="M4 26H7V29H4V26Z" fill="currentColor"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M31 22H33V24H31V22ZM29 24H31V26H29V24ZM24 22H26V24H24V22ZM26 24H29V26H26V24ZM31 26H33V29H31V26ZM29 29H31V31H29V29ZM26 31H29V33H26V31ZM22 29H24V31H22V29ZM24 26H26V29H24V26ZM22 24H24V26H22V24ZM15 22H17V24H15V22ZM13 24H15V26H13V24ZM17 24H20V26H17V24ZM20 26H22V29H20V26ZM17 29H20V31H17V29ZM15 31H17V33H15V31ZM13 29H15V31H13V29ZM20 22H22V24H20V22ZM13 13H15V15H13V13ZM15 15H17V17H15V15ZM17 13H20V15H17V13ZM20 15H22V17H20V15ZM13 17H15V20H13V17ZM17 20H20V22H17V20ZM15 20H17V22H15V20ZM13 0H15V2H13V0ZM17 2H20V4H17V2ZM20 0H22V2H20V0ZM15 4H17V6H15V4ZM13 6H15V8H13V6ZM17 8H20V10H17V8ZM20 6H22V8H20V6ZM15 10H17V13H15V10Z" fill="currentColor"/>
                    </svg>
                    <p>Awaiting scan... point camera at a guest's QR code.</p>
                     {!isScanning && (
                        <Button onClick={resetScanner} className="mt-4 bg-gradient-to-r from-[#d4af37] to-[#f6e7b7] text-black font-medium shadow-lg shadow-[#d4af37]/30 glossy-sweep">
                            Scan Next Guest
                        </Button>
                    )}
                </motion.div>
            </Card>
        )}
        </AnimatePresence>
      </div>
    </div>
  );
}
