import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

export function PlaceholderPage({ title, description, icon, content }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card className="glass-card flex flex-col items-center justify-center text-center h-96 border-dashed transition-transform hover:-translate-y-1">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {icon}
          </div>
          <CardTitle className="mt-4">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground max-w-md">{content}</p>
        </CardContent>
      </Card>
    </div>
  );
}
