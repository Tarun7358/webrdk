import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FileItem, ShareLink } from '../types';
import {
  FolderOpen,
  Search,
  Share2,
  Trash2,
  Download,
  Plus,
  Lock,
  Clock,
  FileArchive,
  FileVideo,
  FileText,
  FileCode,
  File as FileGeneric,
  X,
  Check,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const FilesPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Share Modal State
  const [activeFileForShare, setActiveFileForShare] = useState<FileItem | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiryHours, setShareExpiryHours] = useState<number | ''>(''); // '' means Unlimited (Never Expires)
  const [shareLimit, setShareLimit] = useState<number | ''>(''); // '' means Unlimited
  const [createdShare, setCreatedShare] = useState<ShareLink | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyFiles(search, filterVisibility);
      setFiles(data);
    } catch (e) {
      console.error('Error fetching files:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [search, filterVisibility]);

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file? This will permanently remove it from your cloud vault.')) return;
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      refreshUser();
      window.dispatchEvent(new CustomEvent('rage-storage-updated'));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleGenerateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFileForShare) return;
    setShareLoading(true);
    try {
      const res = await api.createShareLink({
        file_id: activeFileForShare.id,
        password: sharePassword || undefined,
        expires_in_hours: (shareExpiryHours !== '' && Number(shareExpiryHours) > 0) ? Number(shareExpiryHours) : undefined,
        download_limit: (shareLimit !== '' && Number(shareLimit) > 0) ? Number(shareLimit) : undefined
      });
      setCreatedShare(res);
    } catch (err: any) {
      alert(`Failed to create share link: ${err.message}`);
    } finally {
      setShareLoading(false);
    }
  };

  const getFileIcon = (ext: string) => {
    const e = ext.toLowerCase();
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return <FileArchive className="w-4 h-4 text-amber-400" />;
    if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(e)) return <FileVideo className="w-4 h-4 text-rose-400" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(e)) return <FileText className="w-4 h-4 text-blue-400" />;
    if (['js', 'ts', 'py', 'json', 'cpp'].includes(e)) return <FileCode className="w-4 h-4 text-emerald-400" />;
    return <FileGeneric className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
              STORAGE ASSETS
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{files.length} Total Files Uploaded</span>
          </div>
          <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-rose-500" />
            <span>My Creator Vault</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your uploaded archives, share monetized links, and customize file access protections.
          </p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 hover:shadow-rose-600/40 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New Asset</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vault files by filename or extension..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
        </div>
        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="w-full sm:w-48 py-2.5 px-3 bg-slate-900/90 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-rose-500"
        >
          <option value="">All Access Types</option>
          <option value="PUBLIC">Public (Free)</option>
          <option value="PAID">Paid Monetized Content</option>
          <option value="PRIVATE">Private Vault Only</option>
          <option value="UNLISTED">Unlisted Direct Link</option>
        </select>
      </div>

      {/* File List Table */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-xl">
        {isLoading && files.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-xs font-mono">Querying Google Drive Vault...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <FolderOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No vault files matched your query.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search filters or upload a new file.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-[10px] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="pb-3.5 font-semibold">File Name</th>
                  <th className="pb-3.5 font-semibold">Size</th>
                  <th className="pb-3.5 font-semibold">Access Level</th>
                  <th className="pb-3.5 font-semibold">Backend</th>
                  <th className="pb-3.5 font-semibold">Downloads</th>
                  <th className="pb-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center">
                          {getFileIcon(file.extension)}
                        </div>
                        <div>
                          <div className="font-semibold text-xs truncate max-w-xs">{file.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                        file.visibility === 'PAID'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : file.visibility === 'PUBLIC'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {file.visibility} {file.visibility === 'PAID' ? `(₹${file.price})` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-400">
                      {file.storage_backend}
                    </td>
                    <td className="py-3.5 font-mono font-semibold text-slate-200">
                      {file.download_count.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFileForShare(file);
                            setCreatedShare(null);
                            setSharePassword('');
                            setShareExpiryHours('');
                            setShareLimit('');
                          }}
                          title="Generate Protected Share Link"
                          className="p-2 rounded-lg bg-slate-800/80 border border-white/5 hover:border-rose-500/50 hover:text-rose-400 text-slate-300 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={api.getStreamUrl(file.id)}
                          download={file.name}
                          title="Direct Cloud Stream"
                          className="p-2 rounded-lg bg-slate-800/80 border border-white/5 hover:border-blue-500 hover:text-blue-400 text-slate-300 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(file.id)}
                          title="Delete File from Vault"
                          className="p-2 rounded-lg bg-slate-800/80 border border-white/5 hover:border-rose-600 hover:text-rose-400 text-slate-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Link Generation Modal */}
      {activeFileForShare && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveFileForShare(null)}
        >
          <div 
            className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Share2 className="w-4 h-4 text-rose-500" />
                <span>Create Protected Share Link</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveFileForShare(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generating monetized download gateway for: <strong className="text-white">{activeFileForShare.name}</strong>
            </p>

            {createdShare ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Gateway Link Live</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                      {createdShare.expires_at ? `Expires: ${new Date(createdShare.expires_at).toLocaleDateString()}` : '∞ Unlimited (Never Expires)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="font-mono text-xs text-slate-200 break-all select-all">
                      {window.location.origin}/d/{createdShare.short_code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/d/${createdShare.short_code}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-sm"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveFileForShare(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateShare} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Password Protection (Optional)
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={sharePassword}
                      onChange={(e) => setSharePassword(e.target.value)}
                      placeholder="Leave blank for public open access"
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Link Expiry with Unlimited option */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Link Expiration
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        shareExpiryHours === ''
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      }`}>
                        {shareExpiryHours === '' ? '∞ Unlimited (Never)' : `${shareExpiryHours}h`}
                      </span>
                    </div>

                    {/* Quick preset selector */}
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setShareExpiryHours('')}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareExpiryHours === ''
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        ∞ Unlimited
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareExpiryHours(24)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareExpiryHours === 24
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        24 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareExpiryHours(168)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareExpiryHours === 168
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareExpiryHours(720)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareExpiryHours === 720
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        30 Days
                      </button>
                    </div>

                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min="1"
                        placeholder="Unlimited (Leave blank for permanent link)"
                        value={shareExpiryHours}
                        onChange={(e) => setShareExpiryHours(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {/* Download Limit with Unlimited option */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Download Limit
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        shareLimit === ''
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                      }`}>
                        {shareLimit === '' ? '∞ Unlimited' : `${shareLimit} max`}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setShareLimit('')}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareLimit === ''
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        ∞ Unlimited
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareLimit(10)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareLimit === 10
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        10 dl
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareLimit(50)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareLimit === 50
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        50 dl
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareLimit(100)}
                        className={`py-1.5 px-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                          shareLimit === 100
                            ? 'bg-rose-500/20 text-white border border-rose-500/50 shadow-sm shadow-rose-500/10'
                            : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        100 dl
                      </button>
                    </div>

                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited (No download limit)"
                      value={shareLimit}
                      onChange={(e) => setShareLimit(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFileForShare(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/30 cursor-pointer"
                  >
                    {shareLoading ? 'Generating...' : 'Generate Short Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

