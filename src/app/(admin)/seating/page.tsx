import { SeatingChart } from "@/components/seating-chart";

export default function SeatingPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="font-headline text-2xl font-bold italic tracking-tight sm:text-3xl">Visual Seating Studio</h1>
        <p className="text-sm tracking-wide text-muted-foreground sm:text-base">Venue preset loaded for a 21-person layout with a bride & groom head table and stage-front flow.</p>
      </div>
      <SeatingChart />
    </div>
  );
}
