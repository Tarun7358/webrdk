import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Crown, Check } from 'lucide-react';

export const PremiumPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);

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
      alert(`Subscription to ${tier} activated successfully!`);
    } catch (err: any) {
      alert(`Subscription failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-white font-display flex items-center justify-center gap-2">
          <Crown className="w-8 h-8 text-rage-accent" />
          <span>Membership & Storage Tiers</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
          Scale your creator assets with higher storage quotas, priority streaming speed, and zero advertisement downloads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((p) => {
          const isFeatured = p.tier === 'PRO';
          return (
            <div
              key={p.tier}
              className={`glass-panel p-8 rounded-3xl border flex flex-col justify-between relative transition-all ${
                isFeatured
                  ? 'border-rage-accent bg-dark-card shadow-rage-glow'
                  : 'border-dark-border hover:border-gray-600'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-rage-accent text-white font-bold text-[10px] uppercase rounded-full tracking-wider">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white font-display">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white font-mono">₹{p.price}</span>
                  <span className="text-xs text-gray-400">/month</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono">
                  {p.storage_gb} GB Cloud Storage • Max {p.max_file_mb} MB/file
                </div>

                <div className="mt-6 pt-6 border-t border-dark-border/60 space-y-3">
                  {p.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSubscribe(p.tier)}
                className={`w-full mt-8 py-3 rounded-xl font-bold text-xs transition-all ${
                  isFeatured
                    ? 'bg-rage-accent hover:bg-rage-600 text-white shadow-rage-glow-sm'
                    : 'bg-dark-bg border border-dark-border text-gray-200 hover:bg-dark-card'
                }`}
              >
                {p.price === 0 ? 'Current Plan' : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
