import { FamilyGuestIntake } from '@/components/family-guest-intake';

export default async function FamilyGuestPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const brideKey = process.env.FAMILY_ACCESS_KEY_BRIDE;
  const groomKey = process.env.FAMILY_ACCESS_KEY_GROOM;

  let side: 'bride' | 'groom' | null = null;
  if (brideKey && key === brideKey) side = 'bride';
  else if (groomKey && key === groomKey) side = 'groom';

  if (!side) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0f0c] p-8 text-center text-white">
        <div className="space-y-3">
          <p className="font-headline text-3xl italic text-[#d4af37]">Link not recognized</p>
          <p className="text-sm text-white/50">Please double-check the link you were given, or ask Razia or Abduraziq for a fresh one.</p>
        </div>
      </div>
    );
  }

  return <FamilyGuestIntake side={side} />;
}
