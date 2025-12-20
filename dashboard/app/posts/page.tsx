'use client';

import { useEffect, useState } from 'react';
import { api, Post, Company } from '@/lib/api';
import { CATEGORY_COLORS, CATEGORY_LABELS, formatDate, truncateText } from '@/lib/utils';
import { Search, Filter, ThumbsUp, MessageCircle, Share2, FileText, X, ChevronDown, Building2, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { PostCardSkeleton } from '@/components/SkeletonLoader';

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    company_id: '',
    category: '',
    sentiment: '',
    search: '',
  });

  useEffect(() => {
    loadCompanies();
    loadPosts();
  }, []);

  async function loadCompanies() {
    try {
      const data = await api.companies.list();
      setCompanies(data);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }

  async function loadPosts() {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filters.company_id) params.company_id = parseInt(filters.company_id);
      if (filters.category) params.category = filters.category;
      if (filters.sentiment) params.sentiment = filters.sentiment;
      if (filters.search) params.search = filters.search;

      const data = await api.posts.list(params);
      setPosts(data);
    } catch (err) {
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      company_id: '',
      category: '',
      sentiment: '',
      search: '',
    });
  }

  function applyFilters() {
    loadPosts();
  }

  const hasActiveFilters = filters.company_id || filters.category || filters.sentiment || filters.search;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-800">Posts</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {posts.length} post{posts.length > 1 ? 's' : ''} LinkedIn collecté{posts.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadPosts}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">Filtres</span>
            {hasActiveFilters && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-500/10 text-primary-600 rounded-full">
                Actifs
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Company Select */}
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Entreprise</label>
              <div className="relative">
                <select
                  value={filters.company_id}
                  onChange={e => handleFilterChange('company_id', e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                >
                  <option value="">Toutes</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Category Select */}
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Catégorie</label>
              <div className="relative">
                <select
                  value={filters.category}
                  onChange={e => handleFilterChange('category', e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                >
                  <option value="">Toutes</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Sentiment Select */}
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Sentiment</label>
              <div className="relative">
                <select
                  value={filters.sentiment}
                  onChange={e => handleFilterChange('sentiment', e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 pr-9 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
                >
                  <option value="">Tous</option>
                  <option value="positive">Positif</option>
                  <option value="neutral">Neutre</option>
                  <option value="negative">Négatif</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher dans le contenu..."
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyFilters()}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all placeholder:text-neutral-400"
                />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={applyFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
            >
              <Search className="w-4 h-4" />
              Rechercher
            </button>
          </div>
        </div>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <PostCard key={post.id} post={post} index={index} />
          ))}

          {/* Empty State */}
          {posts.length === 0 && (
            <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-base font-medium text-neutral-800 mb-1">Aucun post trouvé</h3>
                <p className="text-sm text-neutral-500 text-center max-w-sm">
                  {hasActiveFilters
                    ? 'Aucun post ne correspond à vos critères de recherche'
                    : 'Commencez par collecter des posts depuis la page Entreprises'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const categoryColor = CATEGORY_COLORS[post.category || ''] || '#64748B';
  const categoryLabel = CATEGORY_LABELS[post.category || ''] || post.category || 'Non classé';

  const sentimentConfig = {
    positive: { bg: 'bg-success-light', text: 'text-success-dark', label: 'Positif' },
    negative: { bg: 'bg-error-light', text: 'text-error-dark', label: 'Négatif' },
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-600', label: 'Neutre' },
  };

  const sentiment = sentimentConfig[post.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;

  return (
    <div
      className="group bg-surface rounded-lg border border-neutral-200 shadow-card hover:shadow-card-hover hover:border-neutral-300 transition-all duration-200 overflow-hidden animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Category indicator bar */}
      <div className="h-1 group-hover:h-1.5 transition-all duration-200" style={{ backgroundColor: categoryColor }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-primary-500" />
              </div>
              <div>
                <span className="font-medium text-neutral-800">{post.company_name}</span>
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span>{formatDate(post.posted_at)}</span>
                  {post.linkedin_post_id && (
                    <>
                      <span className="text-neutral-300">|</span>
                      <a
                        href={`https://linkedin.com/feed/update/${post.linkedin_post_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-500 hover:text-primary-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir sur LinkedIn
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <p className="text-sm text-neutral-700 leading-relaxed mb-4">
              {truncateText(post.content || '', 350)}
            </p>

            {/* Engagement metrics */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5 text-neutral-500 hover:text-primary-600 transition-colors group/engagement cursor-default">
                <div className="w-7 h-7 rounded-full bg-primary-500/10 flex items-center justify-center group-hover/engagement:bg-primary-500/20 group-hover/engagement:scale-110 transition-all duration-200">
                  <ThumbsUp className="w-3.5 h-3.5 text-primary-500" />
                </div>
                <span className="text-sm font-medium">{post.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500 hover:text-category-events transition-colors group/engagement cursor-default">
                <div className="w-7 h-7 rounded-full bg-category-events/10 flex items-center justify-center group-hover/engagement:bg-category-events/20 group-hover/engagement:scale-110 transition-all duration-200">
                  <MessageCircle className="w-3.5 h-3.5 text-category-events" />
                </div>
                <span className="text-sm font-medium">{post.comments || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500 hover:text-category-partnerships transition-colors group/engagement cursor-default">
                <div className="w-7 h-7 rounded-full bg-category-partnerships/10 flex items-center justify-center group-hover/engagement:bg-category-partnerships/20 group-hover/engagement:scale-110 transition-all duration-200">
                  <Share2 className="w-3.5 h-3.5 text-category-partnerships" />
                </div>
                <span className="text-sm font-medium">{post.shares || 0}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 cursor-default"
              style={{ backgroundColor: categoryColor }}
            >
              {categoryLabel}
            </span>
            {post.sentiment && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${sentiment.bg} ${sentiment.text} hover:scale-105 transition-all duration-200 cursor-default border border-transparent hover:border-current/20`}>
                {sentiment.label}
              </span>
            )}
            {post.confidence_score && (
              <div className="flex items-center gap-1.5 mt-1 group/confidence cursor-default">
                <Sparkles className="w-3 h-3 text-success opacity-60 group-hover/confidence:opacity-100 transition-opacity" />
                <div className="w-16 h-1.5 bg-neutral-200 rounded-full overflow-hidden group-hover/confidence:h-2 transition-all duration-200">
                  <div
                    className="h-full bg-gradient-to-r from-success to-success-dark rounded-full transition-all duration-300"
                    style={{ width: `${post.confidence_score}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-400 font-medium group-hover/confidence:text-success transition-colors">{post.confidence_score}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
