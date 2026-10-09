import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Share2,
  Copy,
  Gift,
  Users,
  Check,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { copyToClipboard } from '../utils/clipboard';

export const ReferralsPage: React.FC = () => {
  const [stats, setStats] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await api.getReferralStats();
        setStats(res);
      } catch (e) {
        console.error('Error fetching referrals:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  const copyLink = async () => {
    if (!stats) return;
    const fullLink = `${window.location.origin}${stats.referral_link}`;
    const ok = await copyToClipboard(fullLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs font-mono">Syncing Creator Ambassador Network...</p>
      </div>
    );
  }

  const referralCount = stats.total_referrals || 0;
  const nextMilestone = referralCount < 5 ? 5 : referralCount < 20 ? 20 : 50;
  const progressPercent = Math.min(100, Math.round((referralCount / nextMilestone) * 100));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rage-accent/10 border border-rage-accent/20 text-rage-accent text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <Gift className="w-3 h-3" />
              <span>Affiliate Ambassador Rewards</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
            <Share2 className="w-7 h-7 text-rage-accent" />
            <span>Referral Program</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Invite fellow streamers and developers. Earn ₹50 credited instantly to your wallet for each creator who uploads their first verified file.
          </p>
        </div>

        <Link
          to="/wallet"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
        >
          <span>View In Wallet</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Referral Link Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/15 relative overflow-hidden shadow-2xl bg-gradient-to-br from-red-950/20 via-black/40 to-dark-card space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rage-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-rage-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Exclusive Referral Code
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.referral_code}
            </div>
            <p className="text-xs text-gray-400">
              Anyone registering with your link receives verified creator access immediately.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="px-4 py-3 rounded-2xl bg-black/60 border border-white/15 text-xs font-mono text-gray-300 truncate max-w-sm shadow-inner">
              {window.location.origin}{stats.referral_link}
            </div>
            <button
              onClick={copyLink}
              className="px-6 py-3 bg-rage-accent hover:bg-rage-600 text-white font-extrabold text-xs rounded-2xl transition-all shadow-rage-glow hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 font-medium flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Ambassador Milestone ({referralCount}/{nextMilestone} Creators)</span>
            </span>
            <span className="font-mono text-white font-bold">{progressPercent}% Unlocked</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-red-600 via-rage-accent to-rose-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Referred Creators</span>
            <div className="w-8 h-8 rounded-xl bg-rage-accent/15 border border-rage-accent/30 text-rage-accent flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            {stats.total_referrals}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Directly attributed signups
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 relative overflow-hidden group shadow-lg">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">Total Bonus Credited</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
            ₹{stats.total_rewards_earned.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Credited into available ledger balance
          </div>
        </div>
      </div>

      {/* Referred Users Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-display">Referred Network Roster</h2>
          <span className="text-xs text-gray-400 font-mono">{stats.referred_users.length} Creators</span>
        </div>

        {stats.referred_users.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No creators registered under your code yet. Share your referral code above to start unlocking ₹50 bonuses!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Enrollment Date</th>
                  <th className="pb-3">Creator Identity</th>
                  <th className="pb-3">Verification Status</th>
                  <th className="pb-3 text-right">Credited Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {stats.referred_users.map((r: any) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-gray-400 text-[11px]">{r.date}</td>
                    <td className="py-3 font-semibold text-white">{r.referred_user_name}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'REWARDED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40' :
                        r.status === 'QUALIFIED' ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40' :
                        'bg-white/5 border border-white/10 text-gray-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{r.reward_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
