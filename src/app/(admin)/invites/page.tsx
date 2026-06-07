import { InviteStudioPro } from "@/components/invite-studio-pro";

export default function InvitesPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">🎫 Invite Management Pro</h1>
        <p className="text-muted-foreground tracking-wide">Professional invite tracking, RSVP management & delivery analytics with QR code generation.</p>
      </div>
      <InviteStudioPro />
    </div>
  );
}
