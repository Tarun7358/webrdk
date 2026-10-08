import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Layers
} from 'lucide-react';
import { Navbar } from '../components/Navbar';

export const LandingPage: React.FC = () => {
  const [trafficVolume, setTrafficVolume] = useState<number>(50000);

  // Estimator: 50,000 qualified downloads * (estimated RPM ₹250)
  const estimatedEarnings = Math.round((trafficVolume / 1000) * 250);

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-36">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-rage-accent/15 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rage-accent/30 bg-rage-accent/10 text-rage-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-rage-glow-sm">
            <Flame className="w-3.5 h-3.5" />
            <span>The Premier Creator File Sharing & Monetization Network</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-none">
            Upload. Share. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rage-accent to-rose-400 glow-text">
              Grow. Earn.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Distribute gaming files, modpacks, videos, and digital assets. Turn your qualified download traffic into recurring revenue with our transparent ledger and Google Drive backed architecture.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 bg-rage-accent hover:bg-rage-600 text-white font-bold text-base rounded-xl transition-all shadow-rage-glow hover:scale-105 flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="w-full sm:w-auto px-8 py-4 bg-dark-card hover:bg-dark-border border border-dark-border text-gray-200 font-semibold text-base rounded-xl transition-all"
            >
              View Revenue Splits
            </Link>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="glass-panel p-4 rounded-2xl">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">60%</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Creator Revenue Share</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">100%</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Immutable Ledger</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">₹100</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Low Minimum Payout</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">0s</div>
              <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-semibold">Turbo Stream Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Revenue Calculator */}
      <section className="py-20 bg-dark-surface/40 border-y border-dark-border relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-white">Interactive Earnings Calculator</h2>
            <p className="text-gray-400 text-sm mt-2">See how much you can earn from your qualified download community</p>
          </div>

          <div className="glass-panel p-8 rounded-3xl border border-dark-border">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-gray-300">Monthly Qualified Downloads</span>
              <span className="text-xl font-bold text-rage-accent font-mono">{trafficVolume.toLocaleString()} Downloads</span>
            </div>

            <input
              type="range"
              min="5000"
              max="500000"
              step="5000"
              value={trafficVolume}
              onChange={(e) => setTrafficVolume(Number(e.target.value))}
              className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer accent-rage-accent mb-8"
            />

            <div className="p-6 rounded-2xl bg-dark-bg/80 border border-dark-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Estimated Monthly Creator Payout</div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-1 text-emerald-400">
                  ₹{estimatedEarnings.toLocaleString()} <span className="text-xs text-gray-400 font-normal">INR</span>
                </div>
              </div>
              <Link
                to="/register"
                className="px-6 py-3 bg-rage-accent hover:bg-rage-600 text-white font-semibold text-sm rounded-xl transition-all shadow-rage-glow-sm"
              >
                Claim Your Share
              </Link>
            </div>
            <p className="text-[11px] text-gray-500 text-center mt-4">
              *Calculated based on average ad CPM yields, qualified legitimate traffic rules, and a 60% creator revenue split. Earnings dynamically adjust based on verified platform revenue.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Engineered for Digital Creators</h2>
          <p className="text-gray-400 max-w-2xl mx-auto mt-3">From high-speed storage abstraction to institutional wallet security.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-6 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-rage-900/40 border border-rage-700/50 flex items-center justify-center text-rage-400 mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Pluggable Cloud Storage</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              MVP utilizes Google Drive API v3 to minimize infrastructure costs with seamless architecture designed to migrate to S3/Cloudflare R2 without rewriting application logic.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-rage-900/40 border border-rage-700/50 flex items-center justify-center text-rage-400 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Qualified Traffic Guard</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Our automated anti-bot rule engine scrubs automated web scrapers, headless browsers, and repeat IP spam so creators get paid accurately for real humans.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl glass-panel-hover">
            <div className="w-12 h-12 rounded-xl bg-rage-900/40 border border-rage-700/50 flex items-center justify-center text-rage-400 mb-5">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">Immutable Wallet Ledger</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Every single rupee earned is logged in an immutable double-entry database ledger. Track available balances, pending authorizations, and fast UPI payouts.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-dark-border bg-dark-bg py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rage-accent" />
            <span className="font-bold text-gray-300">RAGE Cloud</span> &copy; 2026. All rights reserved.
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gray-300">Terms of Service</Link>
            <Link to="/dmca" className="hover:text-gray-300">DMCA Notice</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
