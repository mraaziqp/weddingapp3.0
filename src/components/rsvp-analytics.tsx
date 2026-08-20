'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, CheckCircle, XCircle, Users, Search, X, Clock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RSVPResponse {
  id: number | string;
  guest_id: string;
  household_id?: string;
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'accepted' | 'declined' | 'pending'>('all');
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rsvp');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
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
      setLoadFailed(false);
    } catch (_err) {
      setLoadFailed(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <RefreshCw size={32} className="text-amber-500" />
        </motion.div>
      </div>
    );
  }

  if (loadFailed || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-96 text-center">
        <p className="text-white/60">Couldn&apos;t load RSVP analytics.</p>
        <Button onClick={fetchAnalytics} variant="outline" className="border-white/20">
          <RefreshCw size={16} className="mr-2" />
          Retry
        </Button>
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

  const acceptedCount = useMemo(() => analytics.responses.filter(r => r.status === 'Accepted').length, [analytics.responses]);
  const declinedCount = useMemo(() => analytics.responses.filter(r => r.status === 'Declined').length, [analytics.responses]);
  const pendingCount = useMemo(() => analytics.responses.filter(r => r.status === 'Pending').length, [analytics.responses]);

  const filteredResponses = useMemo(() => {
    return analytics.responses.filter(r => {
      // 1. Status filter
      if (statusFilter === 'accepted' && r.status !== 'Accepted') return false;
      if (statusFilter === 'declined' && r.status !== 'Declined') return false;
      if (statusFilter === 'pending' && r.status !== 'Pending') return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.guest_name.toLowerCase().includes(q);
        const matchMsg = r.message ? r.message.toLowerCase().includes(q) : false;
        const matchDiet = r.dietary_restrictions ? r.dietary_restrictions.toLowerCase().includes(q) : false;
        const matchStatus = r.status.toLowerCase().includes(q);
        return matchName || matchMsg || matchDiet || matchStatus;
      }
      return true;
    });
  }, [analytics.responses, statusFilter, searchQuery]);

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

      {/* Guest Responses & Search */}
      <Card className="glass-card">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Users className="text-[#d4af37]" size={20} /> Guest RSVP Responses &amp; Names
            </CardTitle>
            <CardDescription className="text-white/60 mt-1">
              Search and filter guests by status to see who accepted, rejected, or is pending
            </CardDescription>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input Tab */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest by name..."
                className="w-full pl-8 pr-7 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#d4af37]/60 focus:bg-white/10 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Status Tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
                statusFilter === 'all' 
                  ? "bg-[#d4af37] text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Users size={12} /> All ({analytics.total})
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
                statusFilter === 'accepted' 
                  ? "bg-emerald-500 text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-emerald-400 hover:bg-white/5"
              )}
            >
              <Check size={12} /> Accepted ({acceptedCount})
            </button>
            <button
              onClick={() => setStatusFilter('declined')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
                statusFilter === 'declined' 
                  ? "bg-rose-500 text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-rose-400 hover:bg-white/5"
              )}
            >
              <X size={12} /> Rejected ({declinedCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0",
                statusFilter === 'pending' 
                  ? "bg-amber-400 text-black shadow-md font-bold" 
                  : "text-white/60 hover:text-amber-400 hover:bg-white/5"
              )}
            >
              <Clock size={12} /> Pending ({pendingCount})
            </button>
          </div>

          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-white/50 px-1">
            <span>Showing <strong className="text-white">{filteredResponses.length}</strong> of {analytics.total} guests</span>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs text-[#d4af37] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Guest List */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredResponses.length > 0 ? (
              filteredResponses.map((rsvp, i) => (
                <motion.div
                  key={rsvp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors gap-2"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-amber-300">
                        {rsvp.guest_name.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <p className="font-semibold text-white text-sm">{rsvp.guest_name}</p>
                    </div>

                    {rsvp.message && (
                      <p className="text-xs italic text-white/80 pl-9 font-serif">
                        &quot;{rsvp.message}&quot;
                      </p>
                    )}

                    {rsvp.dietary_restrictions && (
                      <p className="text-xs text-amber-300/90 pl-9 flex items-center gap-1">
                        <span>🍽️</span> Dietary: {rsvp.dietary_restrictions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center pl-9 md:pl-0">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center gap-1",
                      rsvp.status === 'Accepted' && "bg-emerald-950/50 text-emerald-400 border-emerald-500/30",
                      rsvp.status === 'Declined' && "bg-rose-950/50 text-rose-400 border-rose-500/30",
                      rsvp.status === 'Pending' && "bg-amber-950/50 text-amber-400 border-amber-500/30"
                    )}>
                      {rsvp.status === 'Accepted' && <Check size={11} />}
                      {rsvp.status === 'Declined' && <X size={11} />}
                      {rsvp.status === 'Pending' && <Clock size={11} />}
                      {rsvp.status === 'Accepted' ? 'Accepted' : rsvp.status === 'Declined' ? 'Rejected' : 'Pending'}
                    </span>

                    <span className="text-xs text-white/40">
                      {new Date(rsvp.responded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-white/40 text-center py-8 italic text-sm">
                No matching responses found{searchQuery ? ` for "${searchQuery}"` : ''}
              </p>
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
