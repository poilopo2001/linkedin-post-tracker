'use client';

import { useEffect, useState, useRef } from 'react';
import { api, Company } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Trash2, RefreshCw, RotateCcw, ExternalLink, Building2, Search, X, Globe, MapPin, Briefcase, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/SkeletonLoader';
import { PostCountPopover } from '@/components/PostCountPopover';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [collectingIds, setCollectingIds] = useState<Set<number>>(new Set());
  const [reclassifyingIds, setReclassifyingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverOpenFor, setPopoverOpenFor] = useState<number | null>(null);
  const collectButtonRefs = useRef<Map<number, React.RefObject<HTMLButtonElement>>>(new Map());

  useEffect(() => {
    loadCompanies();
  }, []);

  // Créer refs pour chaque bouton de collecte
  useEffect(() => {
    companies.forEach(company => {
      if (!collectButtonRefs.current.has(company.id)) {
        collectButtonRefs.current.set(company.id, { current: null });
      }
    });
  }, [companies]);

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

  async function handleCollect(companyId: number, maxPosts: number = 20) {
    // Fermer le popover
    setPopoverOpenFor(null);

    // Trouver le nom de l'entreprise pour l'afficher dans les toasts
    const company = companies.find(c => c.id === companyId);
    const companyName = company?.name || 'Entreprise';

    // Ajouter à la liste des collectes en cours (permet le parallélisme)
    setCollectingIds(prev => new Set(prev).add(companyId));

    // Afficher un toast de progression
    const collectPromise = api.posts.collect({ company_id: companyId, max_posts: maxPosts, classify: true });

    toast.promise(collectPromise, {
      loading: `🔍 Collecte en cours pour ${companyName}... (Scraping LinkedIn + Classification IA)`,
      success: (data: any) => {
        // Recharger les données après succès
        setTimeout(() => loadCompanies(), 500);
        const postsCount = data?.posts_collected || 0;
        return `✅ ${companyName}: ${postsCount} post${postsCount > 1 ? 's' : ''} collecté${postsCount > 1 ? 's' : ''} et classifié${postsCount > 1 ? 's' : ''}`;
      },
      error: (err) => `❌ Erreur lors de la collecte pour ${companyName}`,
    });

    try {
      await collectPromise;
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

  async function handleReclassify(companyId: number) {
    const company = companies.find(c => c.id === companyId);
    const companyName = company?.name || 'Entreprise';

    setReclassifyingIds(prev => new Set(prev).add(companyId));

    const reclassifyPromise = api.posts.reclassify(companyId);

    toast.promise(reclassifyPromise, {
      loading: `🔄 Re-classification en cours pour ${companyName}... (détection catégorie fundraising)`,
      success: (data: any) => {
        setTimeout(() => loadCompanies(), 500);
        const count = data?.reclassified || 0;
        return `✅ ${companyName}: ${count} post${count > 1 ? 's' : ''} re-classifié${count > 1 ? 's' : ''}`;
      },
      error: () => `❌ Erreur lors de la re-classification pour ${companyName}`,
    });

    try {
      await reclassifyPromise;
    } catch (err) {
      console.error('Error reclassifying:', err);
    } finally {
      setReclassifyingIds(prev => {
        const next = new Set(prev);
        next.delete(companyId);
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
        <TableSkeleton rows={5} />
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
              {filteredCompanies.map((company, index) => (
                <tr
                  key={company.id}
                  className="group hover:bg-gradient-to-r hover:from-primary-50/30 hover:to-transparent transition-all duration-200 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
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
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/50 text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 cursor-default">
                        <Briefcase className="w-3 h-3 text-neutral-500" />
                        {company.industry}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 hover:scale-110 transition-all duration-200 cursor-default">
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
                      {(() => {
                        const buttonRef = collectButtonRefs.current.get(company.id) || { current: null };
                        if (!collectButtonRefs.current.has(company.id)) {
                          collectButtonRefs.current.set(company.id, buttonRef);
                        }
                        return (
                          <>
                            <button
                              ref={buttonRef}
                              onClick={() => setPopoverOpenFor(company.id)}
                              disabled={collectingIds.has(company.id)}
                              className="relative group/btn p-2 text-neutral-500 hover:text-primary-600 hover:bg-primary-50 hover:scale-110 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                              title="Collecter les posts LinkedIn"
                            >
                              <RefreshCw className={`w-4 h-4 ${collectingIds.has(company.id) ? 'animate-spin' : ''}`} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                                Collecter les posts
                              </span>
                            </button>

                            {/* Render popover si ouvert pour cette entreprise */}
                            {popoverOpenFor === company.id && buttonRef.current && (
                              <PostCountPopover
                                onSelect={(count) => handleCollect(company.id, count)}
                                onClose={() => setPopoverOpenFor(null)}
                                anchorRef={buttonRef}
                              />
                            )}
                          </>
                        );
                      })()}
                      <button
                        onClick={() => handleReclassify(company.id)}
                        disabled={reclassifyingIds.has(company.id)}
                        className="relative group/btn p-2 text-neutral-500 hover:text-category-fundraising hover:bg-category-fundraising-light hover:scale-110 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                        title="Re-classifier avec IA"
                      >
                        <RotateCcw className={`w-4 h-4 ${reclassifyingIds.has(company.id) ? 'animate-spin' : ''}`} />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Re-classifier (IA)
                        </span>
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="relative group/btn p-2 text-neutral-500 hover:text-error hover:bg-error-light hover:scale-110 rounded-lg transition-all duration-200"
                        title="Supprimer l'entreprise"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                          Supprimer
                        </span>
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
