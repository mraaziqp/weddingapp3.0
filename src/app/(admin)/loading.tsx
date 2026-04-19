import { LuxuryLoader } from '@/components/luxury-loader';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LuxuryLoader label="Preparing your dashboard..." size="lg" />
    </div>
  );
}
