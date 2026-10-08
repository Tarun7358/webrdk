import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, Shield, LogOut, Wallet, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, openLoginModal, openRegisterModal } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0b0f19]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="relative flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="RAGE Logo" 
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(244,63,94,0.5)] group-hover:scale-105 group-hover:drop-shadow-[0_0_18px_rgba(244,63,94,0.8)] transition-all"
            />
          </div>
          <div>
            <div className="font-display font-extrabold text-lg tracking-wider text-white flex items-center gap-1.5">
              <span>RAGE</span>
              <span className="text-rose-500">CLOUD</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md">
                v2.4
              </span>
            </div>
            <span className="block text-[10px] text-slate-400 font-mono tracking-wider uppercase">
              Monetized Creator Cloud
            </span>
          </div>
        </Link>

        {/* Public Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <Link to="/" className="hover:text-white transition-colors">
            Platform
          </Link>
          <Link to="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          {user && (
            <>
              <Link to="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link to="/files" className="hover:text-white transition-colors">
                My Files
              </Link>
              <Link to="/creator" className="hover:text-white transition-colors">
                Earnings
              </Link>
            </>
          )}
        </nav>

        {/* Action Controls & User menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/upload"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-600/20 hover:shadow-rose-600/40 transition-all active:scale-[0.98]"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload</span>
              </Link>

              {(user.role === 'OWNER' || user.email === 'rdxyzprvt@gmail.com') && (
                <Link
                  to="/owner"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors shadow-sm"
                >
                  <Shield className="w-3 h-3 text-amber-400" />
                  <span>Owner</span>
                </Link>
              )}

              {user.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px] font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-colors"
                >
                  <Shield className="w-3 h-3" />
                  <span>Admin</span>
                </Link>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <Link 
                  to="/wallet" 
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-white/15 text-xs text-slate-300 hover:text-white transition-colors"
                  title="Creator Wallet"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono font-bold text-white">Wallet</span>
                </Link>

                <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 px-2.5 py-1.5 rounded-xl">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-xs">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserIcon className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 hidden md:inline max-w-[120px] truncate">
                    {user.full_name}
                  </span>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    title="Sign Out"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openRegisterModal()}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                Start Earning Free
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

