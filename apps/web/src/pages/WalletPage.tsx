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
  FileText
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
      <div className="py-20 text-center">
        <div className="w-8 h-8 border-4 border-rage-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-xs font-mono">Syncing Cryptographic Ledger & Balances...</p>
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
      setModalError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
            <WalletIcon className="w-6 h-6 text-rage-accent" />
            <span>Wallet & Immutable Ledger</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Cryptographically tracked double-entry ledger. All earnings and payouts are strictly auditable.
          </p>
        </div>
        <button
          onClick={() => {
            setModalError(null);
            setShowWithdrawModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm hover:scale-[1.02] transition-all"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Request Payout</span>
        </button>
      </div>

      {/* Balances Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-6 rounded-3xl border border-dark-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Available Balance</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            ₹{wallet?.available_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Ready for instant withdrawal request</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-dark-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Locked (In Review)</span>
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            ₹{wallet?.locked_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Pending admin / compliance payout approval</div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-dark-border">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">Total Lifetime Processed</span>
            <Clock className="w-5 h-5 text-rage-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            ₹{wallet?.total_balance.toFixed(2) || '0.00'}
          </div>
          <div className="text-xs text-gray-500 mt-1">Cumulative creator revenue credited</div>
        </div>
      </div>

      {/* Withdrawals In Flight */}
      {withdrawals.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
          <h2 className="text-base font-bold text-white font-display">Recent Payout Requests</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Method</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Admin Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300 font-mono">
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2.5 text-gray-400">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 font-bold text-white">₹{w.amount.toFixed(2)}</td>
                    <td className="py-2.5">{w.payout_method}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.status === 'COMPLETED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' :
                        w.status === 'APPROVED' ? 'bg-blue-950/40 text-blue-400 border border-blue-800/40' :
                        w.status === 'REJECTED' ? 'bg-red-950/40 text-red-400 border border-red-800/40' :
                        'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500 font-sans">{w.admin_note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Immutable Ledger Table */}
      <div className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
        <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
          <FileText className="w-5 h-5 text-rage-accent" />
          <span>Immutable Transaction Ledger</span>
        </h2>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No ledger transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-500 uppercase border-b border-dark-border/60">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 text-gray-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-dark-surface/30">
                    <td className="py-3 text-gray-400 font-mono">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-dark-card border border-dark-border text-[10px] font-mono text-gray-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 max-w-sm truncate">{tx.description}</td>
                    <td className="py-3">
                      <span className="text-emerald-400 font-medium text-[11px]">{tx.status}</span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-border">
              <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rage-accent" />
                <span>Request Payout</span>
              </h3>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRequestWithdrawal} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Amount in INR (Min. ₹100)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-white text-sm font-mono font-bold focus:outline-none focus:border-rage-accent"
                  />
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Available: ₹{wallet?.available_balance.toFixed(2) || '0.00'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('UPI')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      payoutMethod === 'UPI' ? 'border-rage-accent bg-rage-accent/10 text-white' : 'border-dark-border text-gray-400'
                    }`}
                  >
                    UPI Transfer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod('BANK_TRANSFER')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      payoutMethod === 'BANK_TRANSFER' ? 'border-rage-accent bg-rage-accent/10 text-white' : 'border-dark-border text-gray-400'
                    }`}
                  >
                    Bank NEFT / IMPS
                  </button>
                </div>
              </div>

              {payoutMethod === 'UPI' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="creator@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Account Beneficiary Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Account Holder Full Name"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Bank Account Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="01234567890"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="HDFC0001234"
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 bg-dark-bg border border-dark-border text-gray-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-5 py-2 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm"
                >
                  {withdrawLoading ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
