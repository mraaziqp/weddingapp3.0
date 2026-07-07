'use client';

import { fetchHouseholds } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Eye, Send, MessageSquare, CheckCircle, Clock, XCircle, Users, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Household } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { QRCodeManager } from './qr-code-manager';

interface InviteStatus {
  id: string;
  status: 'pending' | 'sent' | 'viewed' | 'responded' | 'declined';
  sentDate?: string;
  viewedDate?: string;
  respondedDate?: string;
  rsvpStatus?: 'Confirmed' | 'Pending' | 'Regret';
  dietaryRestrictions?: string;
  guestCount?: number;
  notes?: string;
}

const statusConfig = {
  pending: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Not Sent' },
  sent: { color: 'bg-blue-100 text-blue-800', icon: Send, label: 'Sent' },
  viewed: { color: 'bg-purple-100 text-purple-800', icon: Eye, label: 'Viewed' },
  responded: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Responded' },
  declined: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Declined' },
};

const containerVariants = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

export function InviteStudioPro() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, InviteStatus>>({});
  const [_selectedHousehold, _setSelectedHousehold] = useState<Household | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | InviteStatus['status']>('all');
  const { toast } = useToast();

  // Load real households and seed each as not-yet-sent — no fake demo status.
  useEffect(() => {
    fetchHouseholds()
      .then(data => {
        setHouseholds(data);
        const statuses: Record<string, InviteStatus> = {};
        data.forEach(h => {
          statuses[h.id] = {
            id: h.id,
            status: 'pending',
            rsvpStatus: h.guests[0]?.rsvpStatus,
            guestCount: h.guests.length,
          };
        });
        setInviteStatuses(statuses);
      })
      .catch(() => {
        toast({ title: 'Could not load households', variant: 'destructive' });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const handleSendInvite = (household: Household) => {
    setInviteStatuses(prev => ({
      ...prev,
      [household.id]: {
        ...prev[household.id],
        status: 'sent',
        sentDate: new Date().toLocaleDateString(),
      }
    }));
    toast({ title: '✓ Invite Sent!', description: `Invitation sent to ${household.name}` });
  };

  const filteredHouseholds = filterStatus === 'all'
    ? households
    : households.filter(h => inviteStatuses[h.id]?.status === filterStatus);

  // Stats
  const stats = [
    { label: 'Total Invites', value: households.length, icon: Users },
    { label: 'Sent', value: Object.values(inviteStatuses).filter(s => s.status !== 'pending').length, icon: Send },
    { label: 'Responded', value: Object.values(inviteStatuses).filter(s => s.status === 'responded').length, icon: CheckCircle },
    { label: 'Expected Guests', value: Object.values(inviteStatuses).reduce((sum, s) => sum + (s.guestCount || 0), 0), icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/60">
        Loading households...
      </div>
    );
  }

  if (households.length === 0) {
    return (
      <div className="text-center py-24 text-white/60">
        <Users size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">No households yet</p>
        <p className="text-sm text-white/40 mt-1">Add your first household in Guest Ledger to start generating invites.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/60 uppercase tracking-wide mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <Icon className="text-amber-500/30" size={32} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Filter Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2"
      >
        <Button
          variant={filterStatus === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterStatus('all')}
          className="bg-amber-600 hover:bg-amber-700"
        >
          All ({households.length})
        </Button>
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = Object.values(inviteStatuses).filter(s => s.status === status).length;
          return (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              onClick={() => setFilterStatus(status as InviteStatus['status'])}
              className={filterStatus === status ? 'bg-amber-600' : ''}
            >
              {config.label} ({count})
            </Button>
          );
        })}
      </motion.div>

      {/* Invite Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredHouseholds.map((household) => {
          const status = inviteStatuses[household.id];
          const StatusIcon = statusConfig[status?.status || 'pending'].icon;
          const statusColor = statusConfig[status?.status || 'pending'].color;

          return (
            <motion.div key={household.id} variants={itemVariants}>
              <Card className="glass-card h-full flex flex-col hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{household.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {household.guests.length} guests
                      </CardDescription>
                    </div>
                    <Badge className={statusColor}>
                      <StatusIcon size={14} className="mr-1" />
                      {statusConfig[status?.status || 'pending'].label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Guest Preview */}
                  <div className="bg-white/5 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-white/70 uppercase">Guests:</p>
                    {household.guests.slice(0, 2).map((g, i) => (
                      <p key={i} className="text-sm text-white/80">
                        • {g.firstName} {g.lastName}
                      </p>
                    ))}
                    {household.guests.length > 2 && (
                      <p className="text-xs text-white/60">
                        +{household.guests.length - 2} more
                      </p>
                    )}
                  </div>

                  {/* RSVP Status */}
                  {status?.rsvpStatus && (
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-xs text-white/70">RSVP Status:</span>
                      <Badge variant="outline" className={
                        status.rsvpStatus === 'Confirmed' ? 'bg-green-500/20 text-green-400' :
                        status.rsvpStatus === 'Regret' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {status.rsvpStatus}
                      </Badge>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    {status?.status === 'pending' ? (
                      <Button
                        onClick={() => handleSendInvite(household)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Send size={16} className="mr-2" />
                        Send Invite
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => handleSendInvite(household)}
                        className="w-full"
                      >
                        <Zap size={16} className="mr-2" />
                        Resend Invite
                      </Button>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <FileText size={16} className="mr-2" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-card max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{household.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <h4 className="font-semibold text-white mb-2">Guests ({household.guests.length})</h4>
                            <div className="space-y-1">
                              {household.guests.map((g, i) => (
                                <p key={i} className="text-sm text-white/80">
                                  • {g.firstName} {g.lastName}
                                </p>
                              ))}
                            </div>
                          </div>

                          {status?.rsvpStatus && (
                            <div className="p-3 bg-white/5 rounded-lg">
                              <p className="text-xs text-white/60 mb-1">RSVP Status</p>
                              <p className="font-semibold text-white">{status.rsvpStatus}</p>
                            </div>
                          )}

                          {status?.sentDate && (
                            <div className="p-3 bg-white/5 rounded-lg">
                              <p className="text-xs text-white/60 mb-1">Sent Date</p>
                              <p className="font-semibold text-white">{status.sentDate}</p>
                            </div>
                          )}

                          <div className="p-3 bg-white/5 rounded-lg">
                            <p className="text-xs text-white/60 mb-2">Quick Actions</p>
                            <div className="space-y-2">
                              <Button className="w-full" size="sm" variant="outline">
                                <MessageSquare size={14} className="mr-2" />
                                Add Note
                              </Button>
                              <Button className="w-full" size="sm" variant="outline">
                                <Share2 size={14} className="mr-2" />
                                Share Again
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* QR Code Manager */}
      {households.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <QRCodeManager households={households} />
        </motion.div>
      )}

      {/* Empty State */}
      {filteredHouseholds.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-white/60"
        >
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No invites found with this filter</p>
        </motion.div>
      )}
    </div>
  );
}
