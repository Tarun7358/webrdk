import React, { useState, useEffect } from 'react';
import type { FileItem } from '../types';
import { api } from '../services/api';
import { copyToClipboard } from '../utils/clipboard';
import {
  X,
  Sliders,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Clock,
  DownloadCloud,
  Lock,
  Unlock,
  Sparkles,
  AlertCircle,
  Trash2
} from 'lucide-react';

interface EditFileModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedFile: FileItem) => void;
  onDeleted?: (deletedFileId: string) => void;
}

export const EditFileModal: React.FC<EditFileModalProps> = ({
  file,
  isOpen,
  onClose,
  onUpdated,
  onDeleted
}) => {
  if (!isOpen || !file) return null;

  const [name, setName] = useState(file.name);
  const [visibility, setVisibility] = useState<FileItem['visibility']>(file.visibility);
  const [price, setPrice] = useState(file.price || 0);

  // Link Expiry: null / '' means Unlimited (Never expires)
  const [expiryHours, setExpiryHours] = useState<number | ''>(
    file.expires_at ? Math.max(1, Math.round((new Date(file.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))) : ''
  );

  // Download Limit: null / '' means Unlimited (No limit)
  const [downloadLimit, setDownloadLimit] = useState<number | ''>(
    file.download_limit !== null && file.download_limit !== undefined ? file.download_limit : ''
  );

  // Password protection
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(Boolean(file.is_password_protected));

  // Reset link & reset count triggers
  const [resetLinkRequested, setResetLinkRequested] = useState(false);
  const [resetCountRequested, setResetCountRequested] = useState(false);

  // Status
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    if (!file) return;
    if (!window.confirm(`Permanently delete "${file.name}"?\n\nThis will remove the file from cloud storage, free up your quota, and immediately deactivate its public download links.`)) {
      return;
    }
    setIsDeleting(true);
    setErrorMsg('');
    try {
      await api.deleteFile(file.id);
      window.dispatchEvent(new CustomEvent('rage-storage-updated'));
      if (onDeleted) {
        onDeleted(file.id);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(`Delete failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const currentShortCode = file.short_code || file.id;
  const liveShareUrl = `${window.location.origin}/d/${currentShortCode}`;

  useEffect(() => {
    setName(file.name);
    setVisibility(file.visibility);
    setPrice(file.price || 0);
    setExpiryHours(
      file.expires_at ? Math.max(1, Math.round((new Date(file.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))) : ''
    );
    setDownloadLimit(file.download_limit !== null && file.download_limit !== undefined ? file.download_limit : '');
    setPassword('');
    setClearPassword(false);
    setIsPasswordProtected(Boolean(file.is_password_protected));
    setResetLinkRequested(false);
    setResetCountRequested(false);
    setSuccessMsg('');
    setErrorMsg('');
  }, [file]);

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(liveShareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: any = {
        name: name.trim() || file.name,
        visibility,
        price: visibility === 'PAID' ? Number(price) : 0,
        reset_link: resetLinkRequested,
        reset_download_count: resetCountRequested,
      };

      // Expiry handling: '' means unlimited (no end date)
      if (expiryHours === '') {
        payload.unlimited_expiry = true;
      } else {
        payload.expires_in_hours = Number(expiryHours);
      }

      // Download limit handling: '' means unlimited (no end / no limit)
      if (downloadLimit === '') {
        payload.unlimited_downloads = true;
      } else {
        payload.download_limit = Number(downloadLimit);
      }

      // Password
      if (clearPassword) {
        payload.clear_password = true;
      } else if (password.trim()) {
        payload.password = password.trim();
      }

      const updated = await api.updateFile(file.id, payload);
      setSuccessMsg('Configuration saved successfully!');
      onUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update file configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[#0b101e] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 my-8 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">
                Configure File & Share Link
              </h3>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                {file.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Public Link Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Public Gateway Link
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              expiryHours === ''
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
            }`}>
              {expiryHours === '' ? '∞ Unlimited (Never Expires)' : `${expiryHours}h active`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={liveShareUrl}
              className="flex-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs font-mono text-slate-300 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-rose-600/20"
              title="Copy public link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
            <a
              href={liveShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title="Open link in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Reset Link Trigger */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setResetLinkRequested(!resetLinkRequested)}
              className={`text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                resetLinkRequested
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${resetLinkRequested ? 'rotate-180 text-amber-400' : ''}`} />
              <span>
                {resetLinkRequested ? '✓ Link will be regenerated on Save' : 'Reset / Generate New Link URL'}
              </span>
            </button>

            {resetLinkRequested && (
              <span className="text-[10px] text-amber-400/90 font-mono">
                Old link will become inactive
              </span>
            )}
          </div>
        </div>

        {/* Edit Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* File Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              File Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              placeholder="Filename"
              required
            />
          </div>

          {/* Visibility / Access Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Visibility & Monetization
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-rose-500"
              >
                <option value="PUBLIC">Public (Free Download)</option>
                <option value="PAID">Paid Monetized (Pay to Unlock)</option>
                <option value="UNLISTED">Unlisted (Link Only)</option>
                <option value="PRIVATE">Private Vault (Owner Only)</option>
              </select>
            </div>

            {visibility === 'PAID' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Unlock Price (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                  placeholder="Price in INR"
                  required
                />
              </div>
            )}
          </div>

          {/* Expiration Configuration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                Link Expiration
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                expiryHours === ''
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              }`}>
                {expiryHours === '' ? '∞ Unlimited (Never Expires)' : `${expiryHours} Hours`}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setExpiryHours('')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  expiryHours === ''
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                ∞ Unlimited
              </button>
              <button
                type="button"
                onClick={() => setExpiryHours(24)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  expiryHours === 24
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                24 Hours
              </button>
              <button
                type="button"
                onClick={() => setExpiryHours(168)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  expiryHours === 168
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setExpiryHours(720)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  expiryHours === 720
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                30 Days
              </button>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              {expiryHours === ''
                ? '✓ Unlimited: Link will never expire and remains active permanently until reset.'
                : `Link will automatically expire after ${expiryHours} hours.`}
            </p>
          </div>

          {/* Download Limit Configuration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DownloadCloud className="w-3.5 h-3.5 text-rose-400" />
                Download Quota Limit
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                downloadLimit === ''
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
              }`}>
                {downloadLimit === '' ? '∞ Unlimited Downloads' : `${downloadLimit} Max DLs`}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setDownloadLimit('')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  downloadLimit === ''
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                ∞ Unlimited
              </button>
              <button
                type="button"
                onClick={() => setDownloadLimit(10)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  downloadLimit === 10
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                10 DLs
              </button>
              <button
                type="button"
                onClick={() => setDownloadLimit(50)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  downloadLimit === 50
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                50 DLs
              </button>
              <button
                type="button"
                onClick={() => setDownloadLimit(100)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center ${
                  downloadLimit === 100
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-slate-900 text-slate-400 border border-white/5 hover:text-white hover:bg-slate-800'
                }`}
              >
                100 DLs
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[10px] text-slate-500 italic">
                {downloadLimit === ''
                  ? '✓ Unlimited: Users can download without any cap unless you reset the link.'
                  : `Downloads capped at ${downloadLimit}. Further attempts will be blocked.`}
              </p>
              <button
                type="button"
                onClick={() => setResetCountRequested(!resetCountRequested)}
                className={`text-[10px] font-semibold transition-colors cursor-pointer ${
                  resetCountRequested ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                {resetCountRequested ? '✓ Counter will reset to 0' : 'Reset DL Count (0)'}
              </button>
            </div>
          </div>

          {/* Password Protection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Password Protection (Optional)
              </label>
              {isPasswordProtected && !clearPassword && (
                <button
                  type="button"
                  onClick={() => setClearPassword(true)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Unlock className="w-3 h-3" />
                  Remove Password
                </button>
              )}
            </div>

            {clearPassword ? (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center justify-between">
                <span>Password protection will be removed upon saving.</span>
                <button
                  type="button"
                  onClick={() => setClearPassword(false)}
                  className="text-white hover:underline text-[10px] font-bold"
                >
                  Undo
                </button>
              </div>
            ) : (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isPasswordProtected ? 'Enter new password to change, or leave blank to keep' : 'Leave blank for public open access'}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
              />
            )}
          </div>

          {/* Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Permanently delete file from storage and deactivate link"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete File</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
