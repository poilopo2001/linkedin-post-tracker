const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Company {
  id: number;
  name: string;
  linkedin_url: string;
  industry: string | null;
  location: string;
  employee_count: number | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
  last_collected_at: string | null;
  post_count?: number;
}

export interface Post {
  id: number;
  company_id: number;
  linkedin_post_id: string | null;
  content: string | null;
  posted_at: string | null;
  category: string | null;
  sentiment: string | null;
  confidence_score: number | null;
  keywords: string | null;
  likes: number;
  comments: number;
  shares: number;
  media_type: string | null;
  url: string | null;
  collected_at: string;
  company_name?: string;
}

export interface CategoryCount {
  category: string;
  count: number;
  percentage: number;
}

export interface DashboardStats {
  total_companies: number;
  active_companies: number;
  total_posts: number;
  posts_last_7_days: number;
  posts_by_category: CategoryCount[];
  posts_by_sentiment: { sentiment: string; count: number; percentage: number }[];
  top_companies: { company_id: number; company_name: string; post_count: number; avg_engagement: number }[];
  recent_trends: { date: string; category: string; count: number }[];
}

// ============ Generator Types ============

export interface TargetAudience {
  roles: string[];
  industries: string[];
  company_sizes: string[];
}

export interface UserCompanyProfile {
  id: number;
  company_name: string;
  industry: string;
  sub_industry: string | null;
  company_size: string | null;
  tone_of_voice: string[] | null;
  key_messages: string[] | null;
  values: string[] | null;
  differentiators: string[] | null;
  target_audience: TargetAudience | null;
  audience_pain_points: string[] | null;
  preferred_categories: string[] | null;
  excluded_topics: string[] | null;
  hashtag_preferences: string[] | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserCompanyProfileCreate {
  company_name: string;
  industry: string;
  sub_industry?: string;
  company_size?: string;
  tone_of_voice?: string[];
  key_messages?: string[];
  values?: string[];
  differentiators?: string[];
  target_audience?: TargetAudience;
  audience_pain_points?: string[];
  preferred_categories?: string[];
  excluded_topics?: string[];
  hashtag_preferences?: string[];
}

export interface PostRelevanceScore {
  id: number;
  post_id: number;
  profile_id: number;
  overall_relevance: number;
  theme_relevance: number | null;
  audience_relevance: number | null;
  industry_relevance: number | null;
  is_company_specific: boolean;
  is_adaptable: boolean;
  universal_theme: string | null;
  adaptable_elements: string[] | null;
  reasoning: string | null;
  scored_at: string;
  post_content?: string;
  post_category?: string;
  post_engagement?: number;
  company_name?: string;
}

export interface ExtractedTheme {
  id: number;
  profile_id: number;
  theme_name: string;
  theme_description: string | null;
  category: string | null;
  occurrence_count: number;
  avg_engagement: number | null;
  avg_relevance_score: number | null;
  source_post_ids: number[] | null;
  example_angles: string[] | null;
  first_seen_at: string;
  last_seen_at: string;
  is_trending: boolean;
}

export interface GeneratedPost {
  id: number;
  profile_id: number;
  content: string;
  hashtags: string[] | null;
  call_to_action: string | null;
  theme: string | null;
  category: string | null;
  target_emotion: string | null;
  inspiration_post_ids: number[] | null;
  predicted_engagement: number | null;
  authenticity_score: number | null;
  status: 'draft' | 'approved' | 'used' | 'archived';
  generated_at: string;
  used_at: string | null;
}

export interface AnalyzeRelevanceResponse {
  total_posts_analyzed: number;
  relevant_posts: number;
  company_specific_posts: number;
  adaptable_posts: number;
  avg_relevance: number;
  top_themes: string[];
}

export interface GeneratorStats {
  has_profile: boolean;
  profile_name?: string;
  posts_analyzed: number;
  relevant_posts: number;
  themes_extracted: number;
  posts_generated: number;
  posts_used: number;
}

// ============ Tracker Types ============

export interface TrackedProfile {
  id: number;
  linkedin_url: string;
  profile_type: 'person' | 'company';
  display_name: string;
  headline: string | null;
  location: string | null;
  industry: string | null;
  follower_count: number | null;
  connection_count: number | null;
  profile_image_url: string | null;
  about: string | null;
  tracking_frequency: 'hourly' | 'daily' | 'weekly';
  is_active: boolean;
  priority: number;
  tags: string[] | null;
  notes: string | null;
  total_posts_tracked: number | null;
  avg_engagement_rate: number | null;
  created_at: string;
  last_scraped_at: string | null;
  next_scrape_at: string | null;
}

export interface TrackedProfileCreate {
  linkedin_url: string;
  profile_type: 'person' | 'company';
  display_name: string;
  headline?: string;
  tracking_frequency?: 'hourly' | 'daily' | 'weekly';
  priority?: number;
  tags?: string[];
  notes?: string;
}

export interface ProfileSnapshot {
  id: number;
  profile_id: number;
  follower_count: number | null;
  connection_count: number | null;
  headline: string | null;
  about_summary: string | null;
  changes_detected: { field: string; old_value: string; new_value: string; is_significant: boolean }[] | null;
  is_significant_change: boolean;
  scraped_at: string;
  scrape_status: string;
  error_message: string | null;
}

export interface TrackedPost {
  id: number;
  profile_id: number;
  linkedin_post_id: string | null;
  content: string | null;
  post_url: string | null;
  posted_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  media_type: string | null;
  media_url: string | null;
  category: string | null;
  sentiment: string | null;
  hook_type: string | null;
  structure_type: string | null;
  cta_type: string | null;
  is_analyzed: boolean;
  first_seen_at: string;
  profile_name?: string;
}

export interface PostContentInsight {
  id: number;
  post_id: number;
  hook_text: string | null;
  key_takeaways: string[] | null;
  tone: string | null;
  engagement_drivers: string[] | null;
  adaptability_score: number | null;
  adaptation_suggestions: string[] | null;
  analyzed_at: string;
}

export interface TrackedPostWithInsights extends TrackedPost {
  insights: PostContentInsight | null;
}

export interface ScrapeJob {
  id: number;
  profile_id: number;
  job_type: 'profile' | 'posts' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  items_scraped: number;
  error_message: string | null;
  created_at: string;
  profile_name?: string;
}

export interface TrackerAnalytics {
  total_profiles: number;
  active_profiles: number;
  total_posts: number;
  posts_this_week: number;
  avg_engagement: number;
  top_categories: { category: string; count: number }[];
}

export interface InspirationPost {
  post_id: number;
  profile_name: string;
  content: string;
  category: string | null;
  sentiment: string | null;
  hook_type: string | null;
  structure_type: string | null;
  likes: number;
  comments: number;
  adaptability_score: number;
  adaptation_suggestions: string[];
  engagement_drivers: string[];
  key_takeaways: string[];
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Companies
  companies: {
    list: (params?: { active_only?: boolean; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.active_only !== undefined) query.set('active_only', String(params.active_only));
      if (params?.search) query.set('search', params.search);
      return fetchApi<Company[]>(`/api/companies?${query}`);
    },
    get: (id: number) => fetchApi<Company>(`/api/companies/${id}`),
    create: (data: Omit<Company, 'id' | 'is_active' | 'created_at' | 'last_collected_at'>) =>
      fetchApi<Company>('/api/companies', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Company>) =>
      fetchApi<Company>(`/api/companies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/companies/${id}`, { method: 'DELETE' }),
  },

  // Posts
  posts: {
    list: (params?: {
      company_id?: number;
      category?: string;
      sentiment?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.company_id) query.set('company_id', String(params.company_id));
      if (params?.category) query.set('category', params.category);
      if (params?.sentiment) query.set('sentiment', params.sentiment);
      if (params?.date_from) query.set('date_from', params.date_from);
      if (params?.date_to) query.set('date_to', params.date_to);
      if (params?.search) query.set('search', params.search);
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<Post[]>(`/api/posts?${query}`);
    },
    get: (id: number) => fetchApi<Post>(`/api/posts/${id}`),
    collect: (params?: { company_id?: number; max_posts?: number; classify?: boolean }) =>
      fetchApi<any>('/api/posts/collect', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }),
    reclassify: (company_id?: number) =>
      fetchApi<any>(`/api/posts/reclassify${company_id ? `?company_id=${company_id}` : ''}`, {
        method: 'POST',
      }),
    categories: () => fetchApi<{ categories: { id: string; label: string; color: string }[] }>('/api/posts/categories'),
  },

  // Trends
  trends: {
    dashboard: (days?: number) =>
      fetchApi<DashboardStats>(`/api/trends${days ? `?days=${days}` : ''}`),
    categories: (params?: { company_id?: number; days?: number }) => {
      const query = new URLSearchParams();
      if (params?.company_id) query.set('company_id', String(params.company_id));
      if (params?.days) query.set('days', String(params.days));
      return fetchApi<any>(`/api/trends/categories?${query}`);
    },
    timeline: (params?: { category?: string; company_id?: number; days?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.company_id) query.set('company_id', String(params.company_id));
      if (params?.days) query.set('days', String(params.days));
      return fetchApi<any>(`/api/trends/timeline?${query}`);
    },
    company: (companyId: number, days?: number) =>
      fetchApi<any>(`/api/trends/company/${companyId}${days ? `?days=${days}` : ''}`),
  },

  // Profile (User Company)
  profile: {
    get: () => fetchApi<UserCompanyProfile | null>('/api/profile'),
    create: (data: UserCompanyProfileCreate) =>
      fetchApi<UserCompanyProfile>('/api/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (data: Partial<UserCompanyProfileCreate>) =>
      fetchApi<UserCompanyProfile>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Generator
  generator: {
    stats: () => fetchApi<GeneratorStats>('/api/generator/stats'),

    analyzeRelevance: (params?: { category?: string; days?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.days) query.set('days', String(params.days));
      return fetchApi<AnalyzeRelevanceResponse>(`/api/generator/analyze-relevance?${query}`, {
        method: 'POST',
      });
    },

    getScores: (params?: { min_relevance?: number; adaptable_only?: boolean; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.min_relevance) query.set('min_score', String(params.min_relevance));
      if (params?.adaptable_only !== undefined) query.set('adaptable_only', String(params.adaptable_only));
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<PostRelevanceScore[]>(`/api/generator/relevance-scores?${query}`);
    },

    extractThemes: () =>
      fetchApi<{ themes: ExtractedTheme[]; total_posts_analyzed: number }>('/api/generator/extract-themes', {
        method: 'POST',
      }),

    getThemes: (params?: { trending_only?: boolean }) => {
      const query = new URLSearchParams();
      if (params?.trending_only !== undefined) query.set('trending_only', String(params.trending_only));
      return fetchApi<ExtractedTheme[]>(`/api/generator/themes?${query}`);
    },

    generate: (params: { num_posts: number; category?: string; theme?: string; target_emotion?: string }) =>
      fetchApi<{ generated_posts: GeneratedPost[]; themes_used: string[] }>('/api/generator/generate', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    getDrafts: (params?: { status?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      return fetchApi<GeneratedPost[]>(`/api/generator/drafts?${query}`);
    },

    updateDraftStatus: (id: number, status: 'draft' | 'approved' | 'used' | 'archived') =>
      fetchApi<GeneratedPost>(`/api/generator/drafts/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    deleteDraft: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/generator/drafts/${id}`, { method: 'DELETE' }),

    // Inspiration from tracker
    getInspirationFromTracker: (params?: { min_adaptability?: number; category?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.min_adaptability) query.set('min_adaptability', String(params.min_adaptability));
      if (params?.category) query.set('category', params.category);
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<InspirationPost[]>(`/api/generator/inspiration-from-tracker?${query}`);
    },

    getInspirationStats: () => fetchApi<{
      total_analyzed_posts: number;
      adaptable_posts: number;
      highly_adaptable_posts: number;
      by_category: { category: string; count: number; avg_adaptability: number }[];
      top_sources: { profile_name: string; post_count: number; avg_adaptability: number }[];
    }>('/api/generator/inspiration-stats'),

    // Spin - Transform a tracked post into a new original post
    spin: (params: {
      post_id: number;
      tone?: 'professional' | 'casual' | 'inspirational';
      angle_preference?: string;
      include_cta?: boolean;
    }) => {
      const query = new URLSearchParams();
      query.set('post_id', String(params.post_id));
      if (params.tone) query.set('tone', params.tone);
      if (params.angle_preference) query.set('angle_preference', params.angle_preference);
      if (params.include_cta !== undefined) query.set('include_cta', String(params.include_cta));
      return fetchApi<{
        success: boolean;
        generated_post: GeneratedPost;
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
      }>(`/api/generator/spin?${query}`, { method: 'POST' });
    },
  },

  // Tracker
  tracker: {
    // Profiles
    getProfiles: (params?: { active_only?: boolean; profile_type?: string; search?: string }) => {
      const query = new URLSearchParams();
      if (params?.active_only !== undefined) query.set('active_only', String(params.active_only));
      if (params?.profile_type) query.set('profile_type', params.profile_type);
      if (params?.search) query.set('search', params.search);
      return fetchApi<TrackedProfile[]>(`/api/tracker/profiles?${query}`);
    },

    getProfile: (id: number) => fetchApi<TrackedProfile>(`/api/tracker/profiles/${id}`),

    createProfile: (data: TrackedProfileCreate) =>
      fetchApi<TrackedProfile>('/api/tracker/profiles', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    updateProfile: (id: number, data: Partial<TrackedProfileCreate & { is_active?: boolean }>) =>
      fetchApi<TrackedProfile>(`/api/tracker/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    deleteProfile: (id: number) =>
      fetchApi<{ success: boolean }>(`/api/tracker/profiles/${id}`, { method: 'DELETE' }),

    // Snapshots
    getSnapshots: (profileId: number, limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return fetchApi<ProfileSnapshot[]>(`/api/tracker/profiles/${profileId}/snapshots${query}`);
    },

    // Posts
    getPosts: (params?: { profile_id?: number; category?: string; analyzed_only?: boolean; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.profile_id) query.set('profile_id', String(params.profile_id));
      if (params?.category) query.set('category', params.category);
      if (params?.analyzed_only !== undefined) query.set('analyzed_only', String(params.analyzed_only));
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<TrackedPost[]>(`/api/tracker/posts?${query}`);
    },

    getPost: (id: number) => fetchApi<TrackedPostWithInsights>(`/api/tracker/posts/${id}`),

    // Scraping
    triggerScrape: (profileId: number, jobType: 'profile' | 'posts' | 'full' = 'full') =>
      fetchApi<ScrapeJob>(`/api/tracker/scrape/${profileId}`, {
        method: 'POST',
        body: JSON.stringify({ job_type: jobType }),
      }),

    batchScrape: (profileIds: number[]) =>
      fetchApi<{ jobs: ScrapeJob[]; total_queued: number }>('/api/tracker/scrape/batch', {
        method: 'POST',
        body: JSON.stringify({ profile_ids: profileIds }),
      }),

    // Jobs
    getJobs: (params?: { status?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.limit) query.set('limit', String(params.limit));
      return fetchApi<ScrapeJob[]>(`/api/tracker/jobs?${query}`);
    },

    // Analytics
    getAnalytics: () => fetchApi<TrackerAnalytics>('/api/tracker/analytics/overview'),

    getEngagementTrends: (profileId?: number, days?: number) => {
      const query = new URLSearchParams();
      if (profileId) query.set('profile_id', String(profileId));
      if (days) query.set('days', String(days));
      return fetchApi<{ date: string; avg_engagement: number; post_count: number }[]>(
        `/api/tracker/analytics/engagement-trends?${query}`
      );
    },

    getTopPerformers: (limit?: number) => {
      const query = limit ? `?limit=${limit}` : '';
      return fetchApi<{ post_id: number; profile_name: string; content: string; engagement: number; category: string }[]>(
        `/api/tracker/analytics/top-performers${query}`
      );
    },
  },
};
