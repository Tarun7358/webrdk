import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { FileItem, Wallet } from '../types';
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
  ArrowUpRight
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
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

  if (isLoading && !wallet) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Loading Dashboard & Cloud Files...</p>
      </div>
    );
  }

  const copyReferralLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/register?ref=${user.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const totalDownloads = files.reduce((acc, f) => acc + f.download_count, 0);

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            Welcome back, <span className="text-rage-accent">{user?.full_name}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here is the active snapshot of your cloud storage & creator revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="flex items-center gap-2 px-5 py-2.5 bg-rage-accent hover:bg-rage-600 text-white font-bold text-sm rounded-xl transition-all shadow-rage-glow-sm hover:scale-[1.02]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New File</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Active Files</span>
            <FolderOpen className="w-5 h-5 text-rage-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{files.length}</div>
          <div className="text-xs text-gray-500 mt-1">Stored securely on Google Drive</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Total Downloads</span>
            <DownloadCloud className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{totalDownloads.toLocaleString()}</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Monetization enabled</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Available Balance</span>
            <WalletIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono text-emerald-400">
            ₹{wallet?.available_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            <Link to="/wallet" className="text-rage-400 hover:underline flex items-center gap-0.5">
              <span>Withdrawal details</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl glass-panel-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Creator Split</span>
            <Flame className="w-5 h-5 text-rage-accent" />
          </div>
          <div className="text-3xl font-black text-white font-mono">60%</div>
          <div className="text-xs text-gray-500 mt-1">Top tier ad & premium revenue</div>
        </div>
      </div>

      {/* Referral Quick Promo Box */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-red-950/40 via-dark-card to-dark-surface border border-rage-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rage-400 font-bold text-sm">
            <Share2 className="w-4 h-4" />
            <span>Earn ₹50 for Every Invited Creator</span>
          </div>
          <p className="text-xs text-gray-400 max-w-xl">
            Share your unique referral link. When new creators register and distribute files, you earn direct cash credited to your immutable wallet ledger.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs font-mono text-gray-300">
            {user?.referral_code}
          </span>
          <button
            onClick={copyReferralLink}
            className="flex items-center gap-1.5 px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedRef ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Recent Files Section */}
      <div className="glass-panel rounded-3xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-rage-accent" />
            <span>Recently Uploaded Files</span>
          </h2>
          <Link to="/files" className="text-xs text-rage-400 hover:text-rage-300 font-semibold flex items-center gap-1">
            <span>View All Files</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {files.length === 0 ? (
          <div className="py-12 text-center">
            <UploadCloud className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-300">No files uploaded yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Upload game mods, guides, or video packs to generate shareable links and start earning.
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-medium text-xs rounded-xl"
            >
              Upload First File
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b border-dark-border/60">
                <tr>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Visibility</th>
                  <th className="pb-3 font-semibold">Downloads</th>
                  <th className="pb-3 font-semibold">Uploaded</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {files.slice(0, 5).map((file) => (
                  <tr key={file.id} className="hover:bg-dark-surface/40 transition-colors">
                    <td className="py-3.5 font-medium text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rage-accent" />
                      <span className="truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="py-3.5 font-mono text-xs text-gray-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        file.visibility === 'PAID'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                          : file.visibility === 'PUBLIC'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {file.visibility} {file.visibility === 'PAID' ? `(₹${file.price})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-xs">{file.download_count}</td>
                    <td className="py-3.5 text-xs text-gray-500">
                      {new Date(file.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        to="/files"
                        className="text-xs text-rage-400 hover:text-white font-medium px-2.5 py-1 rounded-lg bg-dark-card border border-dark-border hover:border-rage-accent transition-all"
                      >
                        Manage
                      </Link>
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
