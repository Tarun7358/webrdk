import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  HardDrive,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/files', label: 'My Vault', icon: FolderOpen },
    { to: '/upload', label: 'Upload Station', icon: UploadCloud },
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

  return (
    <aside className="w-64 border-r border-white/[0.08] bg-[#0d1424]/60 backdrop-blur-xl p-4 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 flex items-center justify-between">
          <span>Navigation</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono">
            LIVE
          </span>
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
            5 TB Tier
          </span>
        </div>

        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden mb-2.5">
          <div className="bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 h-full w-[24%]" />
        </div>

        <div className="flex justify-between items-center text-[10px] text-slate-400">
          <span>1.2 TB used of 5 TB</span>
          <NavLink to="/premium" className="text-rose-400 font-bold hover:text-rose-300 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            Boost
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

