'use client';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Users, X } from "lucide-react";
import { motion } from "framer-motion";

interface BoardingPassProps {
  guest: {
    name: string;
    tableNumber: number;
    plusOne: string | null;
    qrCodeValue: string;
  };
  onReset: () => void;
}

export function BoardingPass({ guest, onReset }: BoardingPassProps) {
  return (
    <Card className="glass-card relative overflow-hidden bg-gradient-to-br from-primary/20 via-background/10 to-accent/20 !p-0">
      <CardHeader className="flex-row items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2 font-headline text-lg" style={{ color: 'var(--aurora-soft-gold)'}}>
          <Gem className="h-6 w-6 text-accent" />
          Wedu 3.0 Fast Pass
        </div>
         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={onReset}>
            <X />
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Guest</p>
              <p className="text-3xl font-headline italic text-aurora-soft-gold">{guest.name}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Table</p>
                <p className="text-5xl font-bold font-headline text-white">{guest.tableNumber}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Party</p>
                <div className="flex items-center gap-2 mt-1">
                    <Users className="h-6 w-6 text-accent" />
                    <p className="text-xl font-semibold">{guest.plusOne ? '+1' : '+0'}</p>
                </div>
              </div>
            </div>
             {guest.plusOne && (
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Companion</p>
                    <p className="text-lg font-medium">{guest.plusOne}</p>
                </div>
            )}
          </div>
          <div className="col-span-1 flex flex-col items-center justify-center space-y-2 border-l-2 border-dashed border-white/20 pl-6">
            <div className="bg-white p-2 rounded-lg">
                <svg width="80" height="80" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-md">
                    <path d="M0 0H11V11H0V0ZM2 2V9H9V2H2Z" fill="black"/>
                    <path d="M4 4H7V7H4V4Z" fill="black"/>
                    <path d="M22 0H33V11H22V0ZM24 2V9H31V2H24Z" fill="black"/>
                    <path d="M26 4H29V7H26V4Z" fill="black"/>
                    <path d="M0 22H11V33H0V22ZM2 24V31H9V24H2Z" fill="black"/>
                    <path d="M4 26H7V29H4V26Z" fill="black"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M31 22H33V24H31V22ZM29 24H31V26H29V24ZM24 22H26V24H24V22ZM26 24H29V26H26V24ZM31 26H33V29H31V26ZM29 29H31V31H29V29ZM26 31H29V33H26V31ZM22 29H24V31H22V29ZM24 26H26V29H24V26ZM22 24H24V26H22V24ZM15 22H17V24H15V22ZM13 24H15V26H13V24ZM17 24H20V26H17V24ZM20 26H22V29H20V26ZM17 29H20V31H17V29ZM15 31H17V33H15V31ZM13 29H15V31H13V29ZM20 22H22V24H20V22ZM13 13H15V15H13V13ZM15 15H17V17H15V15ZM17 13H20V15H17V13ZM20 15H22V17H20V15ZM13 17H15V20H13V17ZM17 20H20V22H17V20ZM15 20H17V22H15V20ZM13 0H15V2H13V0ZM17 2H20V4H17V2ZM20 0H22V2H20V0ZM15 4H17V6H15V4ZM13 6H15V8H13V6ZM17 8H20V10H17V8ZM20 6H22V8H20V6ZM15 10H17V13H15V10Z" fill="black"/>
                </svg>
            </div>
            <p className="text-xs text-muted-foreground text-center font-mono break-all pt-2">{guest.qrCodeValue}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 border-t border-white/10 mt-2">
        <Button className="w-full glossy-sweep bg-black text-white hover:bg-gray-800">
            Add to Apple Wallet
        </Button>
      </CardFooter>
    </Card>
  );
}
