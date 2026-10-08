import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { AdminStatsData, WithdrawalRequest } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Save,
  Check,
  Users,
  CreditCard,
  History,
  HardDrive,
  BarChart3,
  DollarSign
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'withdrawals' | 'fraud' | 'settings' | 'audit'>('overview');
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [sData, uData, wData, fData, aData, setts] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminWithdrawals(),
        api.getFraudAlerts(),
        api.getAuditLogs(),
        api.getAdminSettings()
      ]);
      setStats(sData);
      setUsers(uData);
      setWithdrawals(wData);
      setFraudAlerts(fData);
      setAuditLogs(aData);
      setSettingsForm(setts);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleWithdrawalAction = async (id: string, action: 'APPROVE' | 'REJECT' | 'COMPLETE') => {
    const note = prompt(`Enter note for withdrawal ${action}:`, `${action} processed by Super Admin`) || undefined;
    try {
      await api.actionWithdrawal(id, action, note);
      loadAllAdminData();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    try {
      await api.updateUserStatus(user.id, { is_active: !user.is_active });
      loadAllAdminData();
    } catch (err: any) {
      alert(`User update failed: ${err.message}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settingsForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs font-mono">Authenticating Super Admin Governance Deck...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[11px] font-bold uppercase tracking-wider mb-2 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Root Administrator Deck</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            System Operations & Governance
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Global yield margins, double-entry financial approvals, fraud telemetry, and system rule controls.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 p-1.5 bg-black/60 border border-white/10 rounded-2xl">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'withdrawals', label: `Payouts (${stats.pending_withdrawals_count})`, icon: CreditCard },
            { id: 'fraud', label: `Fraud (${stats.fraud_alerts_count})`, icon: AlertTriangle },
            { id: 'settings', label: 'Rules', icon: Sliders },
            { id: 'audit', label: 'Audit', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-rage-accent text-white shadow-rage-glow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono mt-1">₹{stats.platform_revenue.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-2 font-mono">Platform ad & paid margin</div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 relative overflow-hidden group shadow-lg">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Creator Payouts</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">₹{stats.creator_payouts_distributed.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-2 font-mono">Credited across active wallets</div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Ingested Storage</span>
                <HardDrive className="w-4 h-4 text-rage-accent" />
              </div>
              <div className="text-3xl font-black text-white font-mono mt-1">
                {(stats.total_storage_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
              <div className="text-xs text-gray-500 mt-2 font-mono">{stats.total_files} active cloud objects</div>
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider">Verified Requests</span>
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono mt-1">{stats.qualified_downloads} DLs</div>
              <div className="text-xs text-emerald-400 mt-2 font-semibold font-mono">
                Out of {stats.total_downloads} raw visits
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">User Directory & Status</h2>
            <span className="text-xs text-gray-400 font-mono">{users.length} Registered Accounts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">User & Contact</th>
                  <th className="pb-3">Platform Role</th>
                  <th className="pb-3">Referral Code</th>
                  <th className="pb-3">Account State</th>
                  <th className="pb-3 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3">
                      <div className="font-bold text-white">{u.full_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-gray-300">{u.referral_code}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40' : 'bg-red-950/60 text-red-400 border border-red-500/40'
                      }`}>
                        {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-colors"
                      >
                        {u.is_active ? 'Suspend Account' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WITHDRAWALS APPROVAL QUEUE */}
      {activeTab === 'withdrawals' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">Payout Authorization Queue</h2>
            <span className="text-xs text-gray-400 font-mono">{withdrawals.length} Total Requests</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Destination Details</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-gray-400 text-[11px]">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3 font-mono font-bold text-white text-sm">₹{w.amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono">
                        {w.payout_method}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] max-w-xs truncate text-gray-300">{w.payout_details}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10">
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {w.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                            className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-xl hover:bg-emerald-900 transition-colors font-bold text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'REJECT')}
                            className="px-3 py-1 bg-red-950/60 border border-red-500/40 text-red-400 rounded-xl hover:bg-red-900 transition-colors font-bold text-xs"
                          >
                            Reject (Refund)
                          </button>
                        </div>
                      )}
                      {w.status === 'APPROVED' && (
                        <button
                          onClick={() => handleWithdrawalAction(w.id, 'COMPLETE')}
                          className="px-3.5 py-1 bg-blue-950/60 border border-blue-500/40 text-blue-400 rounded-xl hover:bg-blue-900 transition-colors font-bold text-xs"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FRAUD ALERTS */}
      {activeTab === 'fraud' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Anti-Bot & Abuse Telemetry</span>
            </h2>
            <span className="text-xs text-gray-400 font-mono">{fraudAlerts.length} Flagged Events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Client Hash</th>
                  <th className="pb-3">Risk Assessment</th>
                  <th className="pb-3">Anomaly Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {fraudAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-500">
                      No high-risk fraud anomalies flagged. Platform traffic integrity is pristine.
                    </td>
                  </tr>
                ) : (
                  fraudAlerts.map((f) => (
                    <tr key={f.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-gray-400 text-[11px]">{new Date(f.flagged_at).toLocaleString()}</td>
                      <td className="py-3 font-mono text-gray-300">{f.ip_hash}</td>
                      <td className="py-3 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          f.risk_score >= 60 ? 'bg-red-950/60 text-red-400 border border-red-500/40' : 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                        }`}>
                          Risk Score: {f.risk_score}/100
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">{f.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: MONETIZATION RULES */}
      {activeTab === 'settings' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 max-w-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                <Sliders className="w-5 h-5 text-rage-accent" />
                <span>Monetization & Yield Parameters</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure system revenue shares, payout minimums, and bonuses.</p>
            </div>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                <span>Rules Updated!</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Creator Revenue Share Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={settingsForm.creator_revenue_percent || '60'}
                onChange={(e) => setSettingsForm({ ...settingsForm, creator_revenue_percent: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-rage-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Platform Retained Share Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={settingsForm.platform_revenue_percent || '40'}
                onChange={(e) => setSettingsForm({ ...settingsForm, platform_revenue_percent: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-rage-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Minimum Withdrawal Threshold (INR ₹)
              </label>
              <input
                type="number"
                min="10"
                value={settingsForm.min_withdrawal_amount || '100'}
                onChange={(e) => setSettingsForm({ ...settingsForm, min_withdrawal_amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-rage-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Creator Referral Bonus Award (INR ₹)
              </label>
              <input
                type="number"
                min="0"
                value={settingsForm.referral_reward || '50'}
                onChange={(e) => setSettingsForm({ ...settingsForm, referral_reward: e.target.value })}
                className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-rage-accent"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Apply System Rules</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">Cryptographic Audit Trail</h2>
            <span className="text-xs text-gray-400 font-mono">{auditLogs.length} Logged Operations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Operation</th>
                  <th className="pb-3">Entity Target</th>
                  <th className="pb-3">Origin IP</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-mono text-gray-400 text-[11px]">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 font-mono font-bold text-white">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 text-gray-300 font-mono text-[11px]">{log.target_type || 'system'}</td>
                    <td className="py-3 font-mono text-gray-500 text-[11px]">{log.ip_address || 'internal'}</td>
                    <td className="py-3 text-gray-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
