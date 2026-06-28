import { RSVPAnalytics } from '@/components/rsvp-analytics';

export const metadata = {
  title: 'RSVP Analytics',
  description: 'Real-time guest response analytics and tracking',
};

export default function RSVPAnalyticsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📊 RSVP Analytics Dashboard</h1>
          <p className="text-white/60">Monitor and manage all guest responses in real time</p>
        </div>

        <RSVPAnalytics />
      </div>
    </main>
  );
}
