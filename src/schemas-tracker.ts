import { z } from "zod";

// ============ Profile Schemas ============

export const ProfileTypeSchema = z.enum(["person", "company"]);

export const TrackingFrequencySchema = z.enum(["hourly", "daily", "weekly"]);

export const TrackedProfileSchema = z.object({
  id: z.number(),
  linkedin_url: z.string(),
  profile_type: ProfileTypeSchema,
  display_name: z.string(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  industry: z.string().nullable(),
  follower_count: z.number().nullable(),
  connection_count: z.number().nullable(),
  profile_image_url: z.string().nullable(),
  about: z.string().nullable(),
  tracking_frequency: TrackingFrequencySchema.default("daily"),
  is_active: z.boolean().default(true),
  priority: z.number().default(5),
  tags: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  total_posts_tracked: z.number().default(0),
  avg_engagement_rate: z.number().nullable(),
  last_scraped_at: z.string().nullable(),
  next_scrape_at: z.string().nullable()
});

// ============ Snapshot Schemas ============

export const ProfileSnapshotSchema = z.object({
  id: z.number(),
  profile_id: z.number(),
  raw_data: z.string().nullable(),
  follower_count: z.number().nullable(),
  connection_count: z.number().nullable(),
  headline: z.string().nullable(),
  about_summary: z.string().nullable(),
  changes_detected: z.array(z.string()).nullable(),
  is_significant_change: z.boolean().default(false),
  scraped_at: z.string(),
  scrape_duration_ms: z.number().nullable(),
  scrape_status: z.string().default("success"),
  error_message: z.string().nullable()
});

// For OpenAI Structured Outputs: all fields required, use nullable for optional values
export const ProfileChangeSchema = z.object({
  field: z.string().describe("Champ qui a change"),
  old_value: z.string().nullable().describe("Ancienne valeur"),
  new_value: z.string().nullable().describe("Nouvelle valeur"),
  is_significant: z.boolean().describe("True si changement important (job, headline)")
}).strict();

// ============ Tracked Post Schemas ============

export const TrackedPostSchema = z.object({
  id: z.number(),
  profile_id: z.number(),
  linkedin_post_id: z.string().nullable(),
  content: z.string().nullable(),
  post_url: z.string().nullable(),
  posted_at: z.string().nullable(),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  media_type: z.string().nullable(),
  media_url: z.string().nullable(),
  category: z.string().nullable(),
  sentiment: z.string().nullable(),
  confidence_score: z.number().nullable(),
  keywords: z.array(z.string()).nullable(),
  hook_type: z.string().nullable(),
  structure_type: z.string().nullable(),
  cta_type: z.string().nullable(),
  content_length: z.number().nullable(),
  hashtag_count: z.number().nullable(),
  is_new: z.boolean().default(true),
  first_seen_at: z.string(),
  engagement_history: z.array(z.object({
    date: z.string(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number()
  })).nullable()
});

// ============ Content Insight Schemas ============

export const PostContentInsightSchema = z.object({
  id: z.number(),
  post_id: z.number(),
  hook_text: z.string().nullable().describe("Premiere ligne/accroche du post"),
  key_takeaways: z.array(z.string()).nullable().describe("Points cles extraits"),
  call_to_action: z.string().nullable().describe("CTA identifie"),
  tone: z.string().nullable().describe("Ton general: professional, casual, inspirational"),
  readability_score: z.number().nullable().describe("Score de lisibilite 0-100"),
  emoji_usage: z.number().default(0).describe("Nombre d'emojis"),
  line_break_pattern: z.string().nullable().describe("Pattern: dense, spaced, mixed"),
  predicted_engagement: z.number().nullable().describe("Engagement predit 0-100"),
  engagement_drivers: z.array(z.string()).nullable().describe("Facteurs d'engagement"),
  adaptability_score: z.number().nullable().describe("Score d'adaptabilite 0-100"),
  adaptation_suggestions: z.array(z.string()).nullable().describe("Suggestions d'adaptation"),
  analyzed_at: z.string()
});

// ============ Scrape Job Schemas ============

export const JobTypeSchema = z.enum(["profile", "posts", "full"]);
export const JobStatusSchema = z.enum(["pending", "running", "completed", "failed"]);

export const ScrapeJobSchema = z.object({
  id: z.number(),
  profile_id: z.number().nullable(),
  job_type: JobTypeSchema,
  status: JobStatusSchema.default("pending"),
  scheduled_at: z.string().nullable(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  items_scraped: z.number().default(0),
  new_items_found: z.number().default(0),
  changes_detected: z.number().default(0),
  error_message: z.string().nullable(),
  retry_count: z.number().default(0),
  max_retries: z.number().default(3)
});

// ============ Bright Data Response Schemas ============

// For OpenAI Structured Outputs: all fields must be required but can be nullable
export const LinkedInActivitySchema = z.object({
  activity_status: z.string().nullable(),
  activity_link: z.string().nullable(),
  image: z.string().nullable(),
  shared_title: z.string().nullable(),
  shared_link: z.string().nullable(),
  shared_content: z.string().nullable(),
  likes: z.number().nullable(),
  comments: z.number().nullable()
}).strict();

export const LinkedInPersonProfileSchema = z.object({
  url: z.string(),
  id: z.string().nullable(),
  name: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  position: z.string().nullable(),
  current_company_name: z.string().nullable(),
  current_company_link: z.string().nullable(),
  about: z.string().nullable(),
  followers: z.number().nullable(),
  connections: z.number().nullable(),
  profile_image_url: z.string().nullable(),
  activity: z.array(LinkedInActivitySchema).nullable()
}).strict();

export const LinkedInCompanyProfileSchema = z.object({
  url: z.string(),
  name: z.string().nullable(),
  about: z.string().nullable(),
  hq_location: z.string().nullable(),
  industry: z.string().nullable(),
  company_size: z.string().nullable(),
  followers: z.number().nullable(),
  logo_url: z.string().nullable(),
  website: z.string().nullable()
}).strict();

// Unified profile schema for agent output (combines person + company fields)
// For OpenAI Structured Outputs: all fields must be required but can be nullable
export const LinkedInProfileDataSchema = z.object({
  url: z.string(),
  profile_type: z.string().describe("'person' or 'company'"),
  // Person fields
  id: z.string().nullable(),
  name: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  position: z.string().nullable(),
  current_company_name: z.string().nullable(),
  current_company_link: z.string().nullable(),
  about: z.string().nullable(),
  followers: z.number().nullable(),
  connections: z.number().nullable(),
  profile_image_url: z.string().nullable(),
  // Company fields
  hq_location: z.string().nullable(),
  industry: z.string().nullable(),
  company_size: z.string().nullable(),
  logo_url: z.string().nullable(),
  website: z.string().nullable(),
  // Activity (posts)
  activity: z.array(LinkedInActivitySchema).nullable()
}).strict();

// ============ Agent Output Schemas ============

// For OpenAI Structured Outputs: all fields required, use nullable for optional values
export const ScrapeResultSchema = z.object({
  profile_id: z.number(),
  success: z.boolean(),
  // profile_data is nullable - will be present if success=true, null otherwise
  profile_data: LinkedInProfileDataSchema.nullable(),
  posts_found: z.number(),
  new_posts: z.number(),
  changes: z.array(ProfileChangeSchema),
  error: z.string().nullable().describe("Error message if success=false, null otherwise"),
  duration_ms: z.number()
}).strict();

export const BatchScrapeResultSchema = z.object({
  total_profiles: z.number(),
  successful: z.number(),
  failed: z.number(),
  results: z.array(ScrapeResultSchema),
  total_posts_found: z.number(),
  total_new_posts: z.number()
}).strict();

// For OpenAI Structured Outputs: all fields required, use nullable for optional values
export const ContentAnalysisResultSchema = z.object({
  post_id: z.number(),
  category: z.string().describe("Classification: thought_leadership, promotional, recruitment, etc."),
  sentiment: z.string().describe("positive, neutral, negative"),
  confidence: z.number().min(0).max(100),
  hook_type: z.string().nullable().describe("question, statistic, story, controversial, how-to"),
  structure_type: z.string().nullable().describe("listicle, narrative, tutorial, opinion, case_study"),
  cta_type: z.string().nullable().describe("question, share, comment, link, none"),
  key_takeaways: z.array(z.string()).describe("Points cles du post"),
  engagement_drivers: z.array(z.string()).describe("Facteurs d'engagement identifies"),
  adaptability_score: z.number().min(0).max(100).describe("Score d'adaptabilite pour le generateur"),
  adaptation_suggestions: z.array(z.string()).describe("Comment adapter ce post pour notre entreprise")
}).strict();

export const BatchContentAnalysisResultSchema = z.object({
  analyzed: z.number(),
  results: z.array(ContentAnalysisResultSchema)
}).strict();

// Schema for post engagement scraping result
export const PostEngagementResultSchema = z.object({
  post_url: z.string(),
  success: z.boolean(),
  likes: z.number().nullable(),
  comments: z.number().nullable(),
  shares: z.number().nullable(),
  full_content: z.string().nullable().describe("Contenu complet du post"),
  error: z.string().nullable()
}).strict();

// ============ Type Exports ============

export type ProfileType = z.infer<typeof ProfileTypeSchema>;
export type TrackingFrequency = z.infer<typeof TrackingFrequencySchema>;
export type TrackedProfile = z.infer<typeof TrackedProfileSchema>;
export type ProfileSnapshot = z.infer<typeof ProfileSnapshotSchema>;
export type ProfileChange = z.infer<typeof ProfileChangeSchema>;
export type TrackedPost = z.infer<typeof TrackedPostSchema>;
export type PostContentInsight = z.infer<typeof PostContentInsightSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type ScrapeJob = z.infer<typeof ScrapeJobSchema>;
export type LinkedInActivity = z.infer<typeof LinkedInActivitySchema>;
export type LinkedInPersonProfile = z.infer<typeof LinkedInPersonProfileSchema>;
export type LinkedInCompanyProfile = z.infer<typeof LinkedInCompanyProfileSchema>;
export type LinkedInProfileData = z.infer<typeof LinkedInProfileDataSchema>;
export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;
export type BatchScrapeResult = z.infer<typeof BatchScrapeResultSchema>;
export type ContentAnalysisResult = z.infer<typeof ContentAnalysisResultSchema>;
export type BatchContentAnalysisResult = z.infer<typeof BatchContentAnalysisResultSchema>;
export type PostEngagementResult = z.infer<typeof PostEngagementResultSchema>;
