'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, TrackedProfile, ProfileSnapshot, TrackedPost, PostContentInsight } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { LinkedInPostCard } from '@/components/LinkedInPostCard';
import {
  ArrowLeft, RefreshCw, ExternalLink, User, Building2, Clock, TrendingUp,
  Users, FileText, Activity, Calendar, Edit2, Save, X, Play, Pause,
  ChevronDown, ChevronUp, Heart, MessageCircle, Share2, Eye, Zap
} from 'lucide-react';

export default function TrackerProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = parseInt(params.id as string);

  const [profile, setProfile] = useState<TrackedProfile | null>(null);
  const [snapshots, setSnapshots] = useState<ProfileSnapshot[]>([]);
  const [posts, setPosts] = useState<TrackedPost[]>([]);
  const [engagementTrends, setEngagementTrends] = useState<{ date: string; avg_engagement: number; post_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<{
    display_name?: string;
    headline?: string;
    tracking_frequency?: 'hourly' | 'daily' | 'weekly';
    priority?: number;
    is_active?: boolean;
  }>({});
  const [activeTab, setActiveTab] = useState<'posts' | 'snapshots'>('posts');
  const [spinPost, setSpinPost] = useState<TrackedPost | null>(null);
  const [savedPosts, setSavedPosts] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAllData();
  }, [profileId]);

  async function loadAllData() {
    try {
      setLoading(true);
      const [profileData, snapshotsData, postsData, trendsData] = await Promise.all([
        api.tracker.getProfile(profileId),
        api.tracker.getSnapshots(profileId, 20),
        api.tracker.getPosts({ profile_id: profileId, limit: 50 }),
        api.tracker.getEngagementTrends(profileId, 30),
      ]);
      setProfile(profileData);
      setSnapshots(snapshotsData);
      setPosts(postsData);
      setEngagementTrends(trendsData);
      setEditData({
        display_name: profileData.display_name,
        headline: profileData.headline || undefined,
        tracking_frequency: profileData.tracking_frequency,
        priority: profileData.priority,
      });
    } catch (err) {
      console.error('Error loading profile data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleScrape() {
    if (!profile) return;
    setScraping(true);
    try {
      await api.tracker.triggerScrape(profile.id, 'full');
      // Reload after a delay to get new data
      setTimeout(() => loadAllData(), 3000);
    } catch (err) {
      console.error('Error scraping:', err);
    } finally {
      setScraping(false);
    }
  }

  async function handleToggleActive() {
    if (!profile) return;
    try {
      await api.tracker.updateProfile(profile.id, { is_active: !profile.is_active });
      setProfile({ ...profile, is_active: !profile.is_active });
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  }

  async function handleSaveEdit() {
    if (!profile) return;
    try {
      const updated = await api.tracker.updateProfile(profile.id, editData);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  }

  function handleSpinPost(post: TrackedPost) {
    setSpinPost(post);
  }

  function handleSavePost(post: TrackedPost) {
    setSavedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(post.id)) {
        newSet.delete(post.id);
      } else {
        newSet.add(post.id);
      }
      return newSet;
    });
  }

  function handleAnalyzePost(post: TrackedPost) {
    // For now, just open the post URL or trigger analysis
    if (post.post_url) {
      window.open(post.post_url, '_blank');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-500"></div>
          <span className="text-sm text-neutral-500">Chargement du profil...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-neutral-500">Profil non trouve</p>
        <Link href="/tracker" className="mt-4 text-primary-500 hover:underline">
          Retour a la liste
        </Link>
      </div>
    );
  }

  const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.comments + p.shares, 0);
  const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;
  const analyzedPosts = posts.filter(p => p.is_analyzed).length;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href="/tracker"
          className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-neutral-800">{profile.display_name}</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{profile.headline || 'Aucune description'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              profile.is_active
                ? 'bg-success-light text-success hover:bg-success/20'
                : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {profile.is_active ? (
              <>
                <Play className="w-4 h-4" />
                Actif
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            )}
          </button>
          <a
            href={profile.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 hover:border-neutral-300 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            LinkedIn
          </a>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
            {scraping ? 'Scraping...' : 'Scraper maintenant'}
          </button>
        </div>
      </div>

      {/* Profile Info Card */}
      <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              profile.profile_type === 'person' ? 'bg-blue-500/10' : 'bg-purple-500/10'
            }`}>
              {profile.profile_type === 'person' ? (
                <User className="w-6 h-6 text-blue-500" />
              ) : (
                <Building2 className="w-6 h-6 text-purple-500" />
              )}
            </div>
            <div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                profile.profile_type === 'person'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {profile.profile_type === 'person' ? 'Personne' : 'Entreprise'}
              </span>
            </div>
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-all"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <InfoItem
            icon={<Users className="w-4 h-4" />}
            label="Followers"
            value={profile.follower_count?.toLocaleString() || '-'}
          />
          <InfoItem
            icon={<FileText className="w-4 h-4" />}
            label="Posts trackes"
            value={String(profile.total_posts_tracked || posts.length)}
          />
          <InfoItem
            icon={<Activity className="w-4 h-4" />}
            label="Engagement moy."
            value={String(avgEngagement)}
          />
          <InfoItem
            icon={<Calendar className="w-4 h-4" />}
            label="Frequence"
            value={profile.tracking_frequency === 'hourly' ? 'Toutes les heures' : profile.tracking_frequency === 'daily' ? 'Quotidien' : 'Hebdomadaire'}
          />
        </div>

        {editing && (
          <div className="px-6 pb-6 pt-2 border-t border-neutral-100 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Nom</label>
              <input
                type="text"
                value={editData.display_name || ''}
                onChange={e => setEditData({ ...editData, display_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Headline</label>
              <input
                type="text"
                value={editData.headline || ''}
                onChange={e => setEditData({ ...editData, headline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Frequence</label>
              <select
                value={editData.tracking_frequency || 'daily'}
                onChange={e => setEditData({ ...editData, tracking_frequency: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidien</option>
                <option value="weekly">Hebdomadaire</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Priorite (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={editData.priority || 5}
                onChange={e => setEditData({ ...editData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center gap-6 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Dernier scrape: {formatDate(profile.last_scraped_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Prochain: {formatDate(profile.next_scrape_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Priorite: {profile.priority}/10
          </span>
          {profile.tags && profile.tags.length > 0 && (
            <span className="flex items-center gap-1.5">
              Tags: {profile.tags.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Posts collectes"
          value={posts.length}
        />
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Posts analyses"
          value={analyzedPosts}
          color="success"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Engagement total"
          value={totalEngagement}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Snapshots"
          value={snapshots.length}
          color="purple"
        />
      </div>

      {/* Engagement Chart */}
      {engagementTrends.length > 0 && (
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h3 className="font-medium text-neutral-800">Tendance d'engagement (30 jours)</h3>
          </div>
          <div className="p-5">
            <EngagementChart data={engagementTrends} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'posts'
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Posts ({posts.length})
          </span>
        </button>
        <button
          onClick={() => setActiveTab('snapshots')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'snapshots'
              ? 'bg-white text-neutral-800 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Historique ({snapshots.length})
          </span>
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="bg-surface rounded-lg border border-neutral-200 p-8 text-center">
              <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">Aucun post collecte pour ce profil</p>
              <button
                onClick={handleScrape}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100"
              >
                <RefreshCw className="w-4 h-4" />
                Lancer un scrape
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {posts.map(post => (
                <LinkedInPostCard
                  key={post.id}
                  post={post}
                  authorName={profile.display_name}
                  authorHeadline={profile.headline || undefined}
                  authorImage={profile.profile_image_url || undefined}
                  onSpin={handleSpinPost}
                  onSave={handleSavePost}
                  onAnalyze={handleAnalyzePost}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Snapshots Tab */}
      {activeTab === 'snapshots' && (
        <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
          {snapshots.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-neutral-500">Aucun historique disponible</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {snapshots.map((snapshot, index) => (
                <SnapshotRow key={snapshot.id} snapshot={snapshot} isFirst={index === 0} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spin Modal */}
      {spinPost && (
        <SpinModal
          post={spinPost}
          authorName={profile.display_name}
          onClose={() => setSpinPost(null)}
        />
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-500 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-lg font-semibold text-neutral-800">{value}</p>
        <p className="text-xs text-neutral-500">{label}</p>
      </div>
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
          <p className="text-2xl font-semibold text-neutral-800">{value.toLocaleString()}</p>
          <p className="text-xs text-neutral-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: TrackedPost }) {
  const [expanded, setExpanded] = useState(false);
  const engagement = post.likes + post.comments + post.shares;

  return (
    <div className="bg-surface rounded-lg border border-neutral-200 shadow-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.category && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded">
                  {post.category}
                </span>
              )}
              {post.sentiment && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  post.sentiment === 'positive' ? 'bg-success-light text-success' :
                  post.sentiment === 'negative' ? 'bg-error-light text-error' :
                  'bg-neutral-100 text-neutral-600'
                }`}>
                  {post.sentiment}
                </span>
              )}
              {post.hook_type && (
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {post.hook_type}
                </span>
              )}
              {post.is_analyzed && (
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Analyse
                </span>
              )}
            </div>
            <p className={`text-sm text-neutral-700 ${expanded ? '' : 'line-clamp-3'}`}>
              {post.content || 'Contenu non disponible'}
            </p>
            {post.content && post.content.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-primary-500 hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Voir plus
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-neutral-500">{formatDate(post.posted_at)}</span>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 rounded transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100 flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-sm text-neutral-600">
          <Heart className="w-4 h-4 text-error" />
          {post.likes.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-neutral-600">
          <MessageCircle className="w-4 h-4 text-primary-500" />
          {post.comments.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-neutral-600">
          <Share2 className="w-4 h-4 text-success" />
          {post.shares.toLocaleString()}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-sm font-medium text-neutral-700">
          <TrendingUp className="w-4 h-4" />
          {engagement.toLocaleString()} engagement
        </span>
      </div>
    </div>
  );
}

function SnapshotRow({ snapshot, isFirst }: { snapshot: ProfileSnapshot; isFirst: boolean }) {
  return (
    <div className={`p-4 ${isFirst ? 'bg-primary-50/50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            snapshot.scrape_status === 'success' ? 'bg-success-light' :
            snapshot.scrape_status === 'failed' ? 'bg-error-light' : 'bg-neutral-100'
          }`}>
            <Activity className={`w-5 h-5 ${
              snapshot.scrape_status === 'success' ? 'text-success' :
              snapshot.scrape_status === 'failed' ? 'text-error' : 'text-neutral-500'
            }`} />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">
              {formatDate(snapshot.scraped_at)}
              {isFirst && <span className="ml-2 text-xs text-primary-500">(Plus recent)</span>}
            </p>
            <p className="text-xs text-neutral-500">
              {snapshot.follower_count?.toLocaleString() || '-'} followers
              {snapshot.headline && ` - ${snapshot.headline.substring(0, 50)}...`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {snapshot.is_significant_change && (
            <span className="px-2 py-1 text-xs font-medium bg-warning-light text-warning rounded">
              Changement important
            </span>
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded ${
            snapshot.scrape_status === 'success' ? 'bg-success-light text-success' :
            snapshot.scrape_status === 'failed' ? 'bg-error-light text-error' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            {snapshot.scrape_status}
          </span>
        </div>
      </div>
      {snapshot.changes_detected && snapshot.changes_detected.length > 0 && (
        <div className="mt-3 pl-14">
          <div className="bg-warning-light/50 rounded-lg p-3">
            <p className="text-xs font-medium text-neutral-700 mb-2">Changements detectes:</p>
            <ul className="space-y-1">
              {snapshot.changes_detected.map((change, i) => (
                <li key={i} className="text-xs text-neutral-600">
                  <span className="font-medium">{change.field}:</span>{' '}
                  <span className="text-neutral-500">{change.old_value}</span> →{' '}
                  <span className="text-neutral-800">{change.new_value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {snapshot.error_message && (
        <div className="mt-3 pl-14">
          <div className="bg-error-light rounded-lg p-3">
            <p className="text-xs text-error">{snapshot.error_message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EngagementChart({ data }: { data: { date: string; avg_engagement: number; post_count: number }[] }) {
  const maxEngagement = Math.max(...data.map(d => d.avg_engagement || 0), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((item, index) => {
        const height = ((item.avg_engagement || 0) / maxEngagement) * 100;
        return (
          <div
            key={index}
            className="flex-1 group relative"
          >
            <div
              className="bg-primary-500/80 hover:bg-primary-500 rounded-t transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              <br />
              Engagement: {Math.round(item.avg_engagement || 0)}
              <br />
              Posts: {item.post_count || 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SpinModal({
  post,
  authorName,
  onClose
}: {
  post: TrackedPost;
  authorName: string;
  onClose: () => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState<'professional' | 'casual' | 'inspirational'>('professional');
  const [includeCta, setIncludeCta] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'config' | 'processing' | 'result'>('config');
  const [currentPhase, setCurrentPhase] = useState('');

  // Result state
  const [result, setResult] = useState<{
    content: string;
    hashtags: string[];
    analysis: {
      hook_type: string;
      structure_type: string;
      universal_theme: string;
      core_message: string;
      emotional_trigger: string;
      engagement_drivers: string[];
      success_factors: string[];
      adaptability_score: number;
    } | null;
    selected_angle: string | null;
    authenticity_score: number;
    originality_score: number;
    passed_ai_check: boolean;
    passed_plagiarism_check: boolean;
    iterations: number;
  } | null>(null);

  const handleSpin = async () => {
    setSpinning(true);
    setError(null);
    setStep('processing');
    setCurrentPhase('Analyse du post original...');

    try {
      // Simulate phases for UX (real processing happens on backend)
      const phases = [
        'Analyse du post original...',
        'Extraction du theme universel...',
        'Generation des angles creatifs...',
        'Redaction du post...',
        'Verification anti-AI patterns...',
        'Finalisation...'
      ];

      let phaseIndex = 0;
      const phaseInterval = setInterval(() => {
        phaseIndex++;
        if (phaseIndex < phases.length) {
          setCurrentPhase(phases[phaseIndex]);
        }
      }, 3000);

      const response = await api.generator.spin({
        post_id: post.id,
        tone,
        include_cta: includeCta
      });

      clearInterval(phaseInterval);

      if (response.success && response.generated_post) {
        setResult({
          content: response.generated_post.content,
          hashtags: response.generated_post.hashtags || [],
          analysis: response.analysis,
          selected_angle: response.selected_angle,
          authenticity_score: response.authenticity_score,
          originality_score: response.originality_score,
          passed_ai_check: response.passed_ai_check,
          passed_plagiarism_check: response.passed_plagiarism_check,
          iterations: response.iterations
        });
        setStep('result');
      } else {
        throw new Error('Spin failed - no content generated');
      }
    } catch (err) {
      console.error('Spin error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStep('config');
    } finally {
      setSpinning(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const fullContent = result.content + '\n\n' + result.hashtags.map(h => `#${h}`).join(' ');
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setStep('config');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-[#0a66c2] to-[#004182]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Spin avec gpt-5-nano Reasoning</h2>
              <p className="text-sm text-white/80">Transformation intelligente du contenu de {authorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <strong>Erreur:</strong> {error}
            </div>
          )}

          {/* Config Step */}
          {step === 'config' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Original Content */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Post original
                </h3>
                <div className="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-700 whitespace-pre-wrap max-h-[350px] overflow-y-auto border border-neutral-200">
                  {post.content || 'Contenu non disponible'}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {post.likes}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {post.comments}
                  </span>
                  {post.category && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {post.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Options */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Options de generation
                </h3>

                {/* Tone selector */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-neutral-600 mb-2">Ton du post</label>
                  <div className="flex gap-2">
                    {(['professional', 'casual', 'inspirational'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                          tone === t
                            ? 'bg-[#0a66c2] text-white'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        }`}
                      >
                        {t === 'professional' ? 'Professionnel' : t === 'casual' ? 'Decontracte' : 'Inspirant'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA toggle */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCta}
                      onChange={e => setIncludeCta(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-[#0a66c2] focus:ring-[#0a66c2]"
                    />
                    <span className="text-sm text-neutral-700">Inclure un call-to-action</span>
                  </label>
                </div>

                {/* Info box */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Ce que fait le Spin:</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>1. Analyse en profondeur la structure et le theme</li>
                    <li>2. Genere 3-5 angles creatifs originaux</li>
                    <li>3. Redige un post 100% humain et unique</li>
                    <li>4. Verifie et elimine tout pattern AI</li>
                    <li>5. Valide l'originalite (anti-plagiat)</li>
                  </ul>
                </div>

                {/* Spin button */}
                <button
                  onClick={handleSpin}
                  disabled={spinning}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-[#0a66c2] to-[#004182] text-white rounded-lg hover:from-[#004182] hover:to-[#00294d] transition-all font-semibold text-lg disabled:opacity-50 shadow-lg"
                >
                  <Zap className="w-5 h-5" />
                  Lancer le Spin avec gpt-5-nano
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#0a66c2]/20 border-t-[#0a66c2] animate-spin" />
                <Zap className="w-8 h-8 text-[#0a66c2] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-6 text-lg font-medium text-neutral-700">{currentPhase}</p>
              <p className="mt-2 text-sm text-neutral-500">Utilisation du reasoning model gpt-5-nano...</p>
              <div className="mt-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0a66c2] animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-[#0a66c2] animate-pulse delay-100" />
                <div className="w-2 h-2 rounded-full bg-[#0a66c2] animate-pulse delay-200" />
              </div>
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && result && (
            <div className="grid grid-cols-3 gap-6">
              {/* Analysis Panel */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Analyse
                </h3>

                {result.analysis && (
                  <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-neutral-500">Theme universel</span>
                      <p className="text-sm font-medium text-neutral-800">{result.analysis.universal_theme}</p>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500">Message central</span>
                      <p className="text-sm text-neutral-700">{result.analysis.core_message}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        Hook: {result.analysis.hook_type}
                      </span>
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                        {result.analysis.structure_type}
                      </span>
                      <span className="px-2 py-1 text-xs bg-pink-100 text-pink-700 rounded">
                        {result.analysis.emotional_trigger}
                      </span>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 rounded-lg p-4">
                  <span className="text-xs text-green-600">Angle selectionne</span>
                  <p className="text-sm font-semibold text-green-800">{result.selected_angle}</p>
                </div>

                {/* Scores */}
                <div className="space-y-2">
                  <ScoreBar label="Authenticite" value={result.authenticity_score} color="green" />
                  <ScoreBar label="Originalite" value={result.originality_score} color="blue" />
                </div>

                {/* Checks */}
                <div className="flex flex-col gap-2">
                  <CheckBadge passed={result.passed_ai_check} label="Anti-AI patterns" />
                  <CheckBadge passed={result.passed_plagiarism_check} label="Anti-plagiat" />
                </div>

                <p className="text-xs text-neutral-500">
                  Genere en {result.iterations} iteration{result.iterations > 1 ? 's' : ''}
                </p>
              </div>

              {/* Generated Content */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-neutral-700 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Post genere
                  </h3>
                  <button
                    onClick={handleReset}
                    className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerer
                  </button>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-5 text-sm text-neutral-800 whitespace-pre-wrap border border-green-200 min-h-[300px]">
                  {result.content}
                </div>

                {/* Hashtags */}
                {result.hashtags.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {result.hashtags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#0a66c2] text-white rounded-lg hover:bg-[#004182] transition-all font-medium"
                  >
                    {copied ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Copie !
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Copier le post
                      </>
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-all font-medium"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: 'green' | 'blue' }) {
  const colorClasses = color === 'green'
    ? 'bg-green-500'
    : 'bg-blue-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-neutral-600">{label}</span>
        <span className="font-medium text-neutral-800">{value}/100</span>
      </div>
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses} rounded-full transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function CheckBadge({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {passed ? (
        <Eye className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      )}
      <span className="font-medium">{label}</span>
      <span>{passed ? 'OK' : 'Echec'}</span>
    </div>
  );
}
