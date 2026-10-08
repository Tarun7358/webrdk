import React from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { LayoutDashboard, FolderOpen, UploadCloud, TrendingUp, Wallet } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
            <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-lg animate-pulse" />
          </div>
          <div>
            <div className="text-white font-display font-bold text-base tracking-wide">RAGE CLOUD</div>
            <p className="text-slate-400 font-mono text-xs mt-1">Synchronizing Vault Session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const mobileNav = [
    { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { to: '/files', label: 'Vault', icon: FolderOpen },
    { to: '/upload', label: 'Upload', icon: UploadCloud, highlight: true },
    { to: '/creator', label: 'Stats', icon: TrendingUp },
    { to: '/wallet', label: 'Wallet', icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col text-slate-100 selection:bg-rose-500/30 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-rose-500/5 blur-[160px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 blur-[160px] pointer-events-none rounded-full" />

      <Navbar />

      <div className="flex flex-1 relative z-10 pb-16 md:pb-0">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1424]/90 backdrop-blur-xl border-t border-white/10 px-3 py-2 flex items-center justify-around">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-[10px] font-semibold transition-all ${
                  item.highlight
                    ? 'text-white bg-gradient-to-r from-rose-600 to-rose-700 shadow-md shadow-rose-600/30 -translate-y-2'
                    : isActive
                    ? 'text-rose-400 bg-rose-500/10'
                    : 'text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

