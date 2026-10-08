import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { AdminStatsData, WithdrawalRequest } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Save,
  Check
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
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Authenticating Super Admin Command Deck...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/40 border border-red-800/40 text-red-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Super Administrator Mode</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display">System Governance & Operations</h1>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-1 p-1 bg-dark-card border border-dark-border rounded-xl">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'withdrawals', label: `Payouts (${stats.pending_withdrawals_count})` },
            { id: 'fraud', label: `Fraud (${stats.fraud_alerts_count})` },
            { id: 'settings', label: 'Monetization Rules' },
            { id: 'audit', label: 'Audit Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-rage-accent text-white shadow-rage-glow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-dark-border">
              <div className="text-xs font-semibold text-gray-400 uppercase">Platform Revenue</div>
              <div className="text-2xl font-black text-white font-mono mt-1">₹{stats.platform_revenue.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">Gross ad & paid margin</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-dark-border">
              <div className="text-xs font-semibold text-gray-400 uppercase">Creator Payouts</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">₹{stats.creator_payouts_distributed.toFixed(2)}</div>
              <div className="text-xs text-gray-500 mt-1">Credited across wallets</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-dark-border">
              <div className="text-xs font-semibold text-gray-400 uppercase">Storage Ingested</div>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {(stats.total_storage_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
              <div className="text-xs text-gray-500 mt-1">{stats.total_files} active files</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-dark-border">
              <div className="text-xs font-semibold text-gray-400 uppercase">Qualified Traffic</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{stats.qualified_downloads} DLs</div>
              <div className="text-xs text-emerald-400 mt-1">Out of {stats.total_downloads} raw requests</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS */}
      {activeTab === 'users' && (
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display">User Directory</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Referral Code</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3">
                      <div className="font-semibold text-white">{u.full_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 font-mono text-[11px]">{u.role}</td>
                    <td className="py-3 font-mono">{u.referral_code}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.is_active ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'
                      }`}>
                        {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className="px-2.5 py-1 rounded bg-dark-card border border-dark-border hover:border-red-500 text-xs font-semibold text-gray-300"
                      >
                        {u.is_active ? 'Suspend' : 'Activate'}
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
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display">Payout Authorization Queue</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Details</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3 font-mono text-gray-400">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3 font-mono font-bold text-white">₹{w.amount.toFixed(2)}</td>
                    <td className="py-3">{w.payout_method}</td>
                    <td className="py-3 font-mono text-[10px] max-w-xs truncate">{w.payout_details}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-card border border-dark-border">
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {w.status === 'PENDING' && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'APPROVE')}
                            className="px-2 py-1 bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 rounded hover:bg-emerald-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleWithdrawalAction(w.id, 'REJECT')}
                            className="px-2 py-1 bg-red-950/60 border border-red-700/50 text-red-400 rounded hover:bg-red-900"
                          >
                            Reject (Refund)
                          </button>
                        </div>
                      )}
                      {w.status === 'APPROVED' && (
                        <button
                          onClick={() => handleWithdrawalAction(w.id, 'COMPLETE')}
                          className="px-2.5 py-1 bg-blue-950/60 border border-blue-700/50 text-blue-400 rounded hover:bg-blue-900"
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
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Anti-Bot & Traffic Risk Telemetry</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">IP Hash</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Anomaly Signals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {fraudAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No high-risk fraud anomalies flagged. Platform traffic is healthy.
                    </td>
                  </tr>
                ) : (
                  fraudAlerts.map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 font-mono text-gray-400">{new Date(f.flagged_at).toLocaleString()}</td>
                      <td className="py-3 font-mono text-gray-300">{f.ip_hash}</td>
                      <td className="py-3 font-mono font-bold">
                        <span className={f.risk_score >= 60 ? 'text-red-400' : 'text-amber-400'}>
                          {f.risk_score}/100
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
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rage-accent" />
              <span>Configurable Monetization Rules</span>
            </h2>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <Check className="w-4 h-4" />
                <span>Rules Updated!</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                Creator Revenue Share Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={settingsForm.creator_revenue_percent || '60'}
                onChange={(e) => setSettingsForm({ ...settingsForm, creator_revenue_percent: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                Platform Share Percentage (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={settingsForm.platform_revenue_percent || '40'}
                onChange={(e) => setSettingsForm({ ...settingsForm, platform_revenue_percent: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                Minimum Withdrawal Amount (INR ₹)
              </label>
              <input
                type="number"
                min="10"
                value={settingsForm.min_withdrawal_amount || '100'}
                onChange={(e) => setSettingsForm({ ...settingsForm, min_withdrawal_amount: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">
                Creator Referral Reward Bonus (INR ₹)
              </label>
              <input
                type="number"
                min="0"
                value={settingsForm.referral_reward || '50'}
                onChange={(e) => setSettingsForm({ ...settingsForm, referral_reward: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white font-mono font-bold"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Business Rules</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display">Security & Financial Audit Trail</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Target</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 font-mono text-gray-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-2.5 font-mono font-semibold text-white">{log.action}</td>
                    <td className="py-2.5 text-gray-400">{log.target_type || 'system'}</td>
                    <td className="py-2.5 font-mono text-gray-500">{log.ip_address || 'internal'}</td>
                    <td className="py-2.5 text-gray-300">{log.details}</td>
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
