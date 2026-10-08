import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, User, Gift, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must contain at least 8 characters');
      return;
    }
    setIsSubmitting(true);
    try {
      await register(email, password, fullName, referralCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[300px] bg-rage-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-dark-border relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-rage-accent to-red-800 shadow-rage-glow mb-4">
            <Flame className="w-7 h-7 text-white" />
          </Link>
          <h1 className="font-display text-2xl font-black text-white">Join RAGE Cloud</h1>
          <p className="text-sm text-gray-400 mt-1">Start uploading and monetizing digital downloads</p>
        </div>

        {error && (
          <div className="p-3 mb-6 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Full Name or Channel</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Apex Creator / Tarun"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent focus:ring-1 focus:ring-rage-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@ragecloud.io"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent focus:ring-1 focus:ring-rage-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Password (Min. 8 Chars)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent focus:ring-1 focus:ring-rage-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wider">Referral Code (Optional)</label>
            <div className="relative">
              <Gift className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="RAGE-XYZ123"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-white text-sm focus:outline-none focus:border-rage-accent focus:ring-1 focus:ring-rage-accent transition-colors font-mono uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-rage-accent hover:bg-rage-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-rage-glow-sm flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Launch Creator Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-dark-border/60 text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-rage-400 font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
