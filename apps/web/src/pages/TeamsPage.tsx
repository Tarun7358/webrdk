import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Users,
  Plus,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  X,
  PieChart,
  Crown
} from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Invite member state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [revenueShare, setRevenueShare] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeams = async () => {
    try {
      const data = await api.getTeams();
      setTeams(data);
    } catch (e) {
      console.error('Error fetching teams:', e);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTeam({ name: teamName, description });
      setTeamName('');
      setDescription('');
      setShowCreateModal(false);
      loadTeams();
    } catch (err: any) {
      alert(`Failed to create team: ${err.message}`);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selectedTeamId) return;

    try {
      await api.addTeamMember(selectedTeamId, {
        email: inviteEmail,
        role: 'MEMBER',
        revenue_share_percent: Number(revenueShare)
      });
      setSuccess('Team collaborator enrolled & split rule verified!');
      setInviteEmail('');
      setTimeout(() => {
        setSelectedTeamId(null);
        setSuccess(null);
      }, 1500);
      loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>Multi-Wallet Collaboration</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-rage-accent" />
            <span>Teams & Revenue Splits</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Collaborate on digital releases with teammates. Automatically route qualified download earnings across creator wallets.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow hover:scale-[1.02] active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="glass-panel p-12 sm:p-16 rounded-3xl border border-white/10 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400 shadow-inner">
            <Users className="w-8 h-8 text-rage-accent" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white font-display">No Collaborative Teams Yet</h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
              Create a workspace team to co-manage digital asset uploads and automatically split wallet revenues on every qualified download.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold rounded-xl transition-colors"
          >
            + Create Your First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {teams.map((t) => (
            <div key={t.id} className="glass-panel p-6 sm:p-7 rounded-3xl border border-white/10 space-y-5 hover:border-white/20 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-black text-white text-lg">{t.name}</h3>
                    <span className="px-2 py-0.5 rounded-md bg-rage-accent/15 border border-rage-accent/30 text-rage-accent text-[10px] font-mono font-bold flex items-center gap-1">
                      <Crown className="w-3 h-3" /> OWNER
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t.description || 'Collaborative creator workspace'}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTeamId(t.id);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-rage-accent text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>
              </div>

              {/* Revenue Rule Indicator */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                    <PieChart className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Double-Entry Split Rule:</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Sum &le; 100% Enforced
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 bg-dark-card">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-black text-white text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-rage-accent" />
                <span>Create Workspace Team</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Team Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Modding Studio / Esports Pack"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your production workflow or releases..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent resize-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm transition-all"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 bg-dark-card">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-display font-black text-white text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-rage-accent" />
                <span>Invite Collaborator & Allocate Split</span>
              </h3>
              <button
                onClick={() => setSelectedTeamId(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {success && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Collaborator Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="partner@ragecloud.io"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                  Revenue Share Percentage (1% - 100%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={revenueShare}
                    onChange={(e) => setRevenueShare(Number(e.target.value))}
                    className="w-28 px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-sm text-white font-mono font-bold focus:outline-none focus:border-rage-accent"
                  />
                  <span className="text-xs text-gray-400 font-mono">% of creator earnings</span>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(null)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rage-accent hover:bg-rage-600 text-white text-xs font-bold rounded-xl shadow-rage-glow-sm transition-all"
                >
                  Enrol & Enforce Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
