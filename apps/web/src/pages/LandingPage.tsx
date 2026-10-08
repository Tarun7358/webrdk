import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  HardDrive,
  Sparkles,
  Zap,
  DollarSign,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const [trafficVolume, setTrafficVolume] = useState<number>(75000);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('USD');
  const { openRegisterModal, user } = useAuth();

  // Estimator: 1,000 qualified downloads = $4.50 USD or ₹375 INR
  const estimatedUsd = Math.round((trafficVolume / 1000) * 4.5);
  const estimatedInr = Math.round((trafficVolume / 1000) * 375);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-rose-500/30 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 lg:pt-28 lg:pb-32 bg-grid-pattern">
        {/* Ambient Radial Mesh Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-rose-600/15 blur-[160px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[350px] bg-blue-600/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Release Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-semibold mb-8 shadow-sm shadow-rose-500/20 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>RAGE Cloud v2.4 • High-Yield Creator File Network</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
            Upload Files. Share Links. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 glow-text">
              Monetize Every Download.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            The next-generation file vault engineered for YouTubers, modders, and digital creators. Powered by high-speed Google Drive storage and an automated 70% revenue share ledger.
          </p>

          {/* CTA Actions */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            {user ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Open Creator Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openRegisterModal()}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm rounded-xl shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <span>Start Earning Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <Link
              to="/pricing"
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-900/80 hover:bg-slate-800/80 border border-white/10 hover:border-white/20 text-slate-300 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Explore Plans & RPM</span>
            </Link>
          </div>

          {/* Live Trust Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
            <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all">
              <div className="flex items-center gap-2 text-rose-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Rev Share</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">70%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Direct to creator wallet</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cloud Capacity</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">5 TB</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Google Drive Enterprise</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Min. Payout</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">₹100 / $5</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Instant UPI & PayPal</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Ledger</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">Real-Time</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Double-entry verified</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Creator Earnings Simulator */}
      <section className="py-20 bg-slate-950/60 border-y border-white/[0.08] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span>Transparent Yield Calculator</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Calculate Your Monthly Revenue Potential
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5">
              Estimate your monthly earnings based on community download traffic
            </p>
          </div>

          <div className="glass-panel-elevated p-6 sm:p-8 rounded-3xl border border-white/10 relative">
            {/* Currency Switcher */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Audience Scale
                </span>
                <span className="text-lg sm:text-xl font-bold text-white font-mono">
                  {trafficVolume.toLocaleString()} Qualified Downloads
                </span>
              </div>
              <div className="flex rounded-xl bg-slate-900 border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    currency === 'USD' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    currency === 'INR' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  INR (₹)
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="5000"
              max="500000"
              step="5000"
              value={trafficVolume}
              onChange={(e) => setTrafficVolume(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-rose-500 mb-8"
            />

            {/* Projected Output Card */}
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                  Estimated Creator Payout
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400 mt-1 flex items-baseline gap-2">
                  <span>{currency === 'USD' ? `$${estimatedUsd.toLocaleString()}` : `₹${estimatedInr.toLocaleString()}`}</span>
                  <span className="text-xs font-medium text-slate-400 uppercase">per month</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Based on qualified verification, 70% revshare & platform ads
                </div>
              </div>

              <button
                type="button"
                onClick={() => openRegisterModal()}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                Claim This Payout
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Platform Highlights */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture & Trust</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            Engineered for Creators at Scale
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-2">
            No annoying popup ad spam for your audience. Clean, high-converting download experiences with guaranteed uptime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1 */}
          <div className="glass-panel p-7 rounded-3xl border border-white/10 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-5">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">5 TB Google Drive Engine</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Seamless OAuth integration with Google Drive API v3. Upload multi-gigabyte zip files, ISOs, mods, and media with ultra-high bandwidth delivery.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-rose-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Unlimited download speeds</span>
            </div>
          </div>

          {/* Bento Card 2 */}
          <div className="glass-panel p-7 rounded-3xl border border-white/10 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">Anti-Bot Qualified Traffic</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Our multi-layer verification checks user interactions and IP integrity, ensuring advertisers pay top dollar and you receive fair earnings without clawbacks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-blue-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Fraud-free advertiser confidence</span>
            </div>
          </div>

          {/* Bento Card 3 */}
          <div className="glass-panel p-7 rounded-3xl border border-white/10 glass-panel-hover flex flex-col justify-between">
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">Instant UPI & Global Ledger</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Immutable double-entry balance records. Withdraw via instant UPI (PhonePe, GPay, Paytm) in India or PayPal/Crypto globally once you reach ₹100 / $5.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>24/7 automated settlements</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#080b12] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2.5">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-slate-300">RAGE Cloud Platform</span>
            <span>&copy; 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-slate-400 font-medium">
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <span className="text-slate-700">•</span>
            <button type="button" onClick={() => openRegisterModal()} className="hover:text-white transition-colors cursor-pointer">
              Creator Sign Up
            </button>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">Google Drive API v3 Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

