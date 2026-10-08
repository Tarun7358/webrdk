import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Wallet, WalletTransaction, WithdrawalRequest } from '../types';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  QrCode,
  X,
  ShieldCheck
} from 'lucide-react';

export const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Withdrawal Modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BANK_TRANSFER'>('UPI');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankHolder, setBankHolder] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [wData, txData, withData] = await Promise.all([
        api.getWallet(),
        api.getTransactions(),
        api.getMyWithdrawals()
      ]);
      setWallet(wData);
      setTransactions(txData);
      setWithdrawals(withData);
    } catch (e) {
      console.error('Error fetching wallet:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading && !wallet) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs font-mono">Syncing Cryptographic Double-Entry Ledger...</p>
      </div>
    );
  }

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const details = payoutMethod === 'UPI'
      ? { upi_id: upiId }
      : { account_number: bankAccount, ifsc: bankIfsc, holder_name: bankHolder };

    setWithdrawLoading(true);
    try {
      await api.requestWithdrawal({
        amount: Number(withdrawAmount),
        payout_method: payoutMethod,
        payout_details: details
      });
      setShowWithdrawModal(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Withdrawal transmission failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              <span>Double-Entry Verified</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
            <WalletIcon className="w-7 h-7 text-rage-accent" />
            <span>Wallet & Immutable Ledger</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Cryptographically audited creator balances. Direct payout routing via UPI and instant IMPS banking.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowWithdrawModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-rage-accent hover:bg-rage-600 text-white font-extrabold text-xs rounded-xl shadow-rage-glow hover:scale-[1.02] active:scale-95 transition-all self-start sm:self-auto"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Balances Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-emerald-500/30 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">Available For Payout</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
            ₹{wallet?.available_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Directly withdrawable to any verified UPI VPA
          </div>
        </div>

        {/* Locked Balance */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[11px] uppercase font-bold tracking-wider">Locked (In Review)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            ₹{wallet?.locked_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Pending admin authorization or anti-bot clearance
          </div>
        </div>

        {/* Total Lifetime Processed */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-3">
            <span className="text-[11px] uppercase font-bold tracking-wider">Total Lifetime Yield</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            ₹{wallet?.total_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-2 font-mono">
            Cumulative creator revenues and bonuses
          </div>
        </div>
      </div>

      {/* Payouts In Flight */}
      {withdrawals.length > 0 && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white font-display">Recent Payout Requests</h2>
            <span className="text-xs text-gray-400 font-mono">{withdrawals.length} Dispatched</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 font-mono">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-400">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-3 font-bold text-white text-sm">₹{w.amount.toFixed(2)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">
                        {w.payout_method}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        w.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40' :
                        w.status === 'APPROVED' ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40' :
                        w.status === 'REJECTED' ? 'bg-red-950/60 text-red-400 border border-red-500/40' :
                        'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 font-sans text-xs">{w.admin_note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immutable Ledger Table */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-rage-accent" />
            <span>Immutable Double-Entry Ledger</span>
          </h2>
          <span className="text-xs text-gray-400 font-mono">{transactions.length} Records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-14 text-center text-gray-500 text-xs">
            No ledger transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Entry Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Net Credit/Debit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-gray-400 font-mono text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-gray-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 max-w-sm truncate text-white">{tx.description}</td>
                    <td className="py-3">
                      <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{tx.status}</span>
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-sm">
                      <span className={tx.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {tx.amount >= 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 bg-dark-card relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-black text-white text-lg flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rage-accent" />
                <span>Request Payout</span>
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Amount (INR ₹) &bull; Min. ₹100
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-white text-base font-mono font-bold focus:outline-none focus:border-rage-accent"
                  />
                </div>
                <div className="text-[11px] text-gray-400 mt-1.5 font-mono">
                  Available Balance: <strong className="text-emerald-400">₹{wallet?.available_balance.toFixed(2) || '0.00'}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      payoutMethod === 'UPI'
                        ? 'border-rage-accent bg-rage-accent/15 text-white shadow-rage-glow-sm'
                        : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>UPI Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      payoutMethod === 'BANK_TRANSFER'
                        ? 'border-rage-accent bg-rage-accent/15 text-white shadow-rage-glow-sm'
                        : 'border-white/10 bg-white/[0.02] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank IMPS</span>
                  </button>
                </div>
              </div>

              {payoutMethod === 'UPI' ? (
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="creator@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Account Beneficiary Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Account Holder Full Name"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="01234567890"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-6 py-2.5 bg-rage-accent hover:bg-rage-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm transition-all"
                >
                  {withdrawLoading ? 'Authorizing...' : 'Authorize Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
