'use client';

import { useState, useEffect } from 'react';
import { api, UserCompanyProfile, PostRelevanceScore } from '@/lib/api';
import { BarChart2, Play, Loader2, CheckCircle, AlertCircle, Filter, TrendingUp } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils';

interface AnalysisStepProps {
  profile: UserCompanyProfile;
  onComplete: () => void;
}

export default function AnalysisStep({ profile, onComplete }: AnalysisStepProps) {
  const [scores, setScores] = useState<PostRelevanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    total_posts_analyzed: number;
    relevant_posts: number;
    adaptable_posts: number;
    avg_relevance: number;
  } | null>(null);

  // Filters
  const [minRelevance, setMinRelevance] = useState(50);
  const [adaptableOnly, setAdaptableOnly] = useState(true);

  useEffect(() => {
    loadScores();
  }, [minRelevance, adaptableOnly]);

  async function loadScores() {
    try {
      setLoading(true);
      const data = await api.generator.getScores({
        min_relevance: minRelevance,
        adaptable_only: adaptableOnly,
        limit: 50,
      });
      setScores(data);
    } catch (err) {
      // Scores might not exist yet
      setScores([]);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await api.generator.analyzeRelevance({ days: 30 });
      setAnalysisResult(result);
      await loadScores();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'analyse');
    } finally {
      setAnalyzing(false);
    }
  }

  function getRelevanceColor(score: number): string {
    if (score >= 80) return 'bg-success text-white';
    if (score >= 60) return 'bg-category-thought-leadership text-white';
    if (score >= 40) return 'bg-warning text-neutral-800';
    return 'bg-neutral-300 text-neutral-700';
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-category-thought-leadership/10 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-category-thought-leadership" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">Analyse de Pertinence</h2>
              <p className="text-sm text-neutral-500">Evaluation des posts concurrents pour {profile.company_name}</p>
            </div>
          </div>

          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-md"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Lancer l'analyse
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-error-light border border-error/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-error">Erreur d'analyse</p>
              <p className="text-sm text-neutral-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Analysis Result Summary */}
        {analysisResult && (
          <div className="bg-success-light border border-success/20 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="font-medium text-success">Analyse terminee</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-semibold text-neutral-800">{analysisResult.total_posts_analyzed}</p>
                <p className="text-xs text-neutral-500">Posts analyses</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-success">{analysisResult.relevant_posts}</p>
                <p className="text-xs text-neutral-500">Posts pertinents</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-primary-500">{analysisResult.adaptable_posts}</p>
                <p className="text-xs text-neutral-500">Adaptables</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-neutral-800">{analysisResult.avg_relevance.toFixed(0)}%</p>
                <p className="text-xs text-neutral-500">Pertinence moyenne</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg">
          <Filter className="w-4 h-4 text-neutral-500" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-600">Pertinence min:</label>
            <select
              value={minRelevance}
              onChange={(e) => setMinRelevance(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-neutral-200 rounded-md"
            >
              <option value={30}>30%</option>
              <option value={50}>50%</option>
              <option value={70}>70%</option>
              <option value={80}>80%</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={adaptableOnly}
              onChange={(e) => setAdaptableOnly(e.target.checked)}
              className="rounded border-neutral-300"
            />
            Adaptables uniquement
          </label>
        </div>

        {/* Scores List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-500"></div>
              <span className="text-sm text-neutral-500">Chargement des scores...</span>
            </div>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-12">
            <BarChart2 className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-700">Aucun score disponible</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Lancez l'analyse pour evaluer la pertinence des posts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-700">{scores.length} posts pertinents</h3>
            </div>

            <div className="space-y-2">
              {scores.map((score) => (
                <div
                  key={score.id}
                  className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Score Badge */}
                    <div className={`w-12 h-12 rounded-lg ${getRelevanceColor(score.overall_relevance)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg font-bold">{Math.round(score.overall_relevance)}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-neutral-500">{score.company_name}</span>
                        {score.post_category && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: CATEGORY_COLORS[score.post_category] || '#64748B' }}
                          >
                            {CATEGORY_LABELS[score.post_category] || score.post_category}
                          </span>
                        )}
                        {score.is_adaptable && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                            Adaptable
                          </span>
                        )}
                        {score.is_company_specific && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                            Specifique
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-neutral-700 line-clamp-2">
                        {score.post_content || 'Contenu non disponible'}
                      </p>

                      {score.universal_theme && (
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-xs text-primary-600 font-medium">{score.universal_theme}</span>
                        </div>
                      )}

                      {/* Score breakdown */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                        <span>Theme: {score.theme_relevance?.toFixed(0) || '-'}%</span>
                        <span>Audience: {score.audience_relevance?.toFixed(0) || '-'}%</span>
                        <span>Industrie: {score.industry_relevance?.toFixed(0) || '-'}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {scores.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors shadow-md"
            >
              Continuer vers les themes
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
