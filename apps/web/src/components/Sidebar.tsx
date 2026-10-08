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
  ShieldAlert
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/files', label: 'My Files', icon: FolderOpen },
    { to: '/upload', label: 'Upload Files', icon: UploadCloud },
    { to: '/creator', label: 'Creator Hub', icon: TrendingUp },
    { to: '/wallet', label: 'Wallet & Ledger', icon: Wallet },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/referrals', label: 'Referrals', icon: Share2 },
    { to: '/premium', label: 'Premium Plans', icon: Crown },
  ];

  if (user?.role === 'SUPER_ADMIN') {
    links.push({ to: '/admin', label: 'Admin Command', icon: ShieldAlert });
  }

  return (
    <aside className="w-64 border-r border-dark-border bg-dark-surface/50 p-4 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">
          Platform Navigation
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-rage-accent/10 text-rage-400 border border-rage-accent/30 shadow-rage-glow-sm'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-dark-card/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Storage & Plan Badge */}
      <div className="p-3.5 rounded-2xl bg-dark-card border border-dark-border">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>Storage Backend</span>
          <span className="text-emerald-400 font-mono text-[11px] font-semibold">Active</span>
        </div>
        <div className="w-full bg-dark-bg rounded-full h-2 overflow-hidden mb-2">
          <div className="bg-gradient-to-r from-red-600 to-rage-accent h-full w-[28%]" />
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gray-500">Google Drive API</span>
          <NavLink to="/premium" className="text-rage-400 font-medium hover:underline">Upgrade</NavLink>
        </div>
      </div>
    </aside>
  );
};
