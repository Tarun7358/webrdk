import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { PublicDownloadPageData } from '../types';
import {
  Download,
  ShieldCheck,
  Flame,
  File,
  Lock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export const DownloadPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [data, setData] = useState<PublicDownloadPageData | null>(null);
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [countdown, setCountdown] = useState<number>(3);
  const [readyToDownload, setReadyToDownload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoSeconds, setVideoSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!shortCode) return;
    const fetchPageData = async () => {
      try {
        const res = await api.getPublicShare(shortCode);
        setData(res);
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
              // Trigger qualified video view milestone
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
      setError(err.message || 'Incorrect password');
    }
  };

  const handlePaidPurchase = async () => {
    if (!data) return;
    try {
      await api.purchaseContent(data.file_id);
      alert('Purchase simulated successfully! You now have permanent access.');
      window.location.reload();
    } catch (err: any) {
      alert(`Purchase failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rage-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 font-mono text-xs">Locating File & Verifying Storage Node...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full text-center space-y-4 border border-dark-border">
          <div className="w-12 h-12 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">File Unavailable</h2>
          <p className="text-xs text-gray-400">{error || 'This link may have expired or reached its maximum download limit.'}</p>
          <Link to="/" className="inline-block px-5 py-2.5 bg-rage-accent text-white font-semibold text-xs rounded-xl shadow-rage-glow-sm">
            Back to RAGE Cloud
          </Link>
        </div>
      </div>
    );
  }

  const downloadUrl = api.getDownloadUrl(shortCode, password);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="border-b border-dark-border/60 bg-dark-surface/40 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rage-accent to-red-800 flex items-center justify-center shadow-rage-glow-sm">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-extrabold text-base tracking-wider text-white">
            RAGE <span className="text-rage-accent">CLOUD</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">SHA-256 Checksum Verified</span>
        </div>
      </header>

      {/* Main Download Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Top Ad Banner Placement */}
        <div className="glass-panel p-3 sm:p-4 rounded-2xl border border-dashed border-rage-700/30 bg-gradient-to-r from-red-950/20 to-dark-surface flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rage-accent/20 border border-rage-accent/30 flex items-center justify-center text-rage-accent font-bold text-xs uppercase shrink-0">
              AD
            </div>
            <div>
              <div className="text-xs font-bold text-white">RAGE Elite Gaming VPS & Dedicated Game Servers</div>
              <div className="text-[11px] text-gray-400">Ultra low ping with anti-DDoS protection starting at ₹499/mo</div>
            </div>
          </div>
          <a
            href="https://ragecloud.io/partner"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-semibold rounded-lg shrink-0"
          >
            Explore
          </a>
        </div>

        {/* Central File Showcase Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-dark-border shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-dark-border/60">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-dark-bg border border-dark-border flex items-center justify-center text-rage-accent shadow-inner">
                <File className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white font-display break-all">
                  {data.file_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>{(data.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>Uploaded by <strong className="text-gray-200">{data.creator_name}</strong></span>
                  <span>•</span>
                  <span>{data.download_count} total downloads</span>
                </div>
              </div>
            </div>

            {data.is_paid && (
              <div className="px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-400 font-bold text-sm flex items-center gap-1.5 shrink-0">
                <DollarSign className="w-4 h-4" />
                <span>₹{data.price} INR</span>
              </div>
            )}
          </div>

          {/* Password Protection Barrier */}
          {!isUnlocked && data.is_password_protected ? (
            <form onSubmit={handlePasswordUnlock} className="p-6 rounded-2xl bg-dark-bg/80 border border-dark-border space-y-3">
              <div className="flex items-center gap-2 text-rage-400 text-xs font-semibold uppercase tracking-wider">
                <Lock className="w-4 h-4" />
                <span>Password Protected File</span>
              </div>
              <p className="text-xs text-gray-400">The creator has protected this file with a password. Enter it below to unlock.</p>
              <div className="flex gap-2">
                <input
                  type="password"
                  required
                  placeholder="Enter access password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 px-4 py-2 bg-dark-card border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl"
                >
                  Unlock File
                </button>
              </div>
            </form>
          ) : data.is_paid ? (
            /* Paid Content Barrier */
            <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-center space-y-4">
              <h3 className="text-base font-bold text-white">Creator Paid Asset</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                This item is priced at ₹{data.price}. Purchase access directly to support {data.creator_name} and download immediately.
              </p>
              <button
                onClick={handlePaidPurchase}
                className="px-6 py-3 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm"
              >
                Purchase Access for ₹{data.price}
              </button>
            </div>
          ) : (
            /* File is ready / Video player / Download action */
            <div className="space-y-6">
              {data.is_video && (
                <div className="space-y-2">
                  <div className="rounded-2xl overflow-hidden bg-black border border-dark-border aspect-video relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      controls
                      src={downloadUrl}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span>Watched: {videoSeconds}s</span>
                    <span className={videoSeconds >= 10 ? 'text-emerald-400 font-bold' : 'text-rage-400'}>
                      {videoSeconds >= 10 ? '✓ Qualified View Verified' : 'Watch 10s to qualify creator revenue'}
                    </span>
                  </div>
                </div>
              )}

              {/* Countdown & Download Trigger */}
              <div className="text-center py-4 space-y-4">
                {!readyToDownload ? (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-dark-bg border border-dark-border text-xs text-gray-400 font-mono">
                    <Clock className="w-4 h-4 text-rage-accent animate-pulse" />
                    <span>Preparing download stream in {countdown}s...</span>
                  </div>
                ) : (
                  <a
                    href={downloadUrl}
                    download={data.file_name}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-rage-accent hover:bg-rage-600 text-white font-black text-sm rounded-2xl transition-all shadow-rage-glow hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    <span>DOWNLOAD FILE NOW</span>
                  </a>
                )}
                <div className="text-[11px] text-gray-500">
                  Fast direct streaming from Google Drive storage backend • 0 bandwidth throttling
                </div>
              </div>
            </div>
          )}

          {/* Verification Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-dark-border/60 text-xs text-gray-400">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Virus & Malware Scanned</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Anti-Bot Shield Active</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-bg/60 border border-dark-border/60">
              <Flame className="w-4 h-4 text-rage-accent shrink-0" />
              <span>RAGE Cloud Verified</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border bg-dark-surface/40 py-4 px-6 text-center text-xs text-gray-500">
        RAGE Cloud File Delivery Network &copy; 2026. All downloads monitored for abuse and DMCA compliance.
      </footer>
    </div>
  );
};
