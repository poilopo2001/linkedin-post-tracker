'use client';

import { useState, useEffect } from 'react';
import { api, UserCompanyProfile, ExtractedTheme } from '@/lib/api';
import { Layers, Play, Loader2, TrendingUp, Lightbulb, ArrowRight, CheckCircle } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils';

interface ThemesStepProps {
  profile: UserCompanyProfile;
  onComplete: () => void;
}

export default function ThemesStep({ profile, onComplete }: ThemesStepProps) {
  const [themes, setThemes] = useState<ExtractedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    try {
      setLoading(true);
      const data = await api.generator.getThemes();
      setThemes(data);
      // Select all by default
      setSelectedThemes(new Set(data.map(t => t.id)));
    } catch (err) {
      setThemes([]);
    } finally {
      setLoading(false);
    }
  }

  async function extractThemes() {
    try {
      setExtracting(true);
      setError(null);
      await api.generator.extractThemes();
      await loadThemes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d\'extraction');
    } finally {
      setExtracting(false);
    }
  }

  function toggleTheme(themeId: number) {
    const newSet = new Set(selectedThemes);
    if (newSet.has(themeId)) {
      newSet.delete(themeId);
    } else {
      newSet.add(themeId);
    }
    setSelectedThemes(newSet);
  }

  function selectAll() {
    setSelectedThemes(new Set(themes.map(t => t.id)));
  }

  function deselectAll() {
    setSelectedThemes(new Set());
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-category-csr/10 flex items-center justify-center">
              <Layers className="w-5 h-5 text-category-csr" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">Themes Identifies</h2>
              <p className="text-sm text-neutral-500">Selectionnez les themes pour la generation</p>
            </div>
          </div>

          <button
            onClick={extractThemes}
            disabled={extracting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-md"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extraction...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Extraire les themes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-error-light border border-error/20 rounded-lg p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Selection Controls */}
        {themes.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
            <span className="text-sm text-neutral-600">
              {selectedThemes.size} / {themes.length} themes selectionnes
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
              >
                Tout selectionner
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-200 rounded-md transition-colors"
              >
                Deselectionner tout
              </button>
            </div>
          </div>
        )}

        {/* Themes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-200 border-t-primary-500"></div>
              <span className="text-sm text-neutral-500">Chargement des themes...</span>
            </div>
          </div>
        ) : themes.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-neutral-700">Aucun theme extrait</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Lancez l'extraction pour identifier les themes des posts pertinents
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((theme) => {
              const isSelected = selectedThemes.has(theme.id);
              return (
                <div
                  key={theme.id}
                  onClick={() => toggleTheme(theme.id)}
                  className={`
                    cursor-pointer border rounded-lg p-4 transition-all duration-200
                    ${isSelected
                      ? 'border-primary-500 bg-primary-50/50 shadow-md'
                      : 'border-neutral-200 bg-white hover:border-primary-200 hover:shadow-sm'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${isSelected
                          ? 'bg-primary-500 border-primary-500'
                          : 'border-neutral-300'
                        }
                      `}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <h3 className="font-semibold text-neutral-800">{theme.theme_name}</h3>
                    </div>

                    {theme.is_trending && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-neutral-600 mb-3">
                    {theme.theme_description || 'Aucune description'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-neutral-500 mb-3">
                    {theme.category && (
                      <span
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[theme.category] || '#64748B' }}
                      >
                        {CATEGORY_LABELS[theme.category] || theme.category}
                      </span>
                    )}
                    <span>{theme.occurrence_count} occurrences</span>
                    {theme.avg_engagement && (
                      <span>Engagement: {theme.avg_engagement.toFixed(0)}</span>
                    )}
                  </div>

                  {/* Example Angles */}
                  {theme.example_angles && theme.example_angles.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-neutral-500 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Angles suggeres
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {theme.example_angles.slice(0, 3).map((angle, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-md"
                          >
                            {angle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Continue Button */}
        {themes.length > 0 && selectedThemes.size > 0 && (
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors shadow-md"
            >
              Generer des posts
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
