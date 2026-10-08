import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Users,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  TrendingUp,
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  X,
  Trash2
} from 'lucide-react';

interface OwnerUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  plan_tier: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  total_files: number;
  daily_earnings: number;
  lifetime_earnings: number;
  available_balance: number;
  created_at: string;
}

interface SubscriptionRequest {
  id: string;
  user_id: string;
  user_email: string;
  plan_tier: string;
  plan_name: string;
  amount_inr: number;
  storage_gb: number;
  utr_number: string;
  proof_image_data?: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  review_note?: string;
}

export const OwnerPage: React.FC = () => {
  const { user, login, logout } = useAuth();

  // Login form state for unauthenticated / non-owner users
  const [loginEmail, setLoginEmail] = useState('rdxyzprvt@gmail.com');
  const [loginPassword, setLoginPassword] = useState('clasher@2026');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Owner dashboard state
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'users'>('subscriptions');
  const [stats, setStats] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchUser, setSearchUser] = useState('');

  // Proof modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reject modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Toast feedback
  const [toast, setToast] = useState<string | null>(null);

  // User deletion state
  const [purging, setPurging] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handlePurgeTestAccounts = async () => {
    if (!window.confirm("Are you sure you want to delete all testing accounts (@test.com) from Railway SQL database?")) return;
    setPurging(true);
    try {
      const res = await api.purgeTestUsers();
      showToast(res.message || "Test accounts purged successfully.");
      await fetchOwnerData();
    } catch (err: any) {
      showToast(err.message || "Failed to purge test accounts.");
    } finally {
      setPurging(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Permanently remove ${email} and all associated files from database?`)) return;
    setDeletingUserId(userId);
    try {
      const res = await api.deleteUser(userId);
      showToast(res.message || `User ${email} removed.`);
      await fetchOwnerData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const isOwner = user?.role === 'OWNER' || user?.email === 'rdxyzprvt@gmail.com';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOwnerData = async () => {
    setLoading(true);
    try {
      const statsData = await api.getOwnerStats();
      setStats(statsData);

      const subsData = await api.getOwnerSubscriptions();
      setSubscriptions(subsData);
    } catch (err: any) {
      console.error('Failed to load owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      fetchOwnerData();
    }
  }, [isOwner]);

  const handleOwnerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (err: any) {
      setLoginError(err.response?.data?.detail || err.message || 'Owner authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleApprove = async (sub: SubscriptionRequest) => {
    if (!window.confirm(`Approve upgrade for ${sub.user_email} to ${sub.plan_name} (${sub.storage_gb} GB)? This will automatically update storage and send confirmation email.`)) {
      return;
    }

    setActionLoading(sub.id);
    try {
      await api.reviewSubscriptionRequest(sub.id, 'APPROVE');
      showToast(`Subscription approved! ${sub.user_email} upgraded and email sent via GoDaddy SMTP.`);
      await fetchOwnerData();
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;

    setActionLoading(rejectingId);
    try {
      await api.reviewSubscriptionRequest(rejectingId, 'REJECT', rejectReason || 'Transaction reference not found.');
      showToast('Subscription rejected and notice email sent to user.');
      setRejectingId(null);
      setRejectReason('');
      await fetchOwnerData();
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // If user is not OWNER, render dedicated Owner Login
  if (!isOwner) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#0f172a] border border-rose-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-rose-500/20 shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white font-display">Owner Executive Suite</h1>
            <p className="text-xs text-slate-400 mt-1">
              Restricted portal for RAGE CLOUD platform owner.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {loginError}
            </div>
          )}

          <form onSubmit={handleOwnerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Owner Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 py-3.5 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate as Owner</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filter subscriptions
  const filteredSubs = subscriptions.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  // Filter users
  const filteredUsers = (stats?.users || []).filter((u: OwnerUser) => {
    if (!searchUser) return true;
    const term = searchUser.toLowerCase();
    return u.email.toLowerCase().includes(term) || u.full_name.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0f172a] border border-rose-500/30 shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            RAGE CLOUD Executive Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Logged in as <strong className="text-white">{user?.email}</strong> &bull; Role: <span className="text-rose-400 font-mono font-bold">OWNER</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOwnerData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => logout()}
            className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
          >
            Exit Portal
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Registered Users</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{stats?.total_users ?? 0}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Files Hosted</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{stats?.total_files ?? 0}</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Storage Used</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {stats?.total_storage_bytes ? formatBytes(stats.total_storage_bytes) : '0 GB'}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-amber-500/30 flex items-center gap-4 shadow-amber-500/5 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-amber-300 font-medium">Pending Upgrades</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {stats?.pending_subscription_count ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'subscriptions'
              ? 'text-rose-400 border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Subscription Approvals Queue</span>
          {subscriptions.filter((s) => s.status === 'PENDING').length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
              {subscriptions.filter((s) => s.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === 'users'
              ? 'text-rose-400 border-b-2 border-rose-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Users & Daily Earnings ({stats?.users?.length ?? 0})</span>
        </button>
      </div>

      {/* TAB 1: SUBSCRIPTION APPROVALS */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === st
                    ? 'bg-rose-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {filteredSubs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-white/10 text-slate-400 text-xs">
              No subscription requests found for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubs.map((sub) => (
                <div
                  key={sub.id}
                  className={`p-6 rounded-3xl bg-[#0f172a] border flex flex-col justify-between transition-all ${
                    sub.status === 'PENDING'
                      ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sub.plan_name}</span>
                      {sub.status === 'PENDING' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                          PENDING REVIEW
                        </span>
                      )}
                      {sub.status === 'APPROVED' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          APPROVED
                        </span>
                      )}
                      {sub.status === 'REJECTED' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                          REJECTED
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white">{sub.user_email}</div>
                      <div className="text-xs text-rose-400 font-mono font-bold mt-1">
                        Amount: ₹{sub.amount_inr} &bull; Target Quota: {sub.storage_gb} GB
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        UTR / Ref: <span className="font-mono text-white font-bold">{sub.utr_number}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Date: {new Date(sub.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Proof Screenshot */}
                    {sub.proof_image_data ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(sub.proof_image_data || null)}
                          className="w-full p-2 rounded-xl bg-white/5 border border-white/10 hover:border-rose-500/50 flex items-center justify-center gap-2 text-xs text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-rose-400" />
                          <span>View Screenshot Proof</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">No screenshot attached</div>
                    )}
                  </div>

                  {sub.status === 'PENDING' && (
                    <div className="pt-5 mt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApprove(sub)}
                        disabled={actionLoading === sub.id}
                        className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() => setRejectingId(sub.id)}
                        disabled={actionLoading === sub.id}
                        className="py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USERS & DAILY EARNINGS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user by email or name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full rounded-xl bg-[#0f172a] border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handlePurgeTestAccounts}
              disabled={purging}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Purge all test accounts from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{purging ? 'Purging Test Accounts...' : 'Purge Test Accounts'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#0f172a]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold">
                  <th className="p-4">User</th>
                  <th className="p-4">Plan & Vault Limit</th>
                  <th className="p-4">Storage Used</th>
                  <th className="p-4">Total Files</th>
                  <th className="p-4 text-emerald-400 font-bold">Daily Earnings (24h)</th>
                  <th className="p-4">Lifetime Earnings</th>
                  <th className="p-4">Wallet Balance</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u: OwnerUser) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{u.full_name || 'Creator'}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 font-bold text-[10px] text-white">
                        {u.plan_tier} ({formatBytes(u.storage_limit_bytes)})
                      </span>
                    </td>

                    <td className="p-4 font-mono text-slate-300">
                      {formatBytes(u.storage_used_bytes)}
                    </td>

                    <td className="p-4 font-mono text-slate-300">
                      {u.total_files}
                    </td>

                    <td className="p-4 font-mono font-bold text-emerald-400">
                      ₹{u.daily_earnings.toFixed(2)}
                    </td>

                    <td className="p-4 font-mono text-white">
                      ₹{u.lifetime_earnings.toFixed(2)}
                    </td>

                    <td className="p-4 font-mono text-slate-300">
                      ₹{u.available_balance.toFixed(2)}
                    </td>

                    <td className="p-4 text-slate-400 text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="p-4 text-right">
                      {u.role !== 'OWNER' && u.email !== 'rdxyzprvt@gmail.com' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={deletingUserId === u.id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={`Delete ${u.email}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-2xl max-h-[85vh] bg-[#0f172a] p-4 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="Payment Proof" 
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-2xl" 
            />
          </div>
        </div>
      )}

      {/* Rejection Note Modal */}
      {rejectingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setRejectingId(null)}
        >
          <div 
            className="w-full max-w-md p-6 rounded-3xl bg-[#0f172a] border border-rose-500/30 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white">Reject Subscription Request</h3>
            <p className="text-xs text-slate-400">
              Provide a reason for the user. An automated rejection email will be dispatched to their address.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. UTR / transaction reference was not found in our bank statement."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
