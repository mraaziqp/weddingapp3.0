import { InviteStudio } from "@/components/invite-studio";

export default function InvitesPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">Invite & QR Studio</h1>
        <p className="text-muted-foreground tracking-wide">Generate and share personalized Gold-Foil invitations.</p>
      </div>
      <InviteStudio />
    </div>
  );
}
