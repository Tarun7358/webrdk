import React, { useEffect, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  LayoutDashboard,
  FolderOpen,
  UploadCloud,
  TrendingUp,
  Wallet,
  Users,
  Share2,
  Crown,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { InstagramIcon } from '../pages/InstagramAutoDmPage';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [liveUsedBytes, setLiveUsedBytes] = useState<number | null>(null);

  const fetchLiveUsage = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Try dedicated endpoint first
      try {
        const usage = await api.getStorageUsage();
        if (usage && typeof usage.storage_used_bytes === 'number' && usage.storage_used_bytes > 0) {
          setLiveUsedBytes(usage.storage_used_bytes);
          return;
        }
      } catch {
        // Fall back to files list
      }

      // 2. Sum active files directly from getMyFiles (100% works across all environments)
      const files = await api.getMyFiles();
      if (Array.isArray(files)) {
        const total = files.reduce((acc: number, f: any) => acc + (Number(f.size) || 0), 0);
        setLiveUsedBytes(total);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [user]);

  useEffect(() => {
    fetchLiveUsage();

    const handleUpdate = () => {
      fetchLiveUsage();
    };

    window.addEventListener('rage-storage-updated', handleUpdate);
    return () => {
      window.removeEventListener('rage-storage-updated', handleUpdate);
    };
  }, [fetchLiveUsage]);

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/files', label: 'My Vault', icon: FolderOpen },
    { to: '/upload', label: 'Upload Station', icon: UploadCloud },
    { to: '/instagram', label: 'Instagram Auto-DM', icon: InstagramIcon },
    { to: '/creator', label: 'Creator Hub', icon: TrendingUp },
    { to: '/wallet', label: 'Wallet & Payouts', icon: Wallet },
    { to: '/teams', label: 'Teams & Orgs', icon: Users },
    { to: '/referrals', label: 'Referral Rewards', icon: Share2 },
    { to: '/premium', label: 'Plans & Boosters', icon: Crown },
  ];

  if (user?.role === 'OWNER' || user?.email === 'rdxyzprvt@gmail.com') {
    links.push({ to: '/owner', label: 'Owner Portal', icon: ShieldAlert });
  }

  if (user?.role === 'SUPER_ADMIN') {
    links.push({ to: '/admin', label: 'Admin Command', icon: ShieldAlert });
  }

  // Real Storage Quota Calculation for the logged-in person's assigned storage
  const usedBytes = (liveUsedBytes !== null && liveUsedBytes > 0)
    ? liveUsedBytes
    : (user?.storage_used_bytes && user.storage_used_bytes > 0
        ? user.storage_used_bytes
        : (liveUsedBytes !== null ? liveUsedBytes : 0));

  const limitBytes = user?.storage_limit_bytes ?? (10 * 1024 * 1024 * 1024);

  const formatStorage = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    // Show 2 decimals for precision under 100 MB/GB (e.g. 27.79 MB)
    const formattedVal = val % 1 === 0 ? val.toString() : (val < 100 ? val.toFixed(2) : val.toFixed(1));
    return `${formattedVal} ${sizes[i]}`;
  };

  const getTierBadge = () => {
    if (user?.role === 'OWNER' || user?.plan_tier === 'OWNER' || user?.email === 'rdxyzprvt@gmail.com') {
      return '500 GB Tier';
    }
    if (user?.plan_tier === 'CREATOR_STUDIO') {
      return '50 GB Tier';
    }
    if (user?.plan_tier === 'PRO_GAMER') {
      return '20 GB Tier';
    }
    const limitGb = Math.round(limitBytes / (1024 * 1024 * 1024));
    return `${limitGb || 10} GB Tier`;
  };

  const percentUsed = Math.min(100, Math.max(0, (usedBytes / limitBytes) * 100));
  const barWidth = usedBytes > 0 ? Math.max(percentUsed, 2) : 0;

  return (
    <aside className="w-64 border-r border-white/[0.08] bg-[#0d1424]/60 backdrop-blur-xl p-4 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3">
          <span>Navigation</span>
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-rose-500/15 text-white border border-rose-500/30 shadow-md shadow-rose-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="font-semibold">{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Storage Backend & Quota Card */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
            <HardDrive className="w-3.5 h-3.5 text-rose-400" />
            <span>Google Drive CDN</span>
          </div>
          <span className="text-emerald-400 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            {getTierBadge()}
          </span>
        </div>

        <div 
          className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mb-2.5"
          title={`${percentUsed.toFixed(1)}% used`}
        >
          <div 
            className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 h-full transition-all duration-500" 
            style={{ width: `${barWidth}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>{formatStorage(usedBytes)} used of {formatStorage(limitBytes)}</span>
          <NavLink to="/pricing" className="text-rose-400 font-bold hover:text-rose-300 transition-colors">
            Boost
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

