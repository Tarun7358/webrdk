import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const PremiumPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await api.getPlans();
        setPlans(data);
      } catch (e) {
        console.error('Error fetching plans:', e);
      }
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (tier: string) => {
    try {
      await api.subscribePlan(tier);
      alert(`Subscription to ${tier} tier activated successfully!`);
    } catch (err: any) {
      alert(`Subscription failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Title & Headline */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rage-accent/10 border border-rage-accent/20 text-rage-accent text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          <span>Creator Scaling & Cloud Power</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          Supercharge Your Distribution
        </h1>
        <p className="text-xs sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Scale your creator assets with 5 TB multi-region storage quotas, priority Google Drive delivery lanes, and ad-free instant downloads for your audience.
        </p>

        {/* Billing Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <div className="p-1 bg-black/60 border border-white/10 rounded-2xl flex items-center">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-rage-accent text-white shadow-rage-glow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-rage-accent text-white shadow-rage-glow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((p) => {
          const isFeatured = p.tier === 'PRO';
          const monthlyPrice = p.price;
          const displayPrice = billingCycle === 'yearly' && monthlyPrice > 0
            ? Math.round(monthlyPrice * 0.8)
            : monthlyPrice;

          return (
            <div
              key={p.tier}
              className={`glass-panel p-8 sm:p-9 rounded-3xl border flex flex-col justify-between relative transition-all duration-300 ${
                isFeatured
                  ? 'border-rage-accent bg-dark-card shadow-rage-glow scale-[1.03] z-10 ring-1 ring-rage-accent/50'
                  : 'border-white/10 bg-white/[0.015] hover:border-white/20'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-rage-accent text-white font-extrabold text-[10px] uppercase rounded-full tracking-widest shadow-rage-glow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommended For Creators</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-black text-white font-display">{p.name}</h3>
                  {isFeatured && <Zap className="w-5 h-5 text-rage-accent" />}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    ₹{displayPrice}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">/month</span>
                </div>

                <div className="text-xs text-gray-400 mt-2 font-mono flex items-center gap-2">
                  <span className="text-rage-400 font-bold">{p.storage_gb} GB Storage</span>
                  <span>&bull;</span>
                  <span>Max {p.max_file_mb} MB/file</span>
                </div>

                {/* Features List */}
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3.5">
                  {p.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(p.tier)}
                className={`w-full mt-8 py-3.5 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 ${
                  isFeatured
                    ? 'bg-rage-accent hover:bg-rage-600 text-white shadow-rage-glow hover:scale-[1.02] active:scale-95'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                }`}
              >
                <span>{p.price === 0 ? 'Active Default Tier' : `Upgrade to ${p.name}`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <span>All subscriptions backed by 7-day money back guarantee &bull; Cancel anytime with zero lock-in contracts.</span>
        </div>
        <span className="font-mono text-gray-500">PCI-DSS Level 1 Encrypted</span>
      </div>
    </div>
  );
};
