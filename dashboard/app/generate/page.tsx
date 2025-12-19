'use client';

import { useState, useEffect } from 'react';
import { api, UserCompanyProfile, GeneratorStats } from '@/lib/api';
import { Sparkles, User, BarChart2, Layers, Wand2, FileEdit, Check, ChevronRight, RefreshCw } from 'lucide-react';
import ProfileStep from './steps/ProfileStep';
import AnalysisStep from './steps/AnalysisStep';
import ThemesStep from './steps/ThemesStep';
import GenerateStep from './steps/GenerateStep';
import DraftsStep from './steps/DraftsStep';

type Step = 'profile' | 'analysis' | 'themes' | 'generate' | 'drafts';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profil', icon: <User className="w-4 h-4" /> },
  { id: 'analysis', label: 'Analyse', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'themes', label: 'Themes', icon: <Layers className="w-4 h-4" /> },
  { id: 'generate', label: 'Generation', icon: <Wand2 className="w-4 h-4" /> },
  { id: 'drafts', label: 'Brouillons', icon: <FileEdit className="w-4 h-4" /> },
];

export default function GeneratePage() {
  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [profile, setProfile] = useState<UserCompanyProfile | null>(null);
  const [stats, setStats] = useState<GeneratorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [profileData, statsData] = await Promise.all([
        api.profile.get(),
        api.generator.stats(),
      ]);
      setProfile(profileData);
      setStats(statsData);

      // Auto-navigate to appropriate step based on progress
      if (!profileData) {
        setCurrentStep('profile');
      } else if (statsData.posts_analyzed === 0) {
        setCurrentStep('analysis');
      } else if (statsData.themes_extracted === 0) {
        setCurrentStep('themes');
      } else if (statsData.posts_generated === 0) {
        setCurrentStep('generate');
      } else {
        setCurrentStep('drafts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  function getStepIndex(step: Step): number {
    return STEPS.findIndex(s => s.id === step);
  }

  function isStepCompleted(step: Step): boolean {
    if (!profile && step !== 'profile') return false;
    if (!stats) return false;

    switch (step) {
      case 'profile':
        return !!profile;
      case 'analysis':
        return stats.posts_analyzed > 0;
      case 'themes':
        return stats.themes_extracted > 0;
      case 'generate':
        return stats.posts_generated > 0;
      case 'drafts':
        return stats.posts_used > 0;
      default:
        return false;
    }
  }

  function isStepAccessible(step: Step): boolean {
    if (step === 'profile') return true;
    if (!profile) return false;

    const stepIndex = getStepIndex(step);
    // Allow accessing current step and all previous steps
    return stepIndex <= getStepIndex(currentStep) || isStepCompleted(step);
  }

  function handleStepChange(step: Step) {
    if (isStepAccessible(step)) {
      setCurrentStep(step);
    }
  }

  function handleProfileSaved(newProfile: UserCompanyProfile) {
    setProfile(newProfile);
    setCurrentStep('analysis');
    loadData();
  }

  function handleAnalysisComplete() {
    setCurrentStep('themes');
    loadData();
  }

  function handleThemesComplete() {
    setCurrentStep('generate');
    loadData();
  }

  function handleGenerateComplete() {
    setCurrentStep('drafts');
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500"></div>
          <span className="text-sm text-neutral-500">Chargement...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-light border border-error/20 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
            <span className="text-error text-lg">!</span>
          </div>
          <div>
            <h3 className="font-medium text-neutral-800">Erreur de chargement</h3>
            <p className="text-sm text-neutral-600 mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-neutral-800">Generateur de Posts</h1>
              <p className="text-sm text-neutral-500">Creez des posts LinkedIn inspires des tendances</p>
            </div>
          </div>
        </div>

        {/* Stats badges */}
        {stats && profile && (
          <div className="flex items-center gap-3">
            <StatBadge label="Posts analyses" value={stats.posts_analyzed} />
            <StatBadge label="Themes" value={stats.themes_extracted} />
            <StatBadge label="Generes" value={stats.posts_generated} />
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = isStepCompleted(step.id);
            const isAccessible = isStepAccessible(step.id);

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => handleStepChange(step.id)}
                  disabled={!isAccessible}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-primary-500 text-white shadow-md'
                      : isCompleted
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : isAccessible
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
                    }
                  `}
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${isActive
                      ? 'bg-white/20'
                      : isCompleted
                        ? 'bg-success/20'
                        : 'bg-neutral-200/50'
                    }
                  `}>
                    {isCompleted && !isActive ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      step.icon
                    )}
                  </span>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </button>

                {index < STEPS.length - 1 && (
                  <div className="flex-1 flex justify-center px-2">
                    <ChevronRight className={`w-4 h-4 ${
                      isStepCompleted(step.id) ? 'text-success' : 'text-neutral-300'
                    }`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card">
        {currentStep === 'profile' && (
          <ProfileStep
            profile={profile}
            onSaved={handleProfileSaved}
          />
        )}
        {currentStep === 'analysis' && profile && (
          <AnalysisStep
            profile={profile}
            onComplete={handleAnalysisComplete}
          />
        )}
        {currentStep === 'themes' && profile && (
          <ThemesStep
            profile={profile}
            onComplete={handleThemesComplete}
          />
        )}
        {currentStep === 'generate' && profile && (
          <GenerateStep
            profile={profile}
            onComplete={handleGenerateComplete}
          />
        )}
        {currentStep === 'drafts' && profile && (
          <DraftsStep
            profile={profile}
            onRefresh={loadData}
          />
        )}
      </div>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-100 rounded-lg px-3 py-1.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="ml-2 text-sm font-semibold text-neutral-800">{value}</span>
    </div>
  );
}
