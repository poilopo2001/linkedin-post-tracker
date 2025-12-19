'use client';

import { useEffect, useState } from 'react';
import { api, Company } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, ExternalLink, Building2, Search, X, Globe, MapPin, Briefcase } from 'lucide-react';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [collectingIds, setCollectingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await api.companies.list({ active_only: false });
      setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect(companyId: number) {
    // Ajouter à la liste des collectes en cours (permet le parallélisme)
    setCollectingIds(prev => new Set(prev).add(companyId));
    try {
      await api.posts.collect({ company_id: companyId, max_posts: 20, classify: true });
      // Recharger seulement quand toutes les collectes sont finies
      const remaining = new Set(collectingIds);
      remaining.delete(companyId);
      if (remaining.size === 0) {
        await loadCompanies();
      }
    } catch (err) {
      console.error('Error collecting:', err);
    } finally {
      setCollectingIds(prev => {
        const next = new Set(prev);
        next.delete(companyId);
        // Recharger si c'était la dernière collecte
        if (next.size === 0) {
          loadCompanies();
        }
        return next;
      });
    }
  }

  async function handleDelete(companyId: number) {
    if (!confirm('Supprimer cette entreprise et tous ses posts ?')) return;
    try {
      await api.companies.delete(companyId);
      await loadCompanies();
    } catch (err) {
      console.error('Error deleting:', err);
    }
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Entreprises</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {companies.length} entreprise{companies.length > 1 ? 's' : ''} suivie{companies.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter une entreprise
        </button>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <AddCompanyForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            loadCompanies();
          }}
        />
      )}

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher une entreprise..."
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
        <button
          onClick={loadCompanies}
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
            <span className="text-sm text-neutral-500">Chargement des entreprises...</span>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Secteur
                </th>
                <th className="text-center px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Posts
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Dernière collecte
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCompanies.map(company => (
                <tr key={company.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">{company.name}</p>
                        <a
                          href={company.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 hover:underline transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          LinkedIn
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {company.industry ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-100 text-xs font-medium text-neutral-600">
                        <Briefcase className="w-3 h-3" />
                        {company.industry}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600">
                      {company.post_count || 0}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-neutral-600">
                      {formatDate(company.last_collected_at)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCollect(company.id)}
                        disabled={collectingIds.has(company.id)}
                        className="p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all disabled:opacity-50"
                        title="Collecter les posts"
                      >
                        <RefreshCw className={`w-4 h-4 ${collectingIds.has(company.id) ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
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
          {filteredCompanies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-base font-medium text-neutral-800 mb-1">
                {searchQuery ? 'Aucun résultat' : 'Aucune entreprise'}
              </h3>
              <p className="text-sm text-neutral-500 text-center max-w-sm">
                {searchQuery
                  ? `Aucune entreprise ne correspond à "${searchQuery}"`
                  : 'Commencez par ajouter une entreprise à suivre'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une entreprise
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddCompanyForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    linkedin_url: '',
    industry: '',
    location: 'Luxembourg',
    website: '',
    employee_count: null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.companies.create(formData);
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
            <Building2 className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-neutral-800">Ajouter une entreprise</h2>
            <p className="text-xs text-neutral-500">Remplissez les informations LinkedIn</p>
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
              Nom de l'entreprise <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
              placeholder="ex: Amazon Europe"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              URL LinkedIn <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                required
                value={formData.linkedin_url}
                onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
                placeholder="https://linkedin.com/company/..."
              />
              <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Secteur d'activité
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.industry}
                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
                placeholder="ex: Technology, Finance..."
              />
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Site web
            </label>
            <div className="relative">
              <input
                type="url"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
                placeholder="https://www.example.com"
              />
              <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            </div>
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
