import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Users, Plus, AlertCircle } from 'lucide-react';

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
      setSuccess('Team member added successfully!');
      setInviteEmail('');
      setSelectedTeamId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-display flex items-center gap-2">
            <Users className="w-6 h-6 text-rage-accent" />
            <span>Teams & Revenue Sharing</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Collaborate on digital releases with teammates. Automatically distribute qualified download revenue according to verified split rules.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rage-accent hover:bg-rage-600 text-white font-bold text-xs rounded-xl shadow-rage-glow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Team</span>
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-dark-border text-center space-y-3">
          <Users className="w-10 h-10 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No active teams</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Create a team to manage files together and split earnings automatically across multiple wallets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="glass-panel p-6 rounded-3xl border border-dark-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{t.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{t.description || 'Collaborative creator workspace'}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedTeamId(t.id);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-3 py-1.5 bg-dark-card border border-dark-border hover:border-rage-accent text-rage-400 text-xs font-semibold rounded-lg"
                >
                  + Add Member
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-dark-bg border border-dark-border/60 text-xs text-gray-400 flex items-center justify-between">
                <span>Revenue Rule:</span>
                <span className="font-mono text-emerald-400 font-bold">Sum &le; 100% Enforced</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-white text-base">Create Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Studio / Esports Pack"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Focus of the team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-dark-bg border border-dark-border text-gray-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rage-accent text-white text-xs font-bold rounded-xl"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-white text-base">Invite Member & Configure Split</h3>

            {success && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Registered User Email</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@ragecloud.io"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white focus:outline-none focus:border-rage-accent"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                  Revenue Share Percentage (0% - 100%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={revenueShare}
                    onChange={(e) => setRevenueShare(Number(e.target.value))}
                    className="w-24 px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-white font-mono font-bold"
                  />
                  <span className="text-xs text-gray-400 font-mono">% of creator earnings</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTeamId(null)}
                  className="px-4 py-2 bg-dark-bg border border-dark-border text-gray-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rage-accent text-white text-xs font-bold rounded-xl"
                >
                  Confirm & Allocate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
