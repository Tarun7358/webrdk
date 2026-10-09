import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
  HardDrive
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export const UploadPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(null);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE' | 'UNLISTED' | 'PAID'>('PUBLIC');
  const [price, setPrice] = useState<number>(49);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to dispatch');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('visibility', visibility);
    formData.append('price', visibility === 'PAID' ? String(price) : '0.0');

    try {
      setUploadProgress(55);
      const res = await api.uploadFile(formData);
      setUploadProgress(100);
      setUploadSuccess(res);
      refreshUser();
      window.dispatchEvent(new CustomEvent('rage-storage-updated'));
    } catch (err: any) {
      setError(err.message || 'Storage transmission failed');
    } finally {
      setIsUploading(false);
    }
  };

  const getPublicShareUrl = () => {
    const code = uploadSuccess?.short_code || uploadSuccess?.id;
    if (!code) return '';
    return `${window.location.origin}/d/${code}`;
  };

  const copyShareLink = async () => {
    const url = getPublicShareUrl();
    if (url) {
      const ok = await copyToClipboard(url);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rage-accent/10 border border-rage-accent/20 text-rage-accent text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              <span>Multi-Region Cloud Ingest</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
            <UploadCloud className="w-7 h-7 text-rage-accent" />
            <span>Upload Station</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Stream high-capacity files directly into high-speed Google Drive storage backed by automated SHA-256 verification.
          </p>
        </div>

        {/* Quota Badge */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/10 shrink-0">
          <HardDrive className="w-4 h-4 text-rage-accent" />
          <div className="text-left">
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Available Quota</div>
            <div className="text-xs font-mono font-bold text-white">5.0 TB Google Drive</div>
          </div>
        </div>
      </div>

      {uploadSuccess ? (
        /* Upload Success Showcase */
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-emerald-500/30 text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg ring-8 ring-emerald-500/10 animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white font-display">Transmission Complete!</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-lg mx-auto">
              Your file <strong className="text-white font-mono">{uploadSuccess.name}</strong> ({(uploadSuccess.size / (1024 * 1024)).toFixed(2)} MB) is verified and deployed to global edge delivery.
            </p>
          </div>

          {/* Share Link Box */}
          {uploadSuccess.short_code && (
            <div className="max-w-xl mx-auto p-4 rounded-2xl bg-black/60 border border-white/10 text-left space-y-2">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                <span>Public Share URL</span>
                <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                  <ShieldCheck className="w-3 h-3" /> Monetization Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getPublicShareUrl()}
                  className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white font-mono focus:outline-none"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl transition-all shadow-rage-glow-sm flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <Link
                  to={`/d/${uploadSuccess.short_code}`}
                  target="_blank"
                  className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl border border-white/10 transition-colors"
                  title="Open Download Page"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setUploadSuccess(null);
                setSelectedFile(null);
              }}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold rounded-xl transition-colors"
            >
              Upload Another File
            </button>
            <button
              onClick={() => navigate('/files')}
              className="px-6 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm transition-all"
            >
              View In Vault
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
              selectedFile
                ? 'border-rage-accent bg-rage-accent/[0.04] shadow-rage-glow-sm'
                : 'border-white/15 hover:border-rage-accent/70 bg-white/[0.015] hover:bg-white/[0.03]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Background Glow */}
            <div className="absolute inset-0 bg-radial from-rage-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {selectedFile ? (
              <div className="space-y-3 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-rage-accent/15 border border-rage-accent/30 text-rage-accent flex items-center justify-center mx-auto shadow-inner">
                  <File className="w-8 h-8" />
                </div>
                <div>
                  <div className="font-bold text-white text-base sm:text-lg break-all">{selectedFile.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Binary Package'}
                  </div>
                </div>
                <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-gray-400">
                  Click to replace file
                </div>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400 group-hover:border-rage-accent/50 group-hover:text-rage-accent group-hover:scale-105 transition-all shadow-lg">
                  <UploadCloud className="w-8 h-8 text-rage-accent" />
                </div>
                <div>
                  <span className="text-white font-bold text-sm sm:text-base">Drop files here to upload, or </span>
                  <span className="text-rage-accent font-extrabold text-sm sm:text-base underline underline-offset-4">browse computer</span>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-gray-400 font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">Games</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">Videos</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">ZIP / RAR</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">Software</span>
                  <span className="text-gray-500">• Max 1.0 GB per upload</span>
                </div>
              </div>
            )}
          </div>

          {/* Visibility & Monetization Grid */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">Monetization & Distribution Model</h3>
                <p className="text-xs text-gray-400 mt-0.5">Control access rights, advertisement revenue eligibility, or paywall gate.</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 60% Split
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'PUBLIC', label: 'Public Link', desc: 'Ad monetized download portal', icon: Globe },
                { id: 'PAID', label: 'Paywall Gate', desc: 'Direct user pay-to-download', icon: DollarSign },
                { id: 'UNLISTED', label: 'Unlisted', desc: 'Direct download only via link', icon: ShieldCheck },
                { id: 'PRIVATE', label: 'Private Vault', desc: 'Restricted to your account', icon: Lock },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = visibility === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVisibility(item.id as any)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-rage-accent bg-rage-accent/10 shadow-rage-glow-sm'
                        : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-rage-accent' : 'text-gray-400'}`} />
                    <div className="font-bold text-xs text-white">{item.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Paid Gate Settings */}
            {visibility === 'PAID' && (
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Download Fee (INR ₹)
                    </label>
                    <div className="relative w-44">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 max-w-sm pt-2 sm:pt-4">
                    At <strong className="text-white">₹{price}</strong>, you receive <strong className="text-emerald-400">₹{(price * 0.6).toFixed(2)}</strong> automatically credited to your wallet for every successful purchase.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="glass-panel p-5 rounded-2xl border border-rage-accent/30 space-y-2.5">
              <div className="flex justify-between text-xs text-gray-300">
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rage-accent animate-ping" />
                  Streaming payload to Google Drive nodes...
                </span>
                <span className="font-mono font-bold text-white">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                <div
                  className="bg-gradient-to-r from-red-600 via-rage-accent to-rose-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="w-full py-4 bg-rage-accent hover:bg-rage-600 disabled:opacity-40 text-white font-extrabold text-sm rounded-2xl transition-all shadow-rage-glow hover:scale-[1.01] flex items-center justify-center gap-2.5"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Encrypting & Dispatching...</span>
              </div>
            ) : (
              <>
                <span>Confirm & Upload File</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
