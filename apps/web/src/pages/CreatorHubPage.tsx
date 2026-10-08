import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { CreatorDashboardData } from '../types';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CreatorHubPage: React.FC = () => {
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading || !data) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Aggregating Creator Metrics & Qualified Events...</p>
      </div>
    );
  }

  const qualificationRate = data.total_downloads > 0
    ? Math.round((data.qualified_downloads / data.total_downloads) * 100)
    : 100;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-rage-accent" />
            <span>Creator Monetization Hub</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time qualified traffic validation, RPM yields, and revenue splits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/wallet"
            className="px-4 py-2 bg-dark-card border border-dark-border text-gray-200 hover:border-rage-accent text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <span>Open Wallet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-dark-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Earnings</div>
          <div className="text-3xl font-black text-emerald-400 font-mono">₹{data.total_revenue.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">₹{data.pending_revenue.toFixed(2)} in pending review</div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-dark-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Qualified Downloads</div>
          <div className="text-3xl font-black text-white font-mono">{data.qualified_downloads.toLocaleString()}</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{qualificationRate}% Traffic Quality Score</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-dark-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Platform RPM (eCPM)</div>
          <div className="text-3xl font-black text-rage-400 font-mono">₹{data.rpm.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Estimated yield per 1,000 qualified events</div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-dark-border">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Qualified Video Views</div>
          <div className="text-3xl font-black text-white font-mono">{data.qualified_views.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Min. 10 seconds continuous watch</div>
        </div>
      </div>

      {/* Visual Activity & Daily Trends */}
      <div className="glass-panel p-6 rounded-3xl border border-dark-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-white font-display">Daily Qualified Traffic & Revenue</h2>
          <span className="text-xs text-gray-400 font-mono">Past 7 Days</span>
        </div>

        <div className="grid grid-cols-7 gap-2 h-44 items-end pt-4 pb-2 border-b border-dark-border">
          {data.daily_stats.map((stat, i) => {
            const heightPercent = Math.min(100, Math.max(15, (stat.revenue / 20) * 100));
            return (
              <div key={i} className="flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] text-gray-400 mb-1 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  ₹{stat.revenue}
                </div>
                <div
                  className="w-full max-w-[36px] bg-gradient-to-t from-red-950 via-rage-accent to-rose-400 rounded-t-lg transition-all group-hover:brightness-125"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[11px] text-gray-400 mt-2 font-mono">{stat.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Files & Recent Ledger Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Files */}
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Top Performing Files</span>
          </h2>

          <div className="space-y-3">
            {data.top_files.map((file, idx) => (
              <div key={file.id} className="p-3.5 rounded-2xl bg-dark-bg/60 border border-dark-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-dark-card border border-dark-border flex items-center justify-center font-mono font-bold text-xs text-gray-400">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-xs text-white truncate max-w-xs">{file.name}</div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.visibility}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white font-mono">{file.downloads} DLs</div>
                  <div className="text-[10px] text-emerald-400 font-medium">{file.views} Views</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Ledger Credits */}
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <Clock className="w-5 h-5 text-rage-accent" />
            <span>Recent Ledger Credits</span>
          </h2>

          <div className="space-y-2.5">
            {data.recent_activity.map((act) => (
              <div key={act.id} className="p-3 rounded-2xl bg-dark-bg/60 border border-dark-border flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-white">{act.description}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{act.created_at}</div>
                </div>
                <div className={`font-mono font-bold ${act.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {act.amount >= 0 ? `+₹${act.amount.toFixed(2)}` : `-₹${Math.abs(act.amount).toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
