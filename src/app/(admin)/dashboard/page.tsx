import { AnalyticsDashboard } from "@/components/analytics-dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">Our Wedding Command</h1>
        <p className="text-muted-foreground tracking-wide">Salaam, Abduraziq. Here is the status of the big day.</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
