import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, UploadCloud, Shield, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rage-accent to-red-800 flex items-center justify-center shadow-rage-glow-sm group-hover:shadow-rage-glow transition-all">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-wider text-white">
              RAGE <span className="text-rage-accent">CLOUD</span>
            </span>
            <span className="block text-[10px] text-gray-400 tracking-widest uppercase font-mono">
              Upload • Share • Grow • Earn
            </span>
          </div>
        </Link>

        {/* Action Controls & User menu */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/upload"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-medium text-sm rounded-lg transition-all shadow-rage-glow-sm hover:scale-[1.02]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload</span>
              </Link>

              {user.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-semibold uppercase tracking-wider hover:bg-red-950/40"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </Link>
              )}

              <div className="flex items-center gap-3 pl-2 border-l border-dark-border">
                <Link to="/wallet" className="text-right hidden sm:block">
                  <div className="text-xs text-gray-400">Wallet</div>
                  <div className="text-sm font-bold text-white font-mono flex items-center gap-1">
                    <span className="text-rage-accent font-semibold">₹</span>
                    <span>Ledger</span>
                  </div>
                </Link>

                <div className="flex items-center gap-2 bg-dark-card border border-dark-border px-3 py-1.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-rage-900/60 border border-rage-700/50 flex items-center justify-center text-rage-400 font-bold text-xs">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-200 hidden md:inline">{user.full_name}</span>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    title="Logout"
                    className="text-gray-400 hover:text-red-400 transition-colors ml-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-gray-300 hover:text-white px-3 py-2 rounded-lg hover:bg-dark-surface transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-medium text-sm rounded-lg transition-all shadow-rage-glow-sm"
              >
                Start Earning
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
