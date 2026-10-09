import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import {
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  FileText,
  Sparkles,
  Clock,
  Sliders,
  CheckCircle,
  XCircle,
  HelpCircle,
  Zap,
  Lock,
  Flame,
  ArrowRight
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

export const InstagramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

interface InstagramAccount {
  id: string;
  instagram_business_id: string;
  facebook_page_id?: string;
  username: string;
  hourly_limit: number;
  daily_limit: number;
  dms_sent_today: number;
  is_active: boolean;
  created_at: string;
}

interface InstagramCampaign {
  id: string;
  file_id: string;
  file_name: string;
  title: string;
  trigger_keywords: string;
  dm_templates: string[];
  reply_comments: string[];
  send_comment_reply: boolean;
  is_active: boolean;
  total_dms_sent: number;
  created_at: string;
}

interface InstagramDmLog {
  id: string;
  campaign_id: string;
  recipient_ig_id: string;
  recipient_username: string;
  comment_id?: string;
  comment_text?: string;
  dm_text_sent?: string;
  status: string;
  error_message?: string;
  created_at: string;
}

export const InstagramAutoDmPage: React.FC = () => {
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [campaigns, setCampaigns] = useState<InstagramCampaign[]>([]);
  const [logs, setLogs] = useState<InstagramDmLog[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'logs' | 'guide'>('campaigns');

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<InstagramCampaign | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // 1-Click Meta OAuth States
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  // Detect OAuth redirect outcomes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const handle = params.get('handle');
    const err = params.get('error');

    if (connected === 'true') {
      setOauthSuccess(`🎉 Successfully connected @${handle || 'your Instagram account'} via Meta OAuth!`);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (err) {
      setOauthError(decodeURIComponent(err));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleStartOAuth = async () => {
    try {
      setOauthLoading(true);
      setOauthError(null);
      const res = await api.getInstagramOAuthLoginUrl(window.location.origin + '/instagram');
      if (res?.login_url) {
        window.location.href = res.login_url;
      }
    } catch (err: any) {
      setOauthError(err.message || 'Failed to initiate Meta OAuth login.');
      setShowManualForm(true);
    } finally {
      setOauthLoading(false);
    }
  };

  // Connect Account Form
  const [connectForm, setConnectForm] = useState({
    instagram_business_id: '',
    facebook_page_id: '',
    username: '',
    access_token: '',
    hourly_limit: 30,
    daily_limit: 100
  });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Campaign Form
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    file_id: '',
    trigger_keywords: 'link, send, dl, download, pack',
    dm_templates: [
      'Hey @{username}! 🔥 Here is your requested download link for {file_name}: {download_link}',
      'Yo @{username}! You asked for the link, here you go: {download_link} 🚀',
      'Here is the download for {file_name}: {download_link} Enjoy! ✨'
    ],
    reply_comments: [
      'Sent to your DM! Check your inbox 📩',
      'Check your message requests! 🚀',
      'Link sent in your DM! ✨'
    ],
    send_comment_reply: true
  });
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Load Data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [accRes, campRes, filesRes] = await Promise.all([
        api.getInstagramAccount().catch(() => null),
        api.getInstagramCampaigns().catch(() => []),
        api.getMyFiles().catch(() => [])
      ]);
      setAccount(accRes);
      setCampaigns(campRes || []);
      setFiles(filesRes || []);
      if (accRes) {
        setConnectForm({
          instagram_business_id: accRes.instagram_business_id || '',
          facebook_page_id: accRes.facebook_page_id || '',
          username: accRes.username || '',
          access_token: '',
          hourly_limit: accRes.hourly_limit || 30,
          daily_limit: accRes.daily_limit || 100
        });
      }
    } catch (err) {
      console.error('Failed to load Instagram data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setIsRefreshingLogs(true);
      const res = await api.getInstagramLogs();
      setLogs(res || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsRefreshingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, fetchLogs]);

  // Handle Account Connect
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    if (!connectForm.instagram_business_id || !connectForm.username || !connectForm.access_token) {
      setAccountError('Please fill in Instagram Business ID, Username, and Meta Access Token.');
      return;
    }
    try {
      setIsSavingAccount(true);
      const res = await api.connectInstagramAccount(connectForm);
      setAccount(res);
      setShowConnectModal(false);
    } catch (err: any) {
      setAccountError(err.message || 'Failed to connect Instagram account.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect this Instagram account? Active campaigns will pause.')) return;
    try {
      await api.disconnectInstagramAccount();
      setAccount(null);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  // Handle Campaign Submit
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignError(null);
    if (!campaignForm.title || !campaignForm.file_id || !campaignForm.trigger_keywords) {
      setCampaignError('Please provide a campaign title, select a file, and enter trigger keywords.');
      return;
    }
    const validTemplates = campaignForm.dm_templates.filter(t => t.trim().length > 0);
    if (validTemplates.length === 0) {
      setCampaignError('Please enter at least one DM template variation.');
      return;
    }

    try {
      setIsSavingCampaign(true);
      if (editingCampaign) {
        const updated = await api.updateInstagramCampaign(editingCampaign.id, {
          title: campaignForm.title,
          trigger_keywords: campaignForm.trigger_keywords,
          dm_templates: validTemplates,
          reply_comments: campaignForm.reply_comments.filter(r => r.trim().length > 0),
          send_comment_reply: campaignForm.send_comment_reply
        });
        setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await api.createInstagramCampaign({
          file_id: campaignForm.file_id,
          title: campaignForm.title,
          trigger_keywords: campaignForm.trigger_keywords,
          dm_templates: validTemplates,
          reply_comments: campaignForm.reply_comments.filter(r => r.trim().length > 0),
          send_comment_reply: campaignForm.send_comment_reply
        });
        setCampaigns(prev => [created, ...prev]);
      }
      setShowCampaignModal(false);
      setEditingCampaign(null);
    } catch (err: any) {
      setCampaignError(err.message || 'Failed to save campaign.');
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleToggleCampaign = async (campaign: InstagramCampaign) => {
    try {
      const updated = await api.updateInstagramCampaign(campaign.id, {
        is_active: !campaign.is_active
      });
      setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (err) {
      console.error('Error toggling campaign:', err);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Delete this Auto-DM campaign permanently?')) return;
    try {
      await api.deleteInstagramCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting campaign:', err);
    }
  };

  const openCreateModal = () => {
    setEditingCampaign(null);
    setCampaignForm({
      title: '',
      file_id: files[0]?.id || '',
      trigger_keywords: 'link, send, dl, download, pack',
      dm_templates: [
        'Hey @{username}! 🔥 Here is your requested download link for {file_name}: {download_link}',
        'Yo @{username}! You asked for the link, here you go: {download_link} 🚀',
        'Here is the download for {file_name}: {download_link} Enjoy! ✨'
      ],
      reply_comments: [
        'Sent to your DM! Check your inbox 📩',
        'Check your message requests! 🚀',
        'Link sent in your DM! ✨'
      ],
      send_comment_reply: true
    });
    setCampaignError(null);
    setShowCampaignModal(true);
  };

  const openEditModal = (c: InstagramCampaign) => {
    setEditingCampaign(c);
    setCampaignForm({
      title: c.title,
      file_id: c.file_id,
      trigger_keywords: c.trigger_keywords,
      dm_templates: c.dm_templates.length > 0 ? c.dm_templates : ['Hey @{username}! Link: {download_link}'],
      reply_comments: c.reply_comments.length > 0 ? c.reply_comments : ['Sent to your DM! 📩'],
      send_comment_reply: c.send_comment_reply
    });
    setCampaignError(null);
    setShowCampaignModal(true);
  };

  const copySample = (text: string) => {
    copyToClipboard(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 text-xs font-mono">Syncing Instagram Graph API & Active Campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 text-pink-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Viral Growth Engine</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Anti-Ban Protected</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <span>Instagram Auto-DM Automation</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            Automatically detect Reel/Post comments like <span className="text-pink-400 font-mono">"LINK"</span> and dispatch instant monetization links directly to user DMs with Meta rate-limiting guardrails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {account ? (
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Campaign</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <InstagramIcon className="w-4 h-4" />
              <span>Connect Instagram</span>
            </button>
          )}
        </div>
      </div>

      {/* OAuth Success Alert */}
      {oauthSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{oauthSuccess}</span>
          </div>
          <button onClick={() => setOauthSuccess(null)} className="text-emerald-400/60 hover:text-emerald-400">✕</button>
        </div>
      )}

      {/* OAuth Error Alert */}
      {oauthError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{oauthError}</span>
          </div>
          <button onClick={() => setOauthError(null)} className="text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}

      {/* Account Connection Status Banner */}
      {account ? (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-950/20 via-purple-950/10 to-dark-surface border border-pink-500/20 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-pink-500/30">
                @{account.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">@{account.username}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Live & Connected
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  IG Business ID: <span className="font-mono text-gray-300">{account.instagram_business_id}</span>
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Hourly Velocity Cap: <strong className="text-white">{account.hourly_limit}/hr</strong></span>
                  <span>•</span>
                  <span>Daily Meta Quota: <strong className="text-white">{account.daily_limit}/day</strong></span>
                </div>
              </div>
            </div>

            {/* Daily Usage Progress Bar */}
            <div className="lg:w-72 bg-black/40 border border-white/5 p-3.5 rounded-xl">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="text-gray-400">Today's Delivery Quota</span>
                <span className="font-mono text-pink-400 font-bold">
                  {account.dms_sent_today} / {account.daily_limit} DMs
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((account.dms_sent_today / (account.daily_limit || 1)) * 100))}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Resets every 24 hours automatically
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust Limits</span>
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-dark-surface to-dark-card border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-pink-400">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect Your Instagram Creator/Business Account</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Link your Meta Graph API token to start auto-delivering file download links to your Reel commenters.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 flex items-center gap-2 whitespace-nowrap transition-all hover:scale-105 active:scale-95"
          >
            <InstagramIcon className="w-4 h-4" />
            <span>Connect Account Now</span>
          </button>
        </div>
      )}

      {/* Safety & Compliance Guardrails Notice */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-pink-500/20 transition-colors">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>24h Deduplication</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Never spams the same commenter twice within 24 hours even if they comment 10 times.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-colors">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs mb-1">
            <Zap className="w-4 h-4" />
            <span>Velocity Capping</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Strict limits of 30 DMs/hour to protect your Instagram account from automated action blocks.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-colors">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Spintax Variation</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Rotates dynamic message variations so Instagram spam detectors never see identical repetitive text.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-colors">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
            <Lock className="w-4 h-4" />
            <span>Opt-Out Protection</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Commenters typing "STOP" or "unsubscribe" are immediately excluded to ensure Meta compliance.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'campaigns'
              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Active Campaigns ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Delivery Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Meta Setup Guide</span>
        </button>
      </div>

      {/* Tab 1: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">No Auto-DM Campaigns Yet</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                  Create a campaign linking one of your RAGE Vault files to keyword triggers like <span className="text-pink-400 font-mono">"LINK"</span> or <span className="text-pink-400 font-mono">"SEND"</span>.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                disabled={!account}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 inline-flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Campaign</span>
              </button>
              {!account && (
                <p className="text-[11px] text-amber-400">
                  ⚠️ Please connect your Instagram Business account above first.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-dark-card border border-white/5 hover:border-pink-500/30 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white group-hover:text-pink-300 transition-colors">
                            {camp.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              camp.is_active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                            }`}
                          >
                            {camp.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                          <FileText className="w-3.5 h-3.5 text-pink-400" />
                          <span className="font-medium text-gray-300">{camp.file_name}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCampaign(camp)}
                        className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                          camp.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                        title={camp.is_active ? 'Pause Campaign' : 'Activate Campaign'}
                      >
                        {camp.is_active ? 'Active' : 'Paused'}
                      </button>
                    </div>

                    {/* Keywords Chips */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
                        Trigger Keywords
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {camp.trigger_keywords.split(',').map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-300 font-mono text-[11px]"
                          >
                            #{kw.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats & Details */}
                    <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-gray-400">
                        <span>DMs Successfully Sent:</span>
                        <strong className="text-white font-mono">{camp.total_dms_sent} DMs</strong>
                      </div>
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Spintax Variations:</span>
                        <span className="text-gray-300 font-mono">{camp.dm_templates.length} templates</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-400">
                        <span>Public Comment Reply:</span>
                        <span className={camp.send_comment_reply ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
                          {camp.send_comment_reply ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 font-mono">
                      Created {new Date(camp.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(camp)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Live chronological record of Instagram webhook triggers and automated DM responses.
            </p>
            <button
              onClick={fetchLogs}
              disabled={isRefreshingLogs}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
              <Clock className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No delivery logs recorded yet</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Once commenters start commenting your trigger keywords on your connected Instagram account, live events will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-dark-card">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-gray-400 font-mono text-[11px]">
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Trigger Comment</th>
                    <th className="py-3 px-4">Message Sent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white font-mono">@{log.recipient_username}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-gray-300">
                        "{log.comment_text || '—'}"
                      </td>
                      <td className="py-3 px-4 max-w-md truncate text-pink-300 font-mono text-[11px]">
                        {log.dm_text_sent || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                            log.status === 'SENT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : log.status === 'RATE_LIMITED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {log.status === 'SENT' && <CheckCircle className="w-3 h-3" />}
                          {log.status !== 'SENT' && <XCircle className="w-3 h-3" />}
                          <span>{log.status}</span>
                        </span>
                        {log.error_message && (
                          <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-xs">
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Setup Guide */}
      {activeTab === 'guide' && (
        <div className="p-6 rounded-2xl bg-dark-card border border-white/5 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <InstagramIcon className="w-5 h-5 text-pink-400" />
              <span>How to Connect Your Instagram to RAGE Cloud Auto-DM</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Follow these simple official Meta Developer steps to enable comment automation on your account without risks of account bans.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">1</span>
                <span>Switch to Instagram Creator or Business Account</span>
              </div>
              <p className="text-xs text-gray-400 pl-8 leading-relaxed">
                In your Instagram app, go to <strong>Settings & Privacy &gt; Account type and tools &gt; Switch to professional account</strong>. Select <em>Creator</em> or <em>Business</em>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">2</span>
                <span>Connect Instagram to a Facebook Page</span>
              </div>
              <p className="text-xs text-gray-400 pl-8 leading-relaxed">
                Meta requires all Instagram Business APIs to be routed through a linked Facebook Page. Create any free Facebook Page and link it under Instagram <strong>Edit Profile &gt; Page</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">3</span>
                <span>Generate Meta Graph API Access Token</span>
              </div>
              <p className="text-xs text-gray-400 pl-8 leading-relaxed">
                Go to <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-pink-400 underline font-medium">Meta Graph API Explorer</a>. Select your App, request permissions <code className="bg-black/40 px-1 py-0.5 rounded text-pink-300">instagram_basic</code>, <code className="bg-black/40 px-1 py-0.5 rounded text-pink-300">instagram_manage_messages</code>, and <code className="bg-black/40 px-1 py-0.5 rounded text-pink-300">instagram_manage_comments</code>, and click <strong>Generate Access Token</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs">4</span>
                <span>Configure Webhook in Meta App Dashboard</span>
              </div>
              <p className="text-xs text-gray-400 pl-8 leading-relaxed">
                Under Webhooks &gt; Instagram, set Callback URL to:
              </p>
              <div className="pl-8 flex items-center gap-2">
                <code className="p-2 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] text-pink-300 flex-1 truncate">
                  {window.location.origin}/api/v1/integrations/instagram/webhook
                </code>
                <button
                  onClick={() => copySample(`${window.location.origin}/api/v1/integrations/instagram/webhook`)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 pl-8 mt-1">
                Verify Token: <code className="bg-black/40 px-1 py-0.5 rounded text-pink-300">rage_cloud_meta_webhook_secret_2026</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connect Instagram Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-dark-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <InstagramIcon className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-bold text-white">Connect Instagram Account</h3>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {accountError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{accountError}</span>
              </div>
            )}

            {/* 1-Click Meta OAuth Box (Superprofile style) */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Fast & Automated (Superprofile Style)</span>
              </div>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                Connect your account in seconds without copying tokens. Meta will automatically link your Business ID and verify permissions.
              </p>
              <button
                type="button"
                onClick={handleStartOAuth}
                disabled={oauthLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>{oauthLoading ? 'Redirecting to Meta Login...' : 'Log in with Instagram (1-Click)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Manual Accordion Toggle */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px bg-white/10 flex-1" />
              <button
                type="button"
                onClick={() => setShowManualForm(!showManualForm)}
                className="text-[10px] text-gray-400 hover:text-white uppercase tracking-wider font-semibold py-1 px-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {showManualForm ? '▲ Hide Manual Token Setup' : '▼ Or Connect Manually via Developer Token'}
              </button>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {showManualForm && (
              <form onSubmit={handleSaveAccount} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Instagram Handle / Username *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={connectForm.username}
                    onChange={(e) => setConnectForm({ ...connectForm, username: e.target.value.replace('@', '') })}
                    placeholder="mycreativechannel"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Instagram Business Account ID *
                </label>
                <input
                  type="text"
                  required
                  value={connectForm.instagram_business_id}
                  onChange={(e) => setConnectForm({ ...connectForm, instagram_business_id: e.target.value })}
                  placeholder="17841400000000000"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Found via Graph API Explorer: <code className="text-gray-400">GET /me/accounts?fields=instagram_business_account</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Facebook Page ID (Optional)
                </label>
                <input
                  type="text"
                  value={connectForm.facebook_page_id}
                  onChange={(e) => setConnectForm({ ...connectForm, facebook_page_id: e.target.value })}
                  placeholder="100000000000000"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Meta User / Page Access Token *
                </label>
                <textarea
                  required
                  rows={3}
                  value={connectForm.access_token}
                  onChange={(e) => setConnectForm({ ...connectForm, access_token: e.target.value })}
                  placeholder="EAA..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Max DMs / Hour (Safety Cap)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={connectForm.hourly_limit}
                    onChange={(e) => setConnectForm({ ...connectForm, hourly_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Recommended: 30/hr</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Max DMs / Day (Daily Quota)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    value={connectForm.daily_limit}
                    onChange={(e) => setConnectForm({ ...connectForm, daily_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Recommended: 100/day</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAccount}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-50"
                >
                  {isSavingAccount ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Campaign Create/Edit Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-dark-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingCampaign ? 'Edit Auto-DM Campaign' : 'Create Auto-DM Campaign'}
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {campaignError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{campaignError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  value={campaignForm.title}
                  onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  placeholder="e.g. Photoshop 2026 LUTs Pack Reel"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              {!editingCampaign && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Select Vault File to Auto-Deliver *
                  </label>
                  <select
                    required
                    value={campaignForm.file_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, file_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500"
                  >
                    {files.map((file) => (
                      <option key={file.id} value={file.id} className="bg-dark-card text-white">
                        {file.name} ({Math.round(file.size / 1024 / 1024 * 10) / 10} MB)
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    The short monetization link for this file will be automatically injected as <code className="text-pink-300">{'{download_link}'}</code>.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Trigger Keywords (Comma separated) *
                </label>
                <input
                  type="text"
                  required
                  value={campaignForm.trigger_keywords}
                  onChange={(e) => setCampaignForm({ ...campaignForm, trigger_keywords: e.target.value })}
                  placeholder="link, send, download, pack, preset"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Matches comments containing any of these words (case-insensitive).
                </p>
              </div>

              {/* Spintax DM Templates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Spintax DM Templates (Auto-Rotated) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setCampaignForm({
                      ...campaignForm,
                      dm_templates: [...campaignForm.dm_templates, 'Hey @{username}! Here is your file: {download_link}']
                    })}
                    className="text-[11px] text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Variation
                  </button>
                </div>
                <div className="space-y-2">
                  {campaignForm.dm_templates.map((tpl, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 w-5 text-right">{idx + 1}.</span>
                      <input
                        type="text"
                        value={tpl}
                        onChange={(e) => {
                          const updated = [...campaignForm.dm_templates];
                          updated[idx] = e.target.value;
                          setCampaignForm({ ...campaignForm, dm_templates: updated });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                      />
                      {campaignForm.dm_templates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = campaignForm.dm_templates.filter((_, i) => i !== idx);
                            setCampaignForm({ ...campaignForm, dm_templates: updated });
                          }}
                          className="text-gray-500 hover:text-red-400 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Available tags: <code className="text-pink-300">{'{username}'}</code>, <code className="text-pink-300">{'{file_name}'}</code>, <code className="text-pink-300">{'{download_link}'}</code>
                </p>
              </div>

              {/* Public Comment Replies */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignForm.send_comment_reply}
                    onChange={(e) => setCampaignForm({ ...campaignForm, send_comment_reply: e.target.checked })}
                    className="w-4 h-4 rounded text-pink-500 focus:ring-0 focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-white">
                    Auto-reply to commenter's public comment
                  </span>
                </label>

                {campaignForm.send_comment_reply && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="block text-[11px] font-medium text-gray-400">
                      Public Comment Reply Variations
                    </label>
                    {campaignForm.reply_comments.map((rep, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={rep}
                        onChange={(e) => {
                          const updated = [...campaignForm.reply_comments];
                          updated[idx] = e.target.value;
                          setCampaignForm({ ...campaignForm, reply_comments: updated });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowCampaignModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCampaign}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-50"
                >
                  {isSavingCampaign ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramAutoDmPage;
