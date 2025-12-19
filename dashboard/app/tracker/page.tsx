'use client';

import { useEffect, useState } from 'react';
import { api, TrackedProfile } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Plus, Trash2, RefreshCw, ExternalLink, Users, Search, X,
  User, Building2, Clock, Eye, TrendingUp, Play, Pause
} from 'lucide-react';

export default function TrackerPage() {
  const [profiles, setProfiles] = useState<TrackedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scrapingIds, setScrapingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'person' | 'company'>('all');

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    try {
      setLoading(true);
      const data = await api.tracker.getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScrape(profileId: number) {
    setScrapingIds(prev => new Set(prev).add(profileId));
    try {
      await api.tracker.triggerScrape(profileId, 'full');
      // Reload after scrape
      setTimeout(() => loadProfiles(), 2000);
    } catch (err) {
      console.error('Error scraping:', err);
    } finally {
      setScrapingIds(prev => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  }

  async function handleToggleActive(profile: TrackedProfile) {
    try {
      await api.tracker.updateProfile(profile.id, { is_active: !profile.is_active });
      await loadProfiles();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  }

  async function handleDelete(profileId: number) {
    if (!confirm('Supprimer ce profil et tous ses posts ?')) return;
    try {
      await api.tracker.deleteProfile(profileId);
      await loadProfiles();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.headline?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || p.profile_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: profiles.length,
    active: profiles.filter(p => p.is_active).length,
    persons: profiles.filter(p => p.profile_type === 'person').length,
    companies: profiles.filter(p => p.profile_type === 'company').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">LinkedIn Tracker</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {stats.total} profil{stats.total > 1 ? 's' : ''} suivi{stats.total > 1 ? 's' : ''} ({stats.active} actif{stats.active > 1 ? 's' : ''})
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un profil
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total" value={stats.total} />
        <StatCard icon={<Eye className="w-5 h-5" />} label="Actifs" value={stats.active} color="success" />
        <StatCard icon={<User className="w-5 h-5" />} label="Personnes" value={stats.persons} color="blue" />
        <StatCard icon={<Building2 className="w-5 h-5" />} label="Entreprises" value={stats.companies} color="purple" />
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <AddProfileForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadProfiles();
          }}
        />
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un profil..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
          {(['all', 'person', 'company'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filterType === type
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              {type === 'all' ? 'Tous' : type === 'person' ? 'Personnes' : 'Entreprises'}
            </button>
          ))}
        </div>

        <button
          onClick={loadProfiles}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500"></div>
            <span className="text-sm text-neutral-500">Chargement des profils...</span>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Profil
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Followers
                </th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Posts
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Dernier scrape
                </th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProfiles.map(profile => (
                <tr key={profile.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/tracker/${profile.id}`} className="flex items-center gap-3 group">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        profile.profile_type === 'person'
                          ? 'bg-blue-500/10'
                          : 'bg-purple-500/10'
                      }`}>
                        {profile.profile_type === 'person' ? (
                          <User className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Building2 className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800 group-hover:text-primary-600 transition-colors">
                          {profile.display_name}
                        </p>
                        {profile.headline && (
                          <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                            {profile.headline}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                      profile.profile_type === 'person'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {profile.profile_type === 'person' ? 'Personne' : 'Entreprise'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-medium text-neutral-700">
                      {profile.follower_count?.toLocaleString() || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600">
                      {profile.total_posts_tracked || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-sm text-neutral-600">
                        {formatDate(profile.last_scraped_at)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(profile)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        profile.is_active
                          ? 'bg-success-light text-success hover:bg-success/20'
                          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                      }`}
                    >
                      {profile.is_active ? (
                        <>
                          <Play className="w-3 h-3" />
                          Actif
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          Pause
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Voir sur LinkedIn"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleScrape(profile.id)}
                        disabled={scrapingIds.has(profile.id)}
                        className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all disabled:opacity-50"
                        title="Scraper maintenant"
                      >
                        <RefreshCw className={`w-4 h-4 ${scrapingIds.has(profile.id) ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(profile.id)}
                        className="p-2 text-neutral-500 hover:text-error hover:bg-error-light rounded-lg transition-all"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredProfiles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-base font-medium text-neutral-800 mb-1">
                {searchQuery ? 'Aucun resultat' : 'Aucun profil'}
              </h3>
              <p className="text-sm text-neutral-500 text-center max-w-sm">
                {searchQuery
                  ? `Aucun profil ne correspond a "${searchQuery}"`
                  : 'Commencez par ajouter un profil LinkedIn a tracker'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un profil
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color = 'primary'
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: 'primary' | 'success' | 'blue' | 'purple';
}) {
  const colors = {
    primary: 'bg-primary-500/10 text-primary-500',
    success: 'bg-success-light text-success',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-surface rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold text-neutral-800">{value}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function AddProfileForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    linkedin_url: '',
    profile_type: 'person' as 'person' | 'company',
    display_name: '',
    headline: '',
    tracking_frequency: 'daily' as 'hourly' | 'daily' | 'weekly',
    priority: 5,
    tags: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.tracker.createProfile({
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Ajouter un profil</h2>
            <p className="text-xs text-neutral-500">Profil LinkedIn a tracker</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              URL LinkedIn <span className="text-error">*</span>
            </label>
            <input
              type="url"
              required
              value={formData.linkedin_url}
              onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Type de profil <span className="text-error">*</span>
            </label>
            <select
              value={formData.profile_type}
              onChange={e => setFormData({ ...formData, profile_type: e.target.value as 'person' | 'company' })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="person">Personne (Influenceur)</option>
              <option value="company">Entreprise (Concurrent)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Nom affiche <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.display_name}
              onChange={e => setFormData({ ...formData, display_name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
              placeholder="ex: John Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Titre/Headline
            </label>
            <input
              type="text"
              value={formData.headline}
              onChange={e => setFormData({ ...formData, headline: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
              placeholder="ex: CEO @ Company"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Frequence de scraping
            </label>
            <select
              value={formData.tracking_frequency}
              onChange={e => setFormData({ ...formData, tracking_frequency: e.target.value as 'hourly' | 'daily' | 'weekly' })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            >
              <option value="hourly">Toutes les heures</option>
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Priorite (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Tags (separes par virgule)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
              placeholder="ex: fintech, influencer, competitor"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-error-light border border-error/20 rounded-lg p-4">
            <div className="w-5 h-5 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-error text-xs font-bold">!</span>
            </div>
            <div>
              <p className="text-sm font-medium text-error">Erreur</p>
              <p className="text-sm text-neutral-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Ajouter
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
