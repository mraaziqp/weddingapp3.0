import { InvitationEditor } from "@/components/invitation-editor";

export default function InvitationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold italic tracking-tight">🎫 Invitation Editor</h1>
        <p className="text-muted-foreground tracking-wide">Design and customize your beautiful wedding invitation</p>
      </div>
      <InvitationEditor />
    </div>
  );
}
