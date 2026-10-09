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
  ArrowRight,
  ExternalLink,
  Film,
  Check,
  Maximize2,
  ChevronRight
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
  instagram_business_id?: string;
  facebook_page_id?: string;
  username: string;
  profile_picture_url?: string;
  connection_type?: string;
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
  post_url?: string;
  target_mode?: 'SPECIFIC' | 'ANY' | 'NEXT';
  trigger_keywords: string;
  dm_templates: string[];
  reply_comments: string[];
  send_comment_reply: boolean;
  is_active: boolean;
  total_dms_sent: number;
  last_scanned_at?: string;
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
  const [connectMode, setConnectMode] = useState<'login' | 'session' | 'oauth' | 'manual'>('login');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<InstagramCampaign | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Scanning State
  const [scanningCampaignId, setScanningCampaignId] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ campaignId: string; message: string; isError?: boolean } | null>(null);

  // Option A: Session ID Connection Form
  const [sessionForm, setSessionForm] = useState({
    session_id: '',
    username: '',
    hourly_limit: 20,
    daily_limit: 60
  });
  const [isConnectingSession, setIsConnectingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // In-app Instagram Login (username/password + optional 2FA)
  const [loginForm, setLoginForm] = useState({ username: '', password: '', two_factor_code: '' });
  const [twoFactorIdentifier, setTwoFactorIdentifier] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 1-Click Meta OAuth States
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  // Manual Meta Token Form
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
    post_url: '',
    target_mode: 'SPECIFIC' as 'SPECIFIC' | 'ANY' | 'NEXT',
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

  // Superprofile 3-Step Wizard state
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [keywordMode, setKeywordMode] = useState<'specific' | 'any'>('specific');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsList, setKeywordsList] = useState<string[]>(['link', 'send', 'dl', 'download', 'pack']);
  const [alsoReplyWithoutKeywords, setAlsoReplyWithoutKeywords] = useState(false);
  const [dmType, setDmType] = useState<'button' | 'text'>('button');
  const [buttonLabel, setButtonLabel] = useState('Download Link 🚀');
  const [activeTemplateIdx, setActiveTemplateIdx] = useState(0);

  // Post picker (Superprofile-style grid)
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

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
      setConnectMode('manual');
    } finally {
      setOauthLoading(false);
    }
  };

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
        setSessionForm({
          session_id: '',
          username: accRes.username || '',
          hourly_limit: accRes.hourly_limit || 20,
          daily_limit: accRes.daily_limit || 60
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

  // Handle in-app Instagram Login (auto-captures session, no cookie copy needed)
  const handleInstagramLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginForm.username.trim() || !loginForm.password) {
      setLoginError('Please enter your Instagram username and password.');
      return;
    }
    if (twoFactorIdentifier && !loginForm.two_factor_code.trim()) {
      setLoginError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setIsLoggingIn(true);
      const res = await api.loginInstagramCredentials({
        username: loginForm.username.trim(),
        password: loginForm.password,
        two_factor_code: twoFactorIdentifier ? loginForm.two_factor_code.trim() : undefined,
        two_factor_identifier: twoFactorIdentifier || undefined
      });
      if (res.status === 'TWO_FACTOR_REQUIRED') {
        setTwoFactorIdentifier(res.two_factor_identifier);
        setLoginError(res.message || 'Enter your 2FA verification code.');
        return;
      }
      if (res.status === 'CONNECTED') {
        setAccount(res.account);
        setShowConnectModal(false);
        setOauthSuccess(`🎉 Connected @${res.username}! You can now create campaigns.`);
        setLoginForm({ username: '', password: '', two_factor_code: '' });
        setTwoFactorIdentifier(null);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Instagram login failed.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Option A Session Connect
  const handleConnectSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    if (!sessionForm.session_id.trim()) {
      setSessionError('Please paste your Instagram sessionid cookie.');
      return;
    }
    try {
      setIsConnectingSession(true);
      const res = await api.connectInstagramSession({
        session_id: sessionForm.session_id.trim(),
        username: sessionForm.username.trim() || undefined,
        hourly_limit: sessionForm.hourly_limit,
        daily_limit: sessionForm.daily_limit
      });
      setAccount(res);
      setShowConnectModal(false);
      setOauthSuccess(`🎉 Successfully connected @${res.username} via Web Session! No Meta Developer account required.`);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to connect Instagram session. Please check that your sessionid cookie is valid and active.');
    } finally {
      setIsConnectingSession(false);
    }
  };

  // Handle Manual Developer Token Connect
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

  // Handle Reel Scan Execution
  const handleScanCampaign = async (campaign: InstagramCampaign) => {
    try {
      setScanningCampaignId(campaign.id);
      setScanFeedback(null);
      const res = await api.scanInstagramCampaign(campaign.id);
      const msg = `⚡ Scan complete! Checked ${res.total_comments_scanned || 0} comments (${res.matched_comments || 0} keyword matches) → Dispatched ${res.dms_dispatched || 0} DMs (${res.already_processed || 0} previously sent).`;
      setScanFeedback({ campaignId: campaign.id, message: msg });
      await fetchData();
      if (activeTab === 'logs') {
        await fetchLogs();
      }
    } catch (err: any) {
      setScanFeedback({
        campaignId: campaign.id,
        message: err.message || 'Failed to scan Reel comments.',
        isError: true
      });
    } finally {
      setScanningCampaignId(null);
    }
  };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (!kw) return;
    if (!keywordsList.includes(kw)) {
      const updated = [...keywordsList, kw];
      setKeywordsList(updated);
      setCampaignForm(prev => ({ ...prev, trigger_keywords: updated.join(', ') }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const updated = keywordsList.filter(k => k !== kwToRemove);
    setKeywordsList(updated);
    setCampaignForm(prev => ({ ...prev, trigger_keywords: updated.join(', ') }));
  };

  const handleInsertVariable = (varName: string) => {
    const updated = [...campaignForm.dm_templates];
    const current = updated[activeTemplateIdx] || '';
    updated[activeTemplateIdx] = current ? `${current} ${varName}` : varName;
    setCampaignForm(prev => ({ ...prev, dm_templates: updated }));
  };

  const handleNextStep = () => {
    setCampaignError(null);
    if (modalStep === 1) {
      if (campaignForm.target_mode === 'SPECIFIC' && !campaignForm.post_url.trim()) {
        setCampaignError('Please pick a Post/Reel from the grid or paste a link.');
        return;
      }
      setModalStep(2);
    } else if (modalStep === 2) {
      if (keywordMode === 'specific' && keywordsList.length === 0) {
        setCampaignError('Please add at least one trigger keyword (e.g. "link").');
        return;
      }
      setModalStep(3);
    }
  };

  const handlePrevStep = () => {
    setCampaignError(null);
    if (modalStep > 1) {
      setModalStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  // Handle Campaign Submit
  const handleSaveCampaign = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCampaignError(null);

    const validTemplates = campaignForm.dm_templates.filter(t => t.trim().length > 0);
    if (validTemplates.length === 0) {
      setCampaignError('Please enter at least one DM template variation.');
      return;
    }
    if (campaignForm.target_mode === 'SPECIFIC' && !campaignForm.post_url.trim()) {
      setCampaignError('Please pick a Post/Reel from the grid.');
      return;
    }
    const finalFileId = campaignForm.file_id || files[0]?.id;
    if (!finalFileId) {
      setCampaignError('Please select or upload a vault file to deliver.');
      return;
    }
    const finalTitle = campaignForm.title.trim() || (account ? `@${account.username} Reel Automation` : 'Instagram Reel Auto-DM');
    const finalKeywords = keywordMode === 'any' ? '*' : (keywordsList.length > 0 ? keywordsList.join(', ') : 'link');

    try {
      setIsSavingCampaign(true);
      if (editingCampaign) {
        const updated = await api.updateInstagramCampaign(editingCampaign.id, {
          title: finalTitle,
          post_url: campaignForm.target_mode === 'SPECIFIC' ? (campaignForm.post_url.trim() || undefined) : undefined,
          target_mode: campaignForm.target_mode,
          trigger_keywords: finalKeywords,
          dm_templates: validTemplates,
          reply_comments: campaignForm.reply_comments.filter(r => r.trim().length > 0),
          send_comment_reply: campaignForm.send_comment_reply
        });
        setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await api.createInstagramCampaign({
          file_id: finalFileId,
          title: finalTitle,
          post_url: campaignForm.target_mode === 'SPECIFIC' ? (campaignForm.post_url.trim() || undefined) : undefined,
          target_mode: campaignForm.target_mode,
          trigger_keywords: finalKeywords,
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

  const loadMedia = async () => {
    try {
      setIsLoadingMedia(true);
      setMediaError(null);
      const res = await api.getInstagramMedia();
      setMediaItems(res?.media || []);
      if (!res?.media?.length) {
        setMediaError('No posts found. Instagram may be rate-limiting, try again in a minute.');
      }
    } catch (err: any) {
      setMediaError(err.message || 'Could not load your posts.');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const openCreateModal = () => {
    setModalStep(1);
    loadMedia();
    setEditingCampaign(null);
    setKeywordsList(['link', 'send', 'dl', 'download', 'pack']);
    setKeywordMode('specific');
    setKeywordInput('');
    setAlsoReplyWithoutKeywords(false);
    setDmType('button');
    setButtonLabel('Download Link 🚀');
    setActiveTemplateIdx(0);
    setCampaignForm({
      title: '',
      file_id: files[0]?.id || '',
      post_url: '',
      target_mode: 'SPECIFIC',
      trigger_keywords: 'link, send, dl, download, pack',
      dm_templates: [
        'Hi there!\n\nAppreciate your comment 🙌 As promised, here\'s the link for you: {download_link}',
        'Hey @{username}! 🔥 Here is your requested download link for {file_name}: {download_link}',
        'Yo @{username}! You asked for the link, here you go: {download_link} 🚀'
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
    setModalStep(1);
    loadMedia();
    setEditingCampaign(c);
    const isAny = c.trigger_keywords === '*' || c.trigger_keywords === 'ANY';
    const parsedList = isAny ? [] : c.trigger_keywords.split(',').map(k => k.trim()).filter(Boolean);
    setKeywordsList(parsedList.length ? parsedList : ['link']);
    setKeywordMode(isAny ? 'any' : 'specific');
    setKeywordInput('');
    setAlsoReplyWithoutKeywords(false);
    setDmType('button');
    setButtonLabel('Download Link 🚀');
    setActiveTemplateIdx(0);
    setCampaignForm({
      title: c.title,
      file_id: c.file_id,
      post_url: c.post_url || '',
      target_mode: c.target_mode || 'SPECIFIC',
      trigger_keywords: c.trigger_keywords,
      dm_templates: c.dm_templates.length > 0 ? c.dm_templates : ['Hi there! As promised, here is the link: {download_link}'],
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
        <p className="text-gray-400 text-xs font-mono">Syncing Instagram Auto-DM & Active Campaigns...</p>
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
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Option A: Zero Developer Setup</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20">
              <InstagramIcon className="w-6 h-6" />
            </div>
            <span>Instagram Auto-DM Automation</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
            Automatically detect Reel/Post comments like <span className="text-pink-400 font-mono">"LINK"</span> and dispatch instant monetization links directly to user DMs with anti-ban guardrails.
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
              onClick={() => {
                setConnectMode('login');
                setShowConnectModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <InstagramIcon className="w-4 h-4" />
              <span>Connect Instagram (Option A)</span>
            </button>
          )}
        </div>
      </div>

      {/* OAuth/Session Success Alert */}
      {oauthSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{oauthSuccess}</span>
          </div>
          <button onClick={() => setOauthSuccess(null)} className="text-emerald-400/60 hover:text-emerald-400">✕</button>
        </div>
      )}

      {/* OAuth/Session Error Alert */}
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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-pink-500/30 overflow-hidden">
                {account.profile_picture_url ? (
                  <img src={account.profile_picture_url} alt={account.username} className="w-full h-full object-cover" />
                ) : (
                  `@${account.username.charAt(0).toUpperCase()}`
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">@{account.username}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Live & Connected
                  </span>
                  {account.connection_type === 'SESSION' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                      Option A: Web Session
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  IG ID: <span className="font-mono text-gray-300">{account.instagram_business_id || account.username}</span>
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Hourly Velocity Cap: <strong className="text-white">{account.hourly_limit}/hr</strong></span>
                  <span>•</span>
                  <span>Daily Quota: <strong className="text-white">{account.daily_limit}/day</strong></span>
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
                onClick={() => {
                  setConnectMode(account.connection_type === 'SESSION' ? 'session' : 'manual');
                  setShowConnectModal(true);
                }}
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
              <h3 className="text-base font-bold text-white">Connect Your Instagram Account (Option A)</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Connect in 30 seconds using your web session. Zero Meta Developer App, zero Facebook Page linking, and zero Meta App Review required.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setConnectMode('login');
              setShowConnectModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold text-xs tracking-wide shadow-lg shadow-pink-600/20 flex items-center gap-2 whitespace-nowrap transition-all hover:scale-105 active:scale-95"
          >
            <InstagramIcon className="w-4 h-4" />
            <span>Connect Account (Instant)</span>
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
            Conservative human-like delays (2.5s - 5s) and velocity caps protect against action blocks.
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
            Commenters typing "STOP" or "unsubscribe" are immediately excluded to prevent reports.
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
          <span>Setup Guide</span>
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
                  ⚠️ Please connect your Instagram account above first.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-5 rounded-2xl bg-dark-card border border-white/5 hover:border-pink-500/30 transition-all flex flex-col justify-between group relative"
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

                    {/* Target Mode & Link Display */}
                    {camp.target_mode === 'ANY' ? (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-purple-300 font-medium">Watching: Any Post/Reel (5 latest active)</span>
                        </div>
                        <span className="text-[10px] text-purple-400/80 px-2 py-0.5 rounded-full bg-purple-500/20">Auto-Scan</span>
                      </div>
                    ) : camp.target_mode === 'NEXT' ? (
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-indigo-300 font-medium">Watching: Next Post/Reel (after campaign creation)</span>
                        </div>
                        <span className="text-[10px] text-indigo-400/80 px-2 py-0.5 rounded-full bg-indigo-500/20">Future Posts</span>
                      </div>
                    ) : camp.post_url ? (
                      <div className="p-2.5 rounded-xl bg-pink-500/5 border border-pink-500/15 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                          <InstagramIcon className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                          <a
                            href={camp.post_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-pink-300 font-mono text-[11px] hover:underline truncate"
                          >
                            {camp.post_url}
                          </a>
                        </div>
                        <a
                          href={camp.post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-pink-400 hover:text-pink-300"
                          title="Open Reel"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>No specific Reel linked</span>
                        <button
                          onClick={() => openEditModal(camp)}
                          className="text-pink-400 hover:underline"
                        >
                          + Select Post/Reel
                        </button>
                      </div>
                    )}

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
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Live Auto-Scan (every ~90s)
                        </span>
                        {camp.last_scanned_at ? (
                          <span className="text-gray-400 font-mono text-[10px]">
                            Last: {new Date(camp.last_scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Pending first scan</span>
                        )}
                      </div>
                    </div>

                    {/* Feedback Toast for this Campaign */}
                    {scanFeedback?.campaignId === camp.id && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                        scanFeedback.isError
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        <span>{scanFeedback.message}</span>
                        <button onClick={() => setScanFeedback(null)} className="text-current opacity-60 hover:opacity-100">✕</button>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                    {/* Scan Reel Comments Button (Option A trigger) */}
                    <button
                      onClick={() => handleScanCampaign(camp)}
                      disabled={scanningCampaignId === camp.id || !camp.is_active}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600/30 to-purple-600/30 hover:from-pink-600 hover:to-purple-600 border border-pink-500/30 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                      title="Scan Reel comments for keywords and send DMs"
                    >
                      <Zap className={`w-3.5 h-3.5 text-pink-400 ${scanningCampaignId === camp.id ? 'animate-bounce' : ''}`} />
                      <span>{scanningCampaignId === camp.id ? 'Scanning Comments...' : 'Scan Reel Comments ⚡'}</span>
                    </button>

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
              Live chronological record of Instagram comments scanned and automated DM deliveries.
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
                Once comments matching your trigger keywords are detected on your Reel, live delivery events will appear here in real-time.
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
              Choose the method that works best for you. <strong>Option A (Web Session)</strong> takes 30 seconds and requires zero Meta Developer setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option A Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/20 via-pink-950/10 to-dark-surface border border-blue-500/30 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Zap className="w-4 h-4 text-blue-400" />
                <span>Option A: Web Session ID (Recommended)</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                  <span>Log into <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">instagram.com</a> on your desktop browser.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded font-mono text-[10px]">F12</kbd> (or right click &gt; Inspect) &gt; Go to <strong>Application</strong> (Chrome/Brave) or <strong>Storage</strong> (Firefox).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                  <span>Expand <strong>Cookies</strong> &gt; Click <code className="text-pink-300">https://www.instagram.com</code> &gt; Copy value of <strong className="text-white font-mono">sessionid</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">4</span>
                  <span>Paste into RAGE Cloud connect modal. You're immediately ready to auto-dispatch DMs!</span>
                </li>
              </ul>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                ✓ Zero Facebook Page required<br />
                ✓ Zero Meta Developer Account required<br />
                ✓ Zero App Review delays
              </div>
            </div>

            {/* Option B / C Box */}
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-gray-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Option B / C: Official Meta Developer App</span>
              </div>
              <ul className="space-y-3 text-xs text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">1</span>
                  <span>Switch account to Professional (Creator or Business) on Instagram app.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">2</span>
                  <span>Create a Facebook Page and link it in Instagram Profile settings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">3</span>
                  <span>Create a Meta Developer App at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-pink-400 underline">developers.facebook.com</a> with Instagram permissions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/10 text-gray-300 flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">4</span>
                  <span>Set Webhook callback URL to:</span>
                </li>
              </ul>
              <div className="flex items-center gap-2">
                <code className="p-2 rounded-lg bg-black/50 border border-white/10 font-mono text-[10px] text-pink-300 flex-1 truncate">
                  {window.location.origin}/api/v1/integrations/instagram/webhook
                </code>
                <button
                  onClick={() => copySample(`${window.location.origin}/api/v1/integrations/instagram/webhook`)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedText ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Instagram Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-dark-card border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 my-8 animate-in zoom-in-95 duration-200">
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

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-black/40 border border-white/10 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setConnectMode('login')}
                className={`py-2 px-1 rounded-lg font-bold transition-all text-center ${
                  connectMode === 'login'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Instagram Login
              </button>
              <button
                type="button"
                onClick={() => setConnectMode('session')}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  connectMode === 'session'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Option A: Session ID
              </button>
              <button
                type="button"
                onClick={() => setConnectMode('oauth')}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  connectMode === 'oauth'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                1-Click Meta Login
              </button>
              <button
                type="button"
                onClick={() => setConnectMode('manual')}
                className={`py-2 px-2 rounded-lg font-bold transition-all text-center ${
                  connectMode === 'manual'
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Developer Token
              </button>
            </div>

            {/* MODE 0: IN-APP INSTAGRAM LOGIN */}
            {connectMode === 'login' && (
              <form onSubmit={handleInstagramLogin} className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center text-white">
                    <InstagramIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-white">Log in with Instagram</p>
                  <p className="text-[11px] text-gray-400">
                    Your password is sent only to Instagram and is never stored. We keep just the login session.
                  </p>
                </div>

                {loginError && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${twoFactorIdentifier ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <input
                  type="text"
                  autoComplete="username"
                  disabled={!!twoFactorIdentifier}
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value.replace('@', '') })}
                  placeholder="Username"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 disabled:opacity-60"
                />
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled={!!twoFactorIdentifier}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Password"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 disabled:opacity-60"
                />
                {twoFactorIdentifier && (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={loginForm.two_factor_code}
                    onChange={(e) => setLoginForm({ ...loginForm, two_factor_code: e.target.value })}
                    placeholder="6-digit 2FA code"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-pink-500/50 text-white text-xs focus:outline-none focus:border-pink-500 font-mono tracking-widest text-center"
                  />
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <span>{twoFactorIdentifier ? 'Verify & Connect' : 'Log in & Connect'}</span>
                  )}
                </button>
                {twoFactorIdentifier && (
                  <button
                    type="button"
                    onClick={() => { setTwoFactorIdentifier(null); setLoginError(null); setLoginForm({ ...loginForm, two_factor_code: '' }); }}
                    className="w-full text-[11px] text-gray-400 hover:text-white"
                  >
                    ← Use a different account
                  </button>
                )}
                <p className="text-[10px] text-gray-500 text-center">
                  If Instagram asks for a security check, approve the login in your Instagram app and try again, or use the Session ID tab.
                </p>
              </form>
            )}

            {/* MODE 1: OPTION A SESSION COOKIE */}
            {connectMode === 'session' && (
              <form onSubmit={handleConnectSession} className="space-y-4">
                {sessionError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{sessionError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Option A: Zero-Configuration Connection</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80 leading-relaxed">
                    No Meta Developer App or Facebook Page needed. Open <strong>instagram.com</strong> &gt; Press <kbd className="px-1 py-0.2 bg-black/40 rounded text-white font-mono">F12</kbd> &gt; <strong>Application &gt; Cookies</strong> &gt; Copy <strong>sessionid</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Instagram sessionid Cookie *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={sessionForm.session_id}
                    onChange={(e) => setSessionForm({ ...sessionForm, session_id: e.target.value })}
                    placeholder="Paste sessionid cookie (e.g. 123456789%3Abcd... or sessionid=...)"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono resize-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Your session cookie is kept encrypted and used only to scan comments and send download link DMs.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Instagram Username (Optional - auto-detected)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-mono">@</span>
                    <input
                      type="text"
                      value={sessionForm.username}
                      onChange={(e) => setSessionForm({ ...sessionForm, username: e.target.value.replace('@', '') })}
                      placeholder="Leave blank to auto-detect from session"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Max DMs / Hour (Safety Cap)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={sessionForm.hourly_limit}
                      onChange={(e) => setSessionForm({ ...sessionForm, hourly_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 20/hr</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Max DMs / Day (Daily Quota)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={100}
                      value={sessionForm.daily_limit}
                      onChange={(e) => setSessionForm({ ...sessionForm, daily_limit: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 60/day</p>
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
                    disabled={isConnectingSession}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-pink-600/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isConnectingSession ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Session...</span>
                      </>
                    ) : (
                      <span>Connect Session (Option A)</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: 1-CLICK META OAUTH */}
            {connectMode === 'oauth' && (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30 text-center space-y-4">
                {oauthError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{oauthError}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Superprofile Style Meta Login</span>
                </div>
                <p className="text-xs text-gray-300 max-w-sm mx-auto">
                  Requires server environment variables <code className="text-pink-300">META_APP_ID</code> and <code className="text-pink-300">META_APP_SECRET</code> configured on Railway.
                </p>
                <button
                  type="button"
                  onClick={handleStartOAuth}
                  disabled={oauthLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <InstagramIcon className="w-4 h-4" />
                  <span>{oauthLoading ? 'Redirecting to Meta Login...' : 'Log in with Meta (1-Click)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* MODE 3: MANUAL DEVELOPER TOKEN */}
            {connectMode === 'manual' && (
              <form onSubmit={handleSaveAccount} className="space-y-4">
                {accountError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{accountError}</span>
                  </div>
                )}

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
                    From Graph API Explorer: <code className="text-gray-400">GET /me/accounts?fields=instagram_business_account</code>
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

      {/* Superprofile 3-Step Campaign Wizard Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0e121a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header (All Steps) */}
            <div className="p-4 px-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Film className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  When someone comments on your Post/Reel
                </h3>
              </div>
              <button
                onClick={() => setShowCampaignModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {campaignError && (
              <div className="m-4 mb-0 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{campaignError}</span>
              </div>
            )}

            {/* Modal Body: STEP 1 */}
            {modalStep === 1 && (
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Account Avatar Header */}
                <div className="flex flex-col items-center justify-center space-y-1.5 pt-1">
                  <div className="relative p-1 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 shadow-lg shadow-pink-500/20">
                    <div className="p-0.5 bg-[#0e121a] rounded-full">
                      {account?.profile_picture_url ? (
                        <img
                          src={account.profile_picture_url}
                          alt={account.username}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 text-white font-bold flex items-center justify-center text-xl">
                          {(account?.username || 'U').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-200 tracking-wide font-mono">
                    @{account?.username || 'your_instagram'}
                  </span>
                </div>

                {/* The Comment is on... */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-300">
                    The Comment is on...
                  </label>

                  {/* 3 Tabs */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['SPECIFIC', 'Specific Post/Reel'],
                      ['ANY', 'Any Post/Reel'],
                      ['NEXT', 'Next Post/Reel']
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCampaignForm({ ...campaignForm, target_mode: mode })}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                          campaignForm.target_mode === mode
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-sm'
                            : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Specific Post 3-Column Grid */}
                  {campaignForm.target_mode === 'SPECIFIC' && (
                    <div className="space-y-3 pt-1">
                      {isLoadingMedia ? (
                        <div className="py-12 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2 bg-white/[0.01] rounded-2xl border border-white/5">
                          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                          <span>Loading your Posts and Reels...</span>
                        </div>
                      ) : mediaItems.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                          {mediaItems.map((m) => {
                            const url = `https://www.instagram.com/p/${m.code}/`;
                            const selected = campaignForm.post_url.includes(`/${m.code}`);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setCampaignForm({ ...campaignForm, post_url: url })}
                                className={`group relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all ${
                                  selected
                                    ? 'border-blue-500 ring-2 ring-blue-500/40'
                                    : 'border-white/5 hover:border-white/30'
                                }`}
                                title={m.caption || 'Post'}
                              >
                                {m.thumbnail_url ? (
                                  <img
                                    src={m.thumbnail_url}
                                    alt={m.caption || 'Instagram thumbnail'}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500 text-[10px]">
                                    Post
                                  </div>
                                )}
                                
                                {/* Bottom right expand icon */}
                                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/60 backdrop-blur-xs flex items-center justify-center text-white/80">
                                  <Maximize2 className="w-3 h-3" />
                                </div>

                                {/* Bottom left comment count */}
                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white/90 font-mono">
                                  💬 {m.comment_count}
                                </div>

                                {selected && (
                                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                          {mediaError || 'No posts found. You can paste a link below.'}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          value={campaignForm.post_url}
                          onChange={(e) => setCampaignForm({ ...campaignForm, post_url: e.target.value })}
                          placeholder="...or paste a Reel/Post link: https://www.instagram.com/reel/..."
                          className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={loadMedia}
                          className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs flex items-center gap-1 flex-shrink-0"
                          title="Refresh posts"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  )}

                  {campaignForm.target_mode === 'ANY' && (
                    <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
                      <p className="font-semibold">Watching your 5 latest Posts/Reels</p>
                      <p className="text-[11px] text-gray-400">
                        Whenever someone comments on any of your 5 most recent posts, they'll receive your DM automatically.
                      </p>
                    </div>
                  )}

                  {campaignForm.target_mode === 'NEXT' && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                      <p className="font-semibold">Watching your next published Post/Reel</p>
                      <p className="text-[11px] text-gray-400">
                        This automation will only trigger on posts/reels published after you create this campaign.
                      </p>
                    </div>
                  )}
                </div>

                {/* Campaign Name (Optional customized title) */}
                <div className="pt-2 border-t border-white/5">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Campaign Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
                    placeholder="e.g. Photoshop 2026 LUTs Pack Reel"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Body: STEP 2 */}
            {modalStep === 2 && (
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* 2 Tabs: Specific keyword vs Any comment */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setKeywordMode('specific');
                      if (campaignForm.trigger_keywords === '*') {
                        setCampaignForm({ ...campaignForm, trigger_keywords: keywordsList.join(', ') || 'link' });
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      keywordMode === 'specific'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-sm'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Specific keyword
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKeywordMode('any');
                      setCampaignForm({ ...campaignForm, trigger_keywords: '*' });
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                      keywordMode === 'any'
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-sm'
                        : 'bg-white/[0.02] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Any comment
                  </button>
                </div>

                {/* Gold Notice Box */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    You have <strong>unlimited keywords</strong> enabled on RAGE Cloud. Automate as many words as you want!
                  </span>
                </div>

                {/* Keywords input & chips (Only in specific keyword mode) */}
                {keywordMode === 'specific' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-300">
                      Should include any of these:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        placeholder="Type a keyword (min. 1 characters)"
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        disabled={!keywordInput.trim()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Keywords Tag Chips */}
                    {keywordsList.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {keywordsList.map((kw) => (
                          <span
                            key={kw}
                            className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-xs flex items-center gap-1.5"
                          >
                            <span>#{kw}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(kw)}
                              className="text-blue-400/60 hover:text-red-400 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Keywords are not case-sensitive (e.g., "Hello" and "hello" are treated the same). Automations trigger only on exact keyword matches — for example, the keyword "ai" will match "ai" but not "pain."
                    </p>
                  </div>
                )}

                {/* Toggles */}
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* Toggle 1: Also reply without keywords */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-white block">
                        Also reply without your keywords
                      </span>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Even if a comment doesn't use your exact keywords, AI checks its meaning and replies when it matches what you describe.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAlsoReplyWithoutKeywords(!alsoReplyWithoutKeywords)}
                      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 mt-0.5 ${
                        alsoReplyWithoutKeywords ? 'bg-blue-600' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          alsoReplyWithoutKeywords ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Auto-reply to comments on post */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-white">
                        Auto-Reply to comments on the post
                      </span>
                      <button
                        type="button"
                        onClick={() => setCampaignForm({ ...campaignForm, send_comment_reply: !campaignForm.send_comment_reply })}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                          campaignForm.send_comment_reply ? 'bg-blue-600' : 'bg-white/10'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            campaignForm.send_comment_reply ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {campaignForm.send_comment_reply && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="block text-[11px] font-medium text-gray-400">
                          Public Comment Reply Variations (Rotated):
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
                            className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body: STEP 3 */}
            {modalStep === 3 && (
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* Header */}
                <div>
                  <h4 className="text-sm font-bold text-white">Then send the primary DM...</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Write the message you want to auto-send with a button that takes them to your link or product.
                  </p>
                </div>

                {/* Vault File Selection */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Select Vault File to Auto-Deliver *
                  </label>
                  <select
                    required
                    value={campaignForm.file_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, file_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    {files.map((file) => (
                      <option key={file.id} value={file.id} className="bg-dark-card text-white">
                        {file.name} ({Math.round(file.size / 1024 / 1024 * 10) / 10} MB)
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Your short monetized download link will be inserted via <code className="text-blue-300 font-mono">{'{download_link}'}</code>.
                  </p>
                </div>

                {/* DM Type Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    DM type
                  </label>
                  <select
                    value={dmType}
                    onChange={(e) => setDmType(e.target.value as 'button' | 'text')}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="button" className="bg-dark-card text-white">Text + Button</option>
                    <option value="text" className="bg-dark-card text-white">Direct Text Message</option>
                  </select>
                </div>

                {/* DM Content Textarea Card */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-300">
                      DM content
                    </label>
                    {campaignForm.dm_templates.length > 1 && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        Template {activeTemplateIdx + 1} of {campaignForm.dm_templates.length}
                      </span>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 space-y-3">
                    <textarea
                      rows={5}
                      value={campaignForm.dm_templates[activeTemplateIdx] || ''}
                      onChange={(e) => {
                        const updated = [...campaignForm.dm_templates];
                        updated[activeTemplateIdx] = e.target.value;
                        setCampaignForm({ ...campaignForm, dm_templates: updated });
                      }}
                      placeholder="Hi there! Appreciate your comment 🙌 As promised, here's the link: {download_link}"
                      className="w-full bg-transparent text-white text-xs focus:outline-none resize-none font-sans leading-relaxed"
                    />

                    {/* Variable insertion buttons & Character count */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleInsertVariable('{username}')}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-mono transition-colors"
                        >
                          # username
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertVariable('{file_name}')}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-mono transition-colors"
                        >
                          # file_name
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertVariable('{download_link}')}
                          className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[11px] font-mono font-bold transition-colors"
                        >
                          # download_link
                        </button>
                      </div>

                      <span className="text-[11px] text-gray-500 font-mono">
                        {(campaignForm.dm_templates[activeTemplateIdx] || '').length}/900
                      </span>
                    </div>
                  </div>

                  {/* Add Template Variation */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      {campaignForm.dm_templates.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveTemplateIdx(i)}
                          className={`w-6 h-6 rounded-lg text-xs font-mono font-bold transition-all ${
                            activeTemplateIdx === i
                              ? 'bg-blue-600 text-white'
                              : 'bg-white/5 text-gray-400 hover:text-white'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newTpl = `Hey @{username}! Here is your file: {download_link}`;
                        setCampaignForm({
                          ...campaignForm,
                          dm_templates: [...campaignForm.dm_templates, newTpl]
                        });
                        setActiveTemplateIdx(campaignForm.dm_templates.length);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variation (Spintax)</span>
                    </button>
                  </div>
                </div>

                {/* Button Box (Dashed card like Screenshot 3) */}
                {dmType === 'button' && (
                  <div className="p-4 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.01] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-400" /> Button Preview
                      </span>
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Auto-Linked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        placeholder="Button Text (e.g. Download File 🚀)"
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      When recipients tap this button, it automatically takes them to your short link for this file.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Navigation Bar (All Steps) */}
            <div className="p-4 px-6 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
              <span className="text-xs text-gray-400 font-medium">
                Step {modalStep} of 3
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={modalStep === 1}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 text-xs font-semibold transition-colors"
                >
                  Back
                </button>
                {modalStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSaveCampaign()}
                    disabled={isSavingCampaign}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSavingCampaign ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <span>{editingCampaign ? 'Update Automation' : 'Publish Automation'}</span>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramAutoDmPage;
