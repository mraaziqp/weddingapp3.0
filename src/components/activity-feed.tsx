'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchRecentConfirmedGuests } from '@/lib/data';
import { Camera, UserCheck, Clock } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'rsvp' | 'photo' | 'checkin';
  message: string;
  timestamp: Date;
  icon: React.ReactNode;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadActivities = async () => {
      try {
        // Recent photos now come from Google Drive via /api/media. `all` spans
        // the Live Wall and the private Vault, which is what the couple wants
        // on their own dashboard — the route admin-gates that for us.
        const photoRes = await fetch('/api/media?visibility=all&limit=3', { cache: 'no-store' });
        const photos: { id: string; createdAt: string }[] = photoRes.ok
          ? (await photoRes.json()).items ?? []
          : [];

        // Fetch recent RSVPs
        const guests = await fetchRecentConfirmedGuests(3);

        const items: ActivityItem[] = [];

        guests.forEach(guest => {
          items.push({
            id: `rsvp-${guest.id}`,
            type: 'rsvp',
            message: `${guest.firstName} confirmed attendance`,
            timestamp: guest.updatedAt ? new Date(guest.updatedAt) : new Date(0),
            icon: <UserCheck size={16} className="text-green-400" />,
          });
        });

        photos?.forEach(photo => {
          items.push({
            id: `photo-${photo.id}`,
            type: 'photo',
            message: 'New photo uploaded to gallery',
            timestamp: new Date(photo.createdAt),
            icon: <Camera size={16} className="text-amber-400" />,
          });
        });

        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        if (!cancelled) setActivities(items.slice(0, 5));
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadActivities();

    // Drive has no change subscription to replace the old Supabase realtime
    // channel on the media table, so the feed polls instead. 30s is plenty for
    // a dashboard panel and costs one Drive list call per interval.
    const timer = setInterval(loadActivities, 30_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/40 text-sm">Loading activities...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl">
      <CardHeader>
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-2">
          <Clock size={14} /> Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence>
            {activities.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">No recent activity</p>
            ) : (
              activities.map(activity => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="mt-0.5 flex-shrink-0">{activity.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">{activity.message}</p>
                    <p className="text-xs text-white/30 mt-1">
                      {activity.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
