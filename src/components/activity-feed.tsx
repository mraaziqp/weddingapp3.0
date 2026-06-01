'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Camera, Heart, UserCheck, Clock } from 'lucide-react';

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
    const loadInitialActivities = async () => {
      try {
        // Fetch recent media (photos)
        const { data: photos } = await supabase
          .from('media')
          .select('id, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        // Fetch recent RSVPs
        const { data: guests } = await supabase
          .from('guests')
          .select('id, first_name, rsvp_status, updated_at')
          .eq('rsvp_status', 'Confirmed')
          .order('updated_at', { ascending: false })
          .limit(3);

        const items: ActivityItem[] = [];

        guests?.forEach(guest => {
          items.push({
            id: `rsvp-${guest.id}`,
            type: 'rsvp',
            message: `${guest.first_name} confirmed attendance`,
            timestamp: new Date(guest.updated_at),
            icon: <UserCheck size={16} className="text-green-400" />,
          });
        });

        photos?.forEach(photo => {
          items.push({
            id: `photo-${photo.id}`,
            type: 'photo',
            message: 'New photo uploaded to gallery',
            timestamp: new Date(photo.created_at),
            icon: <Camera size={16} className="text-amber-400" />,
          });
        });

        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(items.slice(0, 5));
      } catch (error) {
        console.error('Failed to load activities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialActivities();

    // Subscribe to real-time updates
    const mediaSubscription = supabase
      .channel('media-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'media' },
        payload => {
          const newActivity: ActivityItem = {
            id: `photo-${payload.new.id}`,
            type: 'photo',
            message: 'New photo uploaded to gallery',
            timestamp: new Date(),
            icon: <Camera size={16} className="text-amber-400" />,
          };
          setActivities(prev => [newActivity, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      mediaSubscription.unsubscribe();
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
