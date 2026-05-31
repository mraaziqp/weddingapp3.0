import { SeatingChart } from "@/components/seating-chart";

export default function SeatingPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-10rem)] flex flex-col">
       <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">Visual Seating Studio</h1>
        <p className="text-muted-foreground tracking-wide">Venue preset loaded for a 21-person layout with a bride & groom head table and stage-front flow.</p>
      </div>
      <SeatingChart />
    </div>
  );
}
