import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { PublicDownloadPageData } from '../types';
import {
  Download,
  Lock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Zap,
  Share2,
  Check
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export const DownloadPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [data, setData] = useState<PublicDownloadPageData | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [readyToDownload, setReadyToDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!shortCode) return;
    const fetchPageData = async () => {
      try {
        const res = await api.getPublicShare(shortCode);
        setData(res);
        if (res.file_name) {
          document.title = `${res.file_name} — RAGE Cloud`;
        }
        if (!res.is_password_protected) {
          setIsUnlocked(true);
        }
      } catch (err: any) {
        setError(err.message || 'File not found or link has expired');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPageData();
  }, [shortCode]);

  // Countdown timer for download button
  useEffect(() => {
    if (isUnlocked && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setReadyToDownload(true);
    }
  }, [isUnlocked, countdown]);

  // Video watch tracker
  useEffect(() => {
    let interval: any;
    if (data?.is_video && isUnlocked) {
      interval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          setVideoSeconds((prev) => {
            const next = prev + 1;
            if (next === 10) {
              api.trackVideo({
                file_id: data.file_id,
                watch_seconds: 10,
                total_duration_seconds: Math.floor(videoRef.current?.duration || 60)
              });
            }
            return next;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [data, isUnlocked]);

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortCode) return;
    try {
      await api.verifySharePassword(shortCode, password);
      setIsUnlocked(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Incorrect decryption key');
    }
  };

  const handlePaidPurchase = async () => {
    if (!data) return;
    try {
      await api.purchaseContent(data.file_id);
      alert('Payment confirmed! Content unlocked for download.');
      window.location.reload();
    } catch (err: any) {
      alert(`Purchase failed: ${err.message}`);
    }
  };

  const copyCurrentPageLink = async () => {
    const ok = await copyToClipboard(window.location.href);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-4 max-w-sm w-full">
          <div className="w-12 h-12 border-3 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h3 className="font-display font-bold text-white text-base">Locating Storage Node</h3>
            <p className="text-gray-400 font-mono text-xs mt-1">Verifying Google Drive checksum & routing edge CDN...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl max-w-md w-full text-center space-y-5 border border-white/10 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-lg">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-white font-display">Download Unavailable</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              {error || 'This link may have been modified, expired, or removed by its creator.'}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm transition-all"
          >
            <span>Return to RAGE Cloud</span>
          </Link>
        </div>
      </div>
    );
  }

  const downloadUrl = api.getDownloadUrl(shortCode, password);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col justify-between selection:bg-rage-accent selection:text-white">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="relative flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="RAGE Logo" 
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(244,63,94,0.5)] group-hover:scale-105 group-hover:drop-shadow-[0_0_18px_rgba(244,63,94,0.8)] transition-all"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-sm tracking-wider text-white">
              RAGE <span className="text-rose-500">CLOUD</span>
            </span>
            <span className="text-[10px] text-gray-400 font-mono">Edge CDN Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={copyCurrentPageLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-medium transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied' : 'Share File'}</span>
          </button>
        </div>
      </header>

      {/* Main Download Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 w-full space-y-6">
        {/* Ad / Sponsor Banner */}
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 bg-gradient-to-r from-red-950/30 via-black/40 to-dark-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rage-accent/20 border border-rage-accent/30 flex items-center justify-center text-rage-accent font-black text-xs uppercase shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>RAGE Ultra Low-Ping Game & Bot Servers</span>
                <span className="px-1.5 py-0.5 rounded bg-rage-accent text-white text-[9px] uppercase font-mono font-bold">SPONSORED</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Multi-threaded NVMe storage with automated Anti-DDoS mitigation starting at ₹499/mo.
              </div>
            </div>
          </div>
          <a
            href="https://ragecloud.io/partner"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            Explore Node
          </a>
        </div>

        {/* Central File Showcase Card */}
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl space-y-8 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-rage-accent/5 rounded-full blur-3xl pointer-events-none" />

          {/* File Meta Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center text-rage-accent shadow-xl shrink-0 ring-4 ring-white/5 relative">
                <img 
                  src="/file_banner.jpg" 
                  alt={data.file_name} 
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white font-display break-all leading-tight">
                  {data.file_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                  <span className="font-mono text-gray-300 font-bold">{(data.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>Creator: <strong className="text-white">{data.creator_name}</strong></span>
                  <span>•</span>
                  <span className="font-mono">{data.download_count.toLocaleString()} downloads</span>
                </div>
              </div>
            </div>

            {data.is_paid && (
              <div className="px-5 py-2.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-400 font-mono font-bold text-base flex items-center gap-2 shrink-0">
                <DollarSign className="w-5 h-5" />
                <span>₹{data.price} INR</span>
              </div>
            )}
          </div>

          {/* Password Protection Barrier */}
          {!isUnlocked && data.is_password_protected ? (
            <form onSubmit={handlePasswordUnlock} className="p-6 sm:p-8 rounded-3xl bg-black/60 border border-white/10 space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rage-accent/15 border border-rage-accent/30 text-rage-accent flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-display font-bold text-white text-base">Decryption Passphrase Required</h3>
                <p className="text-xs text-gray-400">
                  The creator has locked this distribution with an end-to-end passphrase.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter decryption password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm transition-all"
                >
                  Decrypt & Unlock Download
                </button>
              </div>
            </form>
          ) : data.is_paid ? (
            /* Paid Content Barrier */
            <div className="p-8 rounded-3xl bg-amber-950/20 border border-amber-500/30 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <DollarSign className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white font-display">Creator Premium Asset</h3>
                <p className="text-xs text-gray-400">
                  This download is priced at <strong className="text-amber-400 font-mono">₹{data.price} INR</strong>. Unlock instant high-speed access while directly supporting {data.creator_name}.
                </p>
              </div>
              <button
                onClick={handlePaidPurchase}
                className="w-full sm:w-auto px-8 py-3.5 bg-rage-accent hover:bg-rage-600 text-white font-extrabold text-xs rounded-xl shadow-rage-glow transition-all"
              >
                Purchase Access for ₹{data.price}
              </button>
            </div>
          ) : (
            /* File Unlocked / Video preview / Download trigger */
            <div className="space-y-8">
              {data.is_video && (
                <div className="space-y-2.5">
                  <div className="rounded-3xl overflow-hidden bg-black border border-white/10 aspect-video relative flex items-center justify-center shadow-2xl">
                    <video
                      ref={videoRef}
                      controls
                      src={downloadUrl}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-2">
                    <span>Watch Progress: {videoSeconds}s</span>
                    <span className={videoSeconds >= 10 ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-rage-400'}>
                      {videoSeconds >= 10 ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Qualified Creator View Active</span>
                        </>
                      ) : (
                        'Watch 10s to support creator revenue'
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Countdown & Download Trigger */}
              <div className="text-center py-6 space-y-5">
                {!readyToDownload ? (
                  <div className="space-y-4 max-w-sm mx-auto">
                    <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-black/60 border border-white/15 text-xs text-gray-300 font-mono shadow-inner">
                      <Clock className="w-4 h-4 text-rage-accent animate-spin" />
                      <span>Allocating secure download thread ({countdown}s)...</span>
                    </div>
                    {/* Animated Progress Mini Bar */}
                    <div className="w-48 mx-auto bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rage-accent h-full transition-all duration-1000 ease-linear"
                        style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <a
                      href={downloadUrl}
                      download={data.file_name}
                      className="inline-flex items-center gap-3 px-10 py-5 bg-rage-accent hover:bg-rage-600 text-white font-black text-base rounded-2xl transition-all shadow-rage-glow hover:scale-105 active:scale-95 uppercase tracking-wider"
                    >
                      <Download className="w-6 h-6 animate-bounce" />
                      <span>Download File Now</span>
                    </a>
                    <div className="text-xs text-gray-500 font-mono">
                      Direct Google Drive edge pipe • Uncapped speed • Instant handshake
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/40 py-6 px-6 text-center text-xs text-gray-500">
        <p>RAGE Cloud Global Delivery Network &bull; Automated integrity checking and anti-abuse verification enabled.</p>
      </footer>
    </div>
  );
};
