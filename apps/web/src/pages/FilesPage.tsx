import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FileItem, ShareLink } from '../types';
import {
  FolderOpen,
  Search,
  Share2,
  Trash2,
  Download,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Share Modal State
  const [activeFileForShare, setActiveFileForShare] = useState<FileItem | null>(null);
  const [sharePassword, setSharePassword] = useState('');
  const [shareExpiryHours, setShareExpiryHours] = useState<number>(24);
  const [shareLimit, setShareLimit] = useState<number | ''>('');
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

  if (isLoading && files.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Loading Cloud Files...</p>
      </div>
    );
  }

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file? This will remove it from cloud storage.')) return;
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
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
        expires_in_hours: shareExpiryHours || undefined,
        download_limit: shareLimit ? Number(shareLimit) : undefined
      });
      setCreatedShare(res);
    } catch (err: any) {
      alert(`Failed to create share link: ${err.message}`);
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-rage-accent" />
            <span>My Files & Content</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage digital uploads, generate secured links, and set paid monetization.</p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-semibold text-xs rounded-xl shadow-rage-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Upload New</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files by name or extension..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-card border border-dark-border rounded-xl text-sm text-gray-200 focus:outline-none focus:border-rage-accent"
          />
        </div>
        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="w-full sm:w-44 py-2 px-3 bg-dark-card border border-dark-border rounded-xl text-xs font-semibold text-gray-300 focus:outline-none"
        >
          <option value="">All Visibilities</option>
          <option value="PUBLIC">Public</option>
          <option value="PAID">Paid Content</option>
          <option value="PRIVATE">Private</option>
          <option value="UNLISTED">Unlisted</option>
        </select>
      </div>

      {/* File List Table */}
      <div className="glass-panel rounded-3xl p-6 border border-dark-border">
        {files.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">No files found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b border-dark-border/60">
                <tr>
                  <th className="pb-3 font-semibold">File Name</th>
                  <th className="pb-3 font-semibold">Size</th>
                  <th className="pb-3 font-semibold">Visibility</th>
                  <th className="pb-3 font-semibold">Backend</th>
                  <th className="pb-3 font-semibold">Downloads</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-dark-surface/40 transition-colors">
                    <td className="py-3.5 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-dark-bg border border-dark-border flex items-center justify-center text-[10px] uppercase font-mono font-bold text-rage-400">
                          {file.extension.slice(0, 4)}
                        </span>
                        <div>
                          <div className="font-semibold text-sm truncate max-w-xs">{file.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            SHA: {file.checksum.slice(0, 16)}...
                          </div>
                        </div>
                      </div>
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
                    <td className="py-3.5 font-mono text-[11px] text-gray-400">
                      {file.storage_backend}
                    </td>
                    <td className="py-3.5 font-mono text-xs">{file.download_count}</td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setActiveFileForShare(file);
                            setCreatedShare(null);
                          }}
                          title="Generate Share Link"
                          className="p-1.5 rounded-lg bg-dark-card border border-dark-border hover:border-rage-accent hover:text-rage-400 text-gray-300 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <a
                          href={api.getStreamUrl(file.id)}
                          download={file.name}
                          title="Direct Stream"
                          className="p-1.5 rounded-lg bg-dark-card border border-dark-border hover:border-blue-500 hover:text-blue-400 text-gray-300 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(file.id)}
                          title="Delete File"
                          className="p-1.5 rounded-lg bg-dark-card border border-dark-border hover:border-red-600 hover:text-red-400 text-gray-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border">
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <Share2 className="w-4 h-4 text-rage-accent" />
                <span>Create Share Link</span>
              </h3>
              <button
                onClick={() => setActiveFileForShare(null)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Generating public link for: <strong className="text-gray-200">{activeFileForShare.name}</strong>
            </p>

            {createdShare ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-dark-bg border border-emerald-500/30">
                  <div className="text-xs text-emerald-400 font-semibold mb-1">Link Generated Successfully!</div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="font-mono text-xs text-gray-200 break-all select-all">
                      {window.location.origin}/d/{createdShare.short_code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/d/${createdShare.short_code}`);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-rage-accent hover:bg-rage-600 text-white rounded-lg text-xs font-semibold shrink-0"
                    >
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveFileForShare(null)}
                    className="px-4 py-2 bg-dark-border text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateShare} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Password Protection (Optional)
                  </label>
                  <input
                    type="password"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Leave empty for public access"
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Expires In (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="720"
                      value={shareExpiryHours}
                      onChange={(e) => setShareExpiryHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Download Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Unlimited"
                      value={shareLimit}
                      onChange={(e) => setShareLimit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveFileForShare(null)}
                    className="px-4 py-2 bg-dark-bg border border-dark-border text-gray-300 text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="px-5 py-2 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm"
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
