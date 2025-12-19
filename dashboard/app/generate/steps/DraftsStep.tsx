'use client';

import { useState, useEffect } from 'react';
import { api, UserCompanyProfile, GeneratedPost } from '@/lib/api';
import { FileEdit, Copy, Check, Trash2, CheckCircle, Archive, RefreshCw, Loader2 } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils';

interface DraftsStepProps {
  profile: UserCompanyProfile;
  onRefresh: () => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'bg-neutral-100 text-neutral-600' },
  approved: { label: 'Approuve', color: 'bg-success/10 text-success' },
  used: { label: 'Utilise', color: 'bg-primary-100 text-primary-600' },
  archived: { label: 'Archive', color: 'bg-neutral-200 text-neutral-500' },
};

export default function DraftsStep({ profile, onRefresh }: DraftsStepProps) {
  const [drafts, setDrafts] = useState<GeneratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadDrafts();
  }, [filter]);

  async function loadDrafts() {
    try {
      setLoading(true);
      const data = await api.generator.getDrafts({ status: filter || undefined });
      setDrafts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: 'draft' | 'approved' | 'used' | 'archived') {
    try {
      setUpdatingId(id);
      await api.generator.updateDraftStatus(id, status);
      await loadDrafts();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de mise a jour');
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteDraft(id: number) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    try {
      setUpdatingId(id);
      await api.generator.deleteDraft(id);
      await loadDrafts();
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    } finally {
      setUpdatingId(null);
    }
  }

  async function copyToClipboard(post: GeneratedPost) {
    const text = `${post.content}\n\n${post.hashtags?.join(' ') || ''}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
    // Mark as used after copying
    await updateStatus(post.id, 'used');
  }

  const statusCounts = drafts.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-category-promotional/10 flex items-center justify-center">
              <FileEdit className="w-5 h-5 text-category-promotional" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">Mes Brouillons</h2>
              <p className="text-sm text-neutral-500">Gerez vos posts generes pour {profile.company_name}</p>
            </div>
          </div>

          <button
            onClick={loadDrafts}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-error-light border border-error/20 rounded-lg p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === '' ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Tous ({drafts.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === status ? 'bg-primary-500 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {config.label} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>

        {/* Drafts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-500"></div>
              <span className="text-sm text-neutral-500">Chargement des brouillons...</span>
            </div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <FileEdit className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-700">Aucun brouillon</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Generez des posts pour les voir apparaitre ici
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const statusConfig = STATUS_CONFIG[draft.status];
              const isUpdating = updatingId === draft.id;

              return (
                <div
                  key={draft.id}
                  className={`bg-white border rounded-lg overflow-hidden transition-all ${
                    draft.status === 'archived' ? 'opacity-60 border-neutral-200' : 'border-neutral-200 hover:border-primary-200'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {draft.category && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[draft.category] || '#64748B' }}
                        >
                          {CATEGORY_LABELS[draft.category] || draft.category}
                        </span>
                      )}
                      {draft.theme && (
                        <span className="text-xs text-neutral-500">{draft.theme}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      {draft.target_emotion && (
                        <span className="capitalize">{draft.target_emotion}</span>
                      )}
                      {draft.generated_at && (
                        <span>{new Date(draft.generated_at).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700">
                      {draft.content}
                    </pre>

                    {/* Hashtags */}
                    {draft.hashtags && draft.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-neutral-100">
                        {draft.hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Scores */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                      {draft.predicted_engagement && (
                        <span>Engagement: {draft.predicted_engagement}%</span>
                      )}
                      {draft.authenticity_score && (
                        <span>Authenticite: {draft.authenticity_score}%</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                    {/* Status Actions */}
                    <div className="flex items-center gap-2">
                      {draft.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(draft.id, 'approved')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success bg-success/10 rounded-lg hover:bg-success/20 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Approuver
                        </button>
                      )}
                      {draft.status !== 'archived' && (
                        <button
                          onClick={() => updateStatus(draft.id, 'archived')}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-500 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
                          Archiver
                        </button>
                      )}
                      <button
                        onClick={() => deleteDraft(draft.id)}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Supprimer
                      </button>
                    </div>

                    {/* Copy */}
                    <button
                      onClick={() => copyToClipboard(draft)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
                    >
                      {copiedId === draft.id ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copie !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copier & Marquer utilise
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
