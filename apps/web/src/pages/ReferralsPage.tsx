import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Share2, Copy, Gift, Users } from 'lucide-react';

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

  const copyLink = () => {
    if (!stats) return;
    const fullLink = `${window.location.origin}${stats.referral_link}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading || !stats) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Loading Referral Network...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
          <Share2 className="w-6 h-6 text-rage-accent" />
          <span>Referral Program</span>
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Invite fellow creators to RAGE Cloud. Earn ₹50 credited directly to your wallet for each creator who uploads their first verified file.
        </p>
      </div>

      {/* Referral Link Showcase Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-dark-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-rage-400 uppercase tracking-wider">Your Exclusive Referral Code</div>
            <div className="text-3xl font-black text-white font-mono mt-1">{stats.referral_code}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-xs font-mono text-gray-300 truncate max-w-xs">
              {window.location.origin}{stats.referral_link}
            </span>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl transition-all shadow-rage-glow-sm flex items-center gap-1.5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-dark-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold">Total Referred Creators</span>
            <Users className="w-5 h-5 text-rage-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{stats.total_referrals}</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-dark-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold">Total Bonus Credited</span>
            <Gift className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">₹{stats.total_rewards_earned.toFixed(2)}</div>
        </div>
      </div>

      {/* Referred Users Table */}
      <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
        <h2 className="text-base font-bold text-white font-display">Referred Network Roster</h2>

        {stats.referred_users.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-xs">
            No creators registered under your code yet. Share your link to start earning rewards!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Creator Name</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right">Reward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {stats.referred_users.map((r: any) => (
                  <tr key={r.id}>
                    <td className="py-2.5 font-mono text-gray-400">{r.date}</td>
                    <td className="py-2.5 font-medium text-white">{r.referred_user_name}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'REWARDED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' :
                        r.status === 'QUALIFIED' ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
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
