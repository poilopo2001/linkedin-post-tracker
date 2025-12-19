'use client';

import { useState } from 'react';
import { api, UserCompanyProfile, UserCompanyProfileCreate } from '@/lib/api';
import { Building2, Save, Loader2 } from 'lucide-react';

const INDUSTRIES = [
  'Technology & IT',
  'Finance & Banking',
  'Insurance',
  'Healthcare',
  'Manufacturing',
  'Retail & E-commerce',
  'Professional Services',
  'Real Estate',
  'Logistics & Transport',
  'Energy & Utilities',
  'Education',
  'Media & Entertainment',
  'Other',
];

const TONES = [
  { id: 'professional', label: 'Professionnel' },
  { id: 'innovative', label: 'Innovant' },
  { id: 'friendly', label: 'Accessible' },
  { id: 'expert', label: 'Expert' },
  { id: 'inspirational', label: 'Inspirant' },
  { id: 'educational', label: 'Educatif' },
];

const COMPANY_SIZES = [
  '1-10 employes',
  '11-50 employes',
  '51-200 employes',
  '201-500 employes',
  '501-1000 employes',
  '1000+ employes',
];

interface ProfileStepProps {
  profile: UserCompanyProfile | null;
  onSaved: (profile: UserCompanyProfile) => void;
}

export default function ProfileStep({ profile, onSaved }: ProfileStepProps) {
  const [formData, setFormData] = useState<UserCompanyProfileCreate>({
    company_name: profile?.company_name || '',
    industry: profile?.industry || '',
    sub_industry: profile?.sub_industry || '',
    company_size: profile?.company_size || '',
    tone_of_voice: profile?.tone_of_voice || [],
    key_messages: profile?.key_messages || ['', '', ''],
    values: profile?.values || [],
    differentiators: profile?.differentiators || [],
    target_audience: profile?.target_audience || {
      roles: [],
      industries: [],
      company_sizes: [],
    },
    audience_pain_points: profile?.audience_pain_points || [],
    preferred_categories: profile?.preferred_categories || [],
    hashtag_preferences: profile?.hashtag_preferences || [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.company_name.trim() || !formData.industry) {
      setError('Nom et secteur sont obligatoires');
      return;
    }

    try {
      setSaving(true);
      // Filter out empty values
      const cleanData = {
        ...formData,
        key_messages: formData.key_messages?.filter(m => m.trim()) || [],
        values: formData.values?.filter(v => v.trim()) || [],
        differentiators: formData.differentiators?.filter(d => d.trim()) || [],
        hashtag_preferences: formData.hashtag_preferences?.filter(h => h.trim()) || [],
      };

      const savedProfile = profile
        ? await api.profile.update(cleanData)
        : await api.profile.create(cleanData);

      onSaved(savedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function toggleTone(toneId: string) {
    const current = formData.tone_of_voice || [];
    if (current.includes(toneId)) {
      setFormData({ ...formData, tone_of_voice: current.filter(t => t !== toneId) });
    } else {
      setFormData({ ...formData, tone_of_voice: [...current, toneId] });
    }
  }

  function updateKeyMessage(index: number, value: string) {
    const messages = [...(formData.key_messages || ['', '', ''])];
    messages[index] = value;
    setFormData({ ...formData, key_messages: messages });
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">Profil Entreprise</h2>
            <p className="text-sm text-neutral-500">Definissez votre identite pour personnaliser les posts</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-error-light border border-error/20 rounded-lg p-4 text-sm text-error">
            {error}
          </div>
        )}

        {/* Identity Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Identite</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="Acme Solutions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Secteur *
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Selectionnez...</option>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Sous-secteur
              </label>
              <input
                type="text"
                value={formData.sub_industry || ''}
                onChange={(e) => setFormData({ ...formData, sub_industry: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                placeholder="SaaS B2B, FinTech..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Taille
              </label>
              <select
                value={formData.company_size || ''}
                onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="">Selectionnez...</option>
                {COMPANY_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tone Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Ton de communication</h3>
          <p className="text-sm text-neutral-500">Selectionnez les tonalites qui definissent votre marque</p>

          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => {
              const isSelected = formData.tone_of_voice?.includes(tone.id);
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => toggleTone(tone.id)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isSelected
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }
                  `}
                >
                  {tone.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Key Messages Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Messages cles</h3>
          <p className="text-sm text-neutral-500">Vos 3 messages principaux a communiquer</p>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500/10 text-primary-500 text-xs font-medium flex items-center justify-center">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={formData.key_messages?.[index] || ''}
                  onChange={(e) => updateKeyMessage(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder={`Message cle ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Hashtags Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wide">Hashtags preferes</h3>
          <p className="text-sm text-neutral-500">Entrez vos hashtags separes par des virgules</p>

          <input
            type="text"
            value={formData.hashtag_preferences?.join(', ') || ''}
            onChange={(e) => setFormData({
              ...formData,
              hashtag_preferences: e.target.value.split(',').map(h => h.trim()).filter(h => h)
            })}
            className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            placeholder="#innovation, #tech, #luxembourg"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-neutral-100">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {profile ? 'Mettre a jour' : 'Sauvegarder'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
