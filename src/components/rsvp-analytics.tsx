'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, CheckCircle, XCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RSVPResponse {
  id: number;
  guest_id: string;
  household_id: string;
  guest_name: string;
  status: string;
  dietary_restrictions: string | null;
  message: string | null;
  responded_at: string;
}

interface Analytics {
  total: number;
  accepted: number;
  declined: number;
  pending: number;
  acceptanceRate: number;
  withDietary: number;
  responses: RSVPResponse[];
}

export function RSVPAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rsvp');
      const data = await res.json();
      const responses = data.responses || [];

      const accepted = responses.filter((r: RSVPResponse) => r.status === 'Accepted').length;
      const declined = responses.filter((r: RSVPResponse) => r.status === 'Declined').length;
      const withDietary = responses.filter((r: RSVPResponse) => r.dietary_restrictions).length;

      setAnalytics({
        total: responses.length,
        accepted,
        declined,
        pending: Math.max(0, (responses.length - accepted - declined)),
        acceptanceRate: responses.length > 0 ? Math.round((accepted / responses.length) * 100) : 0,
        withDietary,
        responses,
      });
    } catch (_err) {
      toast({ title: 'Failed to load analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Intentionally mount-only: analytics load once, refresh happens via the UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (!analytics || analytics.responses.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    const csv = [
      ['Guest Name', 'Status', 'Dietary Restrictions', 'Message', 'Date Responded'].join(','),
      ...analytics.responses.map(r =>
        [
          `"${r.guest_name}"`,
          r.status,
          `"${r.dietary_restrictions || ''}"`,
          `"${r.message || ''}"`,
          new Date(r.responded_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rsvp-responses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: 'Exported successfully!', description: 'RSVP data downloaded' });
  };

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <RefreshCw size={32} className="text-amber-500" />
        </motion.div>
      </div>
    );
  }

  const chartData = [
    { name: 'Accepted', value: analytics.accepted, fill: '#10b981' },
    { name: 'Declined', value: analytics.declined, fill: '#ef4444' },
    { name: 'Pending', value: analytics.pending, fill: '#8b5cf6' },
  ];

  const statCards = [
    { label: 'Total RSVPs', value: analytics.total, icon: Users, color: 'text-blue-500' },
    { label: 'Accepted', value: analytics.accepted, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Declined', value: analytics.declined, icon: XCircle, color: 'text-red-500' },
    { label: 'Dietary Needs', value: analytics.withDietary, icon: Users, color: 'text-amber-500' },
  ];

  const recentRSVPs = [...analytics.responses].slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">📊 RSVP Analytics</h2>
          <p className="text-white/60">Real-time guest response tracking</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAnalytics}
            variant="outline"
            size="sm"
            className="border-white/20"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <Download size={16} className="mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-card border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wide mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                    </div>
                    <Icon className={`${stat.color}/30`} size={32} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Acceptance Rate */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-xl p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Acceptance Rate</h3>
            <p className="text-white/70">
              {analytics.total} total responses • {analytics.accepted} confirmed guests
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              {analytics.acceptanceRate}%
            </div>
            <p className="text-white/60 text-sm mt-1">of respondents accepted</p>
          </div>
        </div>
        <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analytics.acceptanceRate}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
          />
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>RSVP Status Distribution</CardTitle>
            <CardDescription>Breakdown by response status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Response Summary</CardTitle>
            <CardDescription>Guest responses at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" />
                <YAxis stroke="rgba(255,255,255,0.6)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill="#8884d8" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent RSVPs */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
          <CardDescription>Latest guest RSVPs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRSVPs.length > 0 ? (
              recentRSVPs.map((rsvp, i) => (
                <motion.div
                  key={rsvp.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-white">{rsvp.guest_name}</p>
                    {rsvp.dietary_restrictions && (
                      <p className="text-xs text-white/60">🍽️ {rsvp.dietary_restrictions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={
                        rsvp.status === 'Accepted'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }
                    >
                      {rsvp.status}
                    </Badge>
                    <span className="text-xs text-white/60">
                      {new Date(rsvp.responded_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-white/60 text-center py-8">No responses yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dietary Restrictions Summary */}
      {analytics.withDietary > 0 && (
        <Card className="glass-card border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🍽️</span> Dietary Restrictions
            </CardTitle>
            <CardDescription>
              {analytics.withDietary} guest(s) have dietary requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.responses
                .filter(r => r.dietary_restrictions)
                .map((rsvp, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded">
                    <span className="font-semibold text-amber-400 min-w-[150px]">{rsvp.guest_name}</span>
                    <span className="text-white/70">{rsvp.dietary_restrictions}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
