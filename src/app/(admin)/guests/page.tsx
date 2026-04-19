import { GuestLedger } from "@/components/guest-ledger";

export default function GuestsPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
       <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">The Guest Ledger</h1>
        <p className="text-muted-foreground tracking-wide">The exclusive A-List VIP manager for your big day.</p>
      </div>
      <GuestLedger />
    </div>
  );
}
