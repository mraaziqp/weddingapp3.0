import { AiSecretaryForm } from "@/components/ai-secretary-form";

export default function AiSecretaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">AI Bride's Secretary</h1>
        <p className="text-muted-foreground">Automatically draft personalized WhatsApp messages for your guests.</p>
      </div>
      <AiSecretaryForm />
    </div>
  );
}
