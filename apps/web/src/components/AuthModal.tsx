import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Gift,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    authModalTab, 
    authModalOptions, 
    closeAuthModal, 
    login, 
    register, 
    openLoginModal, 
    openRegisterModal 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync internal tab with context
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalTab);
      setError(null);
      setSuccessMsg(null);
      if (authModalOptions.defaultEmail) {
        setEmail(authModalOptions.defaultEmail);
      }
      if (authModalOptions.referralCode) {
        setReferralCode(authModalOptions.referralCode);
      }
    }
  }, [isAuthModalOpen, authModalTab, authModalOptions]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (activeTab === 'login') {
        await login(email.trim(), password);
      } else if (activeTab === 'register') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        await register(email.trim(), password, fullName.trim(), referralCode.trim() || undefined);
      } else if (activeTab === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address');
        }
        await api.forgotPassword(email.trim());
        setSuccessMsg(`A 6-digit OTP code has been dispatched to ${email.trim()}. Please check your Inbox and Spam/Junk folder.`);
        setActiveTab('reset');
      } else if (activeTab === 'reset') {
        if (!otpCode.trim() || otpCode.trim().length < 4) {
          throw new Error('Please enter the verification code sent to your email');
        }
        if (!newPassword || newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters long');
        }
        await api.resetPassword({
          email: email.trim(),
          otp_code: otpCode.trim(),
          new_password: newPassword
        });
        setSuccessMsg('Your password has been successfully reset! You can now sign in.');
        setPassword(newPassword);
        setActiveTab('login');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Authentication request failed.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent Header */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-36 w-72 rounded-full bg-rose-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <img 
              src="/logo.png" 
              alt="RAGE Logo" 
              className="h-16 w-16 object-contain drop-shadow-[0_0_16px_rgba(244,63,94,0.6)]" 
            />
          </div>
          <h2 className="text-2xl font-black font-display tracking-tight text-white">
            {activeTab === 'login' && 'Welcome Back to RAGE'}
            {activeTab === 'register' && 'Start Earning with RAGE'}
            {activeTab === 'forgot' && 'Reset Your Password'}
            {activeTab === 'reset' && 'Enter Verification Code'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'login' && 'Access your creator vault, analytics & payouts'}
            {activeTab === 'register' && 'Default 10 GB free vault, instant monetized links & 60% revshare'}
            {activeTab === 'forgot' && "We'll send a 6-digit OTP code to your registered email"}
            {activeTab === 'reset' && `Check your inbox (${email || 'your email'}) for the code`}
          </p>
        </div>

        {/* Tab Switcher (only for login & register) */}
        {(activeTab === 'login' || activeTab === 'register') && (
          <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setError(null);
                setSuccessMsg(null);
                openLoginModal();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
                setSuccessMsg(null);
                openRegisterModal();
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMsg}</div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab === 'login' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  <input
                    type="text"
                    placeholder="e.g. VIP2026"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors uppercase"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'reset' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    6-Digit OTP Verification Code
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      if (!email.trim()) return;
                      setLoading(true);
                      setError(null);
                      try {
                        await api.forgotPassword(email.trim());
                        setSuccessMsg(`A fresh 6-digit OTP code has been dispatched to ${email.trim()}. Please check your Inbox and Spam folder.`);
                      } catch (e: any) {
                        setError(e.message || 'Failed to resend verification OTP.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-4 py-2.5 text-base tracking-widest font-mono text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  New Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-slate-900/90 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 hover:opacity-95 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer mt-2"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>
                  {activeTab === 'login' && 'Sign In Now'}
                  {activeTab === 'register' && 'Create Free Account (10 GB Free)'}
                  {activeTab === 'forgot' && 'Send Verification OTP'}
                  {activeTab === 'reset' && 'Confirm & Reset Password'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {/* Back links for forgot & reset */}
          {(activeTab === 'forgot' || activeTab === 'reset') && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Automated security via GoDaddy SMTP &bull; support@ragefps.in</span>
        </div>
      </div>
    </div>
  );
};
