'use client';

import { useState, useEffect } from 'react';
import { api, UserCompanyProfile, ExtractedTheme, GeneratedPost } from '@/lib/api';
import { Wand2, Loader2, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/utils';

interface GenerateStepProps {
  profile: UserCompanyProfile;
  onComplete: () => void;
}

const EMOTIONS = [
  { id: 'inspire', label: 'Inspirer', description: 'Histoires de succes, vision' },
  { id: 'educate', label: 'Eduquer', description: 'Conseils, tutoriels, insights' },
  { id: 'engage', label: 'Engager', description: 'Questions, debats, opinions' },
  { id: 'entertain', label: 'Divertir', description: 'Anecdotes, humour pro' },
];

export default function GenerateStep({ profile, onComplete }: GenerateStepProps) {
  const [themes, setThemes] = useState<ExtractedTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Generation params
  const [numPosts, setNumPosts] = useState(3);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('inspire');

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    try {
      setLoading(true);
      const data = await api.generator.getThemes();
      setThemes(data);
    } catch (err) {
      setThemes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    try {
      setGenerating(true);
      setError(null);
      const result = await api.generator.generate({
        num_posts: numPosts,
        theme: selectedTheme || undefined,
        category: selectedCategory || undefined,
        target_emotion: selectedEmotion || undefined,
      });
      setGeneratedPosts(result.generated_posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de generation');
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(post: GeneratedPost) {
    const text = `${post.content}\n\n${post.hashtags?.join(' ') || ''}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">Generation de Posts</h2>
            <p className="text-sm text-neutral-500">Creez des posts LinkedIn uniques pour {profile.company_name}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-error-light border border-error/20 rounded-lg p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Generation Settings */}
        <div className="bg-neutral-50 rounded-lg p-5 space-y-5">
          <h3 className="text-sm font-semibold text-neutral-700">Parametres de generation</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Number of posts */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Nombre de posts
              </label>
              <select
                value={numPosts}
                onChange={(e) => setNumPosts(Number(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                <option value={1}>1 post</option>
                <option value={3}>3 posts</option>
                <option value={5}>5 posts</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Theme (optionnel)
              </label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                <option value="">Tous les themes</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.theme_name}>
                    {theme.theme_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Categorie (optionnel)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                <option value="">Toutes categories</option>
                {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>

            {/* Emotion */}
            <div>
              <label className="block text-sm font-medium text-neutral-600 mb-1.5">
                Emotion cible
              </label>
              <select
                value={selectedEmotion}
                onChange={(e) => setSelectedEmotion(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
              >
                {EMOTIONS.map((emotion) => (
                  <option key={emotion.id} value={emotion.id}>
                    {emotion.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generation en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generer les posts
              </>
            )}
          </button>
        </div>

        {/* Generated Posts */}
        {generatedPosts?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-700">
              {generatedPosts.length} posts generes
            </h3>

            <div className="space-y-4">
              {generatedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white border border-neutral-200 rounded-lg overflow-hidden hover:border-primary-200 transition-colors"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      {post.category && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: CATEGORY_COLORS[post.category] || '#64748B' }}
                        >
                          {CATEGORY_LABELS[post.category] || post.category}
                        </span>
                      )}
                      {post.theme && (
                        <span className="text-xs text-neutral-500">
                          Theme: {post.theme}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {post.predicted_engagement && (
                        <span className="text-xs text-neutral-500">
                          Engagement predit: {post.predicted_engagement}%
                        </span>
                      )}
                      {post.authenticity_score && (
                        <span className="text-xs text-success">
                          Authenticite: {post.authenticity_score}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4">
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-neutral-700 bg-transparent p-0 m-0">
                        {post.content}
                      </pre>
                    </div>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-neutral-100">
                        {post.hashtags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary-50 text-primary-600 text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CTA */}
                    {post.call_to_action && (
                      <div className="mt-3 p-3 bg-neutral-50 rounded-lg">
                        <span className="text-xs font-medium text-neutral-500">Call-to-Action:</span>
                        <p className="text-sm text-neutral-700 mt-1">{post.call_to_action}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end px-4 py-3 bg-neutral-50 border-t border-neutral-100">
                    <button
                      onClick={() => copyToClipboard(post)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      {copiedId === post.id ? (
                        <>
                          <Check className="w-4 h-4 text-success" />
                          Copie !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copier le post
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button */}
        {generatedPosts?.length > 0 && (
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors shadow-md"
            >
              Voir tous les brouillons
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
