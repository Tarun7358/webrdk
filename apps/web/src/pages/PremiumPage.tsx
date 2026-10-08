import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Copy,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  FileCheck2,
  AlertCircle
} from 'lucide-react';

interface Plan {
  name: string;
  tier: string;
  price: number;
  storage_gb: number;
  max_file_mb: number;
  no_ads: boolean;
  priority: boolean;
  features: string[];
}

export const PremiumPage: React.FC = () => {
  const { user, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([
    {
      name: "Free Starter",
      tier: "FREE",
      price: 0,
      storage_gb: 10,
      max_file_mb: 1000,
      no_ads: false,
      priority: false,
      features: [
        "10 GB Free Storage Quota",
        "Standard high-speed downloads",
        "Automated creator monetization",
        "Direct payouts via UPI"
      ]
    },
    {
      name: "Pro Gamer",
      tier: "PRO_GAMER",
      price: 299,
      storage_gb: 20,
      max_file_mb: 5000,
      no_ads: true,
      priority: true,
      features: [
        "20 GB Cloud Storage Vault",
        "Ad-Free download pages for your audience",
        "Uncapped Turbo download speeds",
        "Advanced download logs & traffic stats",
        "Priority creator technical support"
      ]
    },
    {
      name: "Creator Studio",
      tier: "CREATOR_STUDIO",
      price: 799,
      storage_gb: 50,
      max_file_mb: 10000,
      no_ads: true,
      priority: true,
      features: [
        "50 GB High-Speed Cloud Storage",
        "Custom branded download portals",
        "Highest creator monetization revshare",
        "Direct team collaboration & folder splits",
        "VIP 24/7 dedicated creator manager"
      ]
    }
  ]);

  const [paymentInfo, setPaymentInfo] = useState({
    upi_id: "rdxyzprvt-1@oksbi",
    account_name: "RAGE CLOUD Services"
  });

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansData = await api.getPlans();
        if (Array.isArray(plansData) && plansData.length > 0) {
          setPlans(plansData);
        }
      } catch (e) {
        console.error('Error fetching plans:', e);
      }

      try {
        const info = await api.getSubscriptionPaymentInfo();
        if (info?.upi_id) setPaymentInfo(info);
      } catch (e) {
        console.error('Error fetching payment info:', e);
      }

      if (user) {
        try {
          const reqs = await api.getMySubscriptionRequests();
          setMyRequests(reqs);
        } catch (e) {
          console.error('Error fetching requests:', e);
        }
      }
    };

    fetchData();
  }, [user]);

  const handleOpenPayment = (plan: Plan) => {
    if (plan.price === 0) return;
    if (!user) {
      openLoginModal();
      return;
    }
    setSelectedPlan(plan);
    setUtrNumber('');
    setScreenshotData(null);
    setSubmitError(null);
    setSubmissionSuccess(false);
    setIsQrModalOpen(true);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(paymentInfo.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Screenshot size must be under 5 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
      setSubmitError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!utrNumber.trim()) {
      setSubmitError('Please enter the 12-digit UPI Transaction Reference / UTR Number.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.submitSubscriptionRequest({
        plan_tier: selectedPlan.tier,
        plan_name: selectedPlan.name,
        amount_inr: selectedPlan.price,
        storage_gb: selectedPlan.storage_gb,
        utr_number: utrNumber.trim(),
        proof_image_data: screenshotData || undefined
      });

      setSubmissionSuccess(true);
      // Refresh requests list
      const updated = await api.getMySubscriptionRequests();
      setMyRequests(updated);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate UPI URI
  const upiUri = selectedPlan
    ? `upi://pay?pa=${paymentInfo.upi_id}&pn=RAGE%20CLOUD&am=${selectedPlan.price}&cu=INR&tn=${encodeURIComponent(selectedPlan.name + ' Plan')}`
    : `upi://pay?pa=${paymentInfo.upi_id}&pn=RAGE%20CLOUD&cu=INR`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/dashboard');
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-xs font-bold transition-all hover:-translate-x-0.5 cursor-pointer shadow-md group"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          <span>Back</span>
        </button>
      </div>

      {/* Title & Headline */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
          <Crown className="w-3.5 h-3.5" />
          <span>Transparent Creator Storage & Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white font-display tracking-tight">
          Level Up Your Cloud Vault
        </h1>
        <p className="text-xs sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Every user receives an automated <strong className="text-white">10 GB Free Vault</strong>. Upgrade seamlessly using QR code instant payment for expanded capacity and turbo creator privileges.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((p) => {
          const isFeatured = p.tier === 'PRO_GAMER';
          const isCreator = p.tier === 'CREATOR_STUDIO';
          const isCurrentPlan = user?.plan_tier === p.tier;

          return (
            <div
              key={p.tier}
              className={`glass-panel p-8 sm:p-9 rounded-3xl border flex flex-col justify-between relative transition-all duration-300 ${
                isFeatured
                  ? 'border-rose-500 bg-[#131127] shadow-[0_0_35px_rgba(244,63,94,0.25)] scale-[1.03] z-10 ring-1 ring-rose-500/50'
                  : isCreator
                  ? 'border-indigo-500/40 bg-gradient-to-b from-[#16122d] to-[#0c0a1a]'
                  : 'border-white/10 bg-white/[0.015] hover:border-white/20'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-extrabold text-[10px] uppercase rounded-full tracking-widest shadow-md flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Most Popular &bull; Pro Gamer</span>
                </div>
              )}

              {isCreator && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white font-extrabold text-[10px] uppercase rounded-full tracking-widest shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>Maximum Power</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl sm:text-2xl font-black text-white font-display">{p.name}</h3>
                  {isFeatured && <Zap className="w-5 h-5 text-rose-400" />}
                  {isCreator && <Crown className="w-5 h-5 text-indigo-400" />}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                    ₹{p.price}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">/month</span>
                </div>

                <div className="text-xs text-gray-400 mt-2 font-mono flex items-center gap-2">
                  <span className="text-rose-400 font-bold">{p.storage_gb} GB Storage</span>
                  <span>&bull;</span>
                  <span>Max {p.max_file_mb} MB/file</span>
                </div>

                {/* Features List */}
                <div className="mt-8 pt-6 border-t border-white/10 space-y-3.5">
                  {p.features.map((f: string, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-xs text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-tight">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                {p.price === 0 ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl font-bold text-xs bg-white/5 border border-white/10 text-slate-400 cursor-default"
                  >
                    {isCurrentPlan ? '✓ Your Active Tier (10 GB Free)' : 'Default Starter (10 GB Free)'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenPayment(p)}
                    className={`w-full py-3.5 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isFeatured
                        ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 active:scale-95'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay ₹{p.price} via QR Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User's Previous / Pending Requests */}
      {user && myRequests.length > 0 && (
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Your Subscription Upgrade History</span>
            </h3>
            <span className="text-xs text-slate-400">{myRequests.length} submission(s)</span>
          </div>

          <div className="divide-y divide-white/5">
            {myRequests.map((req) => (
              <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-white">{req.plan_name} ({req.storage_gb} GB) - ₹{req.amount_inr}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    UTR: <span className="font-mono text-slate-300">{req.utr_number}</span> &bull; Submitted: {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === 'PENDING' && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3" />
                      <span>Review Pending</span>
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approved & Active</span>
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3 h-3" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust & Guarantee Banner */}
      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
          <span>Manual bank verification ensures 100% security &bull; Approvals processed with confirmation sent to your email.</span>
        </div>
        <span className="font-mono text-gray-500">Official Support: support@ragefps.in</span>
      </div>

      {/* QR Code Payment Modal */}
      {isQrModalOpen && selectedPlan && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f172a] p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {submissionSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <FileCheck2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white font-display">
                  Payment Proof Submitted!
                </h3>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-sm">
                  "You will be replied in the mail soon"
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  Our administration team has received your transaction reference (<span className="font-mono text-white">{utrNumber}</span>) for the <strong>{selectedPlan.name}</strong> plan.
                  Once verified, your vault storage will automatically upgrade to <strong>{selectedPlan.storage_gb} GB</strong> and an activation email will be delivered to <strong>{user?.email}</strong>.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => setIsQrModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase mb-2">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>UPI Scan & Pay</span>
                  </div>
                  <h3 className="text-2xl font-black text-white font-display">
                    Upgrade to {selectedPlan.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Pay <strong>₹{selectedPlan.price}</strong> for <strong>{selectedPlan.storage_gb} GB Storage Vault</strong>
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/5 border border-white/10 mb-6">
                  <div className="bg-white p-3 rounded-2xl shadow-lg mb-3">
                    <img 
                      src={qrImageUrl} 
                      alt="UPI Payment QR Code" 
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400">UPI ID:</span>
                    <span className="font-mono text-sm font-bold text-rose-400">{paymentInfo.upi_id}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {copiedUpi && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supported: Google Pay, PhonePe, Paytm, BHIM, CRED or any Banking UPI App
                  </p>
                </div>

                {/* Proof Submission Form */}
                <form onSubmit={handleSubmitProof} className="space-y-4">
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Transaction UTR / Reference Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 429302194821 (12 digits)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="w-full rounded-xl bg-slate-900 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Upload Screenshot Proof (Optional but Recommended)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-500 file:text-white hover:file:bg-rose-600 cursor-pointer"
                      />
                    </div>
                    {screenshotData && (
                      <div className="mt-2 p-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <img src={screenshotData} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                        <span className="text-xs text-emerald-400 font-semibold">Screenshot attached</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full mt-2 py-3.5 rounded-xl font-extrabold text-xs bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Submit Payment Proof (₹{selectedPlan.price})</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
