import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CreatorDashboardData } from '../types';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Zap,
  BarChart3,
  DollarSign,
  Share2,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreatorHubPage: React.FC = () => {
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.getCreatorDashboard();
        setData(res);
      } catch (e) {
        console.error('Error fetching creator stats:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const copyFileLink = (file: any) => {
    const url = `${window.location.origin}/d/${file.short_code || file.id}`;
    navigator.clipboard.writeText(url);
    setCopiedFileId(file.id);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  if (isLoading || !data) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs font-mono">Aggregating Creator Yields & Verified Telemetry...</p>
      </div>
    );
  }

  const qualificationRate = data.total_downloads > 0
    ? Math.round((data.qualified_downloads / data.total_downloads) * 100)
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Real-Time Yield Telemetry</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-rage-accent" />
            <span>Creator Monetization Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Live validation tracking, CPM / RPM yields, qualified impression analytics, and split allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/wallet"
            className="px-4 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-rage-glow-sm transition-all"
          >
            <span>Open Wallet</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            to="/upload"
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
          >
            + Upload Asset
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3 text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Earnings</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            ₹{data.total_revenue.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono flex items-center gap-1">
            <span>₹{data.pending_revenue.toFixed(2)} in validation queue</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3 text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Qualified Downloads</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {data.qualified_downloads.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{qualificationRate}% Traffic Integrity Score</span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-rage-accent/40 transition-all">
          <div className="flex items-center justify-between mb-3 text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Platform RPM (eCPM)</span>
            <div className="w-8 h-8 rounded-xl bg-rage-accent/10 border border-rage-accent/20 text-rage-accent flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rage-400 font-mono tracking-tight">
            ₹{data.rpm.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Estimated gross per 1,000 verified requests
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between mb-3 text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Qualified Video Views</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight">
            {data.qualified_views.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            &gt; 10s continuous verified playback
          </div>
        </div>
      </div>

      {/* Visual Activity & Daily Trends */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">Daily Revenue & Traffic Trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automated 24h audit interval yields across past 7 days</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 font-mono self-start sm:self-auto">
            7 Days In Review
          </span>
        </div>

        <div className="grid grid-cols-7 gap-3 h-52 items-end pt-8 pb-3 border-b border-white/10">
          {data.daily_stats.map((stat, i) => {
            const heightPercent = Math.min(100, Math.max(16, (stat.revenue / 25) * 100));
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end group cursor-pointer">
                <div className="text-[11px] text-emerald-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono font-bold">
                  ₹{stat.revenue}
                </div>
                <div
                  className="w-full max-w-[42px] bg-gradient-to-t from-red-950 via-rage-accent to-rose-400 rounded-t-xl transition-all duration-300 group-hover:brightness-125 group-hover:scale-y-105 origin-bottom shadow-rage-glow-sm"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[11px] text-gray-400 mt-2 font-mono font-medium">{stat.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Files & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Files */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Top Earning Digital Assets</span>
            </h2>
            <Link to="/files" className="text-xs text-rage-400 hover:text-rage-300 font-medium">
              View All Files &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {data.top_files.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No uploads yet. Upload files to start tracking revenue.
              </div>
            ) : (
              data.top_files.map((file, idx) => (
                <div
                  key={file.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`w-7 h-7 rounded-xl border flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      idx === 0 ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' :
                      idx === 1 ? 'bg-slate-300/20 border-slate-300/40 text-slate-200' :
                      idx === 2 ? 'bg-amber-700/20 border-amber-700/40 text-amber-500' :
                      'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{file.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.visibility}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">{file.downloads} DLs</div>
                      <div className="text-[10px] text-emerald-400 font-medium">{file.views} Views</div>
                    </div>
                    <button
                      onClick={() => copyFileLink(file)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Copy Public Link"
                    >
                      {copiedFileId === file.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Ledger Credits */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-5 h-5 text-rage-accent" />
              <span>Real-Time Ledger Credits</span>
            </h2>
            <Link to="/wallet" className="text-xs text-rage-400 hover:text-rage-300 font-medium">
              Open Ledger &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {data.recent_activity.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                No recent activity recorded.
              </div>
            ) : (
              data.recent_activity.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-white truncate">{act.description}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{act.created_at}</div>
                  </div>
                  <div className={`font-mono font-bold text-xs shrink-0 ${act.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {act.amount >= 0 ? `+₹${act.amount.toFixed(2)}` : `-₹${Math.abs(act.amount).toFixed(2)}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
