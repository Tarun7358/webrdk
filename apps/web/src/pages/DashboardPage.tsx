import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { FileItem, Wallet } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { EditFileModal } from '../components/EditFileModal';
import {
  FolderOpen,
  DownloadCloud,
  CheckCircle2,
  Wallet as WalletIcon,
  UploadCloud,
  Share2,
  Copy,
  ExternalLink,
  Flame,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  FileText,
  Sliders,
  Check
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [filesData, walletData] = await Promise.all([
          api.getMyFiles(),
          api.getWallet()
        ]);
        setFiles(filesData);
        setWallet(walletData);
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const copyReferralLink = async () => {
    if (!user?.referral_code) return;
    const link = `${window.location.origin}/register?ref=${user.referral_code}`;
    const ok = await copyToClipboard(link);
    if (ok) {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  };

  const copyFileLink = async (shortCode?: string, fileId?: string) => {
    const code = shortCode || fileId;
    if (!code) return;
    const url = `${window.location.origin}/d/${code}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(code);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const totalDownloads = files.reduce((acc, f) => acc + f.download_count, 0);

  if (isLoading && !wallet) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-xs font-mono">Synchronizing Creator Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              CREATOR VAULT
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Verified Account
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-500 to-amber-400">{user?.full_name}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Active snapshot of your cloud storage, download throughput, and payout ledger.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 hover:shadow-rose-600/40 transition-all active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New File</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 glass-panel-hover relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Active Files</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{files.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Google Drive CDN synced</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 glass-panel-hover relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Downloads</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DownloadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{totalDownloads.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Monetization active</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 glass-panel-hover relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Available Balance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <WalletIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            ₹{wallet?.available_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <Link to="/wallet" className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5 font-semibold">
              <span>Request UPI payout</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 glass-panel-hover relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] uppercase font-bold tracking-wider">Creator Split</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">70%</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Tier 1 Highest RevShare</span>
          </div>
        </div>
      </div>

      {/* Referral Quick Promo Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-950/30 via-slate-900/90 to-slate-900 border border-rose-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Share2 className="w-4 h-4" />
            <span>Invite Creators & Earn Cash Bonuses</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Share your unique referral invite code. Earn ₹50 bonus on their first qualified download milestone, credited directly to your immutable wallet ledger.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="px-3.5 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono font-bold text-slate-200">
            {user?.referral_code}
          </span>
          <button
            type="button"
            onClick={copyReferralLink}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer shadow-md shadow-rose-600/20"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedRef ? 'Copied Link!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Recent Files Section */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-rose-400" />
            <span>Recently Uploaded Vault Files</span>
          </h2>
          <Link to="/files" className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1">
            <span>View All Files</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {files.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No files in your vault yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Upload zip files, gaming patches, guides, or media assets to start earning from download traffic.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload First File</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-[10px] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Visibility</th>
                  <th className="pb-3 font-semibold">Downloads</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold text-right">Share & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {files.slice(0, 5).map((file) => (
                  <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 font-medium text-white flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        file.visibility === 'PAID'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : file.visibility === 'PUBLIC'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {file.visibility} {file.visibility === 'PAID' ? `(₹${file.price})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-slate-200">
                      {file.download_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-slate-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyFileLink(file.short_code, file.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy share link"
                        >
                          {copiedLink === (file.short_code || file.id) ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{copiedLink === (file.short_code || file.id) ? 'Copied!' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFile(file)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit & Configure File / Link"
                        >
                          <Sliders className="w-3 h-3 text-rose-400" />
                          <span>Edit</span>
                        </button>
                        <Link
                          to={`/d/${file.short_code || file.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors"
                          title="View public page"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit & Configure Modal */}
      <EditFileModal
        file={editingFile}
        isOpen={Boolean(editingFile)}
        onClose={() => setEditingFile(null)}
        onUpdated={(updatedFile) => {
          setFiles((prev) => prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
        }}
      />
    </div>
  );
};

