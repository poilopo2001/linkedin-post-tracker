import { z } from "zod";

/**
 * Catégories de posts LinkedIn
 */
export const PostCategoryEnum = z.enum([
  "recruitment",        // Recrutement, offres d'emploi
  "promotional",        // Promotionnel, produits, services
  "thought_leadership", // Articles, opinions, expertise
  "events",             // Événements, conférences, webinars
  "csr",                // RSE, environnement, social
  "internal_news",      // Actualités internes, nominations
  "partnerships",       // Partenariats, collaborations
  "fundraising"         // Levées de fonds, financement, série A/B/C
]);

export type PostCategory = z.infer<typeof PostCategoryEnum>;

/**
 * Sentiment du post
 */
export const SentimentEnum = z.enum(["positive", "neutral", "negative"]);

export type Sentiment = z.infer<typeof SentimentEnum>;

/**
 * Type de média dans le post
 */
export const MediaTypeEnum = z.enum(["text", "image", "video", "document", "poll", "article"]);

/**
 * Post LinkedIn brut (avant classification)
 */
export const LinkedInPostRawSchema = z.object({
  post_id: z.string().nullable(),
  content: z.string(),
  posted_at: z.string().nullable(),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  media_type: MediaTypeEnum.nullable(),
  url: z.string().nullable()
});

export type LinkedInPostRaw = z.infer<typeof LinkedInPostRawSchema>;

/**
 * Résultat de classification d'un post
 */
export const ClassificationResultSchema = z.object({
  category: PostCategoryEnum,
  sentiment: SentimentEnum,
  confidence_score: z.number().min(0).max(100),
  keywords: z.array(z.string()),
  reasoning: z.string().nullable()
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

/**
 * Post LinkedIn classifié
 */
export const ClassifiedPostSchema = LinkedInPostRawSchema.extend({
  category: PostCategoryEnum,
  sentiment: SentimentEnum,
  confidence_score: z.number().min(0).max(100),
  keywords: z.array(z.string())
});

export type ClassifiedPost = z.infer<typeof ClassifiedPostSchema>;

/**
 * Entreprise trackée
 */
export const TrackedCompanySchema = z.object({
  name: z.string(),
  linkedin_url: z.string(),
  industry: z.string().nullable(),
  location: z.string().default("Luxembourg"),
  employee_count: z.number().nullable(),
  website: z.string().nullable()
});

export type TrackedCompany = z.infer<typeof TrackedCompanySchema>;

/**
 * Résultat de collecte de posts pour une entreprise
 */
export const PostCollectionResultSchema = z.object({
  company: TrackedCompanySchema,
  posts: z.array(LinkedInPostRawSchema),
  total_posts: z.number(),
  collected_at: z.string()
});

export type PostCollectionResult = z.infer<typeof PostCollectionResultSchema>;

/**
 * Résultat final avec posts classifiés
 */
export const ClassifiedCollectionResultSchema = z.object({
  company: TrackedCompanySchema,
  posts: z.array(ClassifiedPostSchema),
  statistics: z.object({
    total_posts: z.number(),
    by_category: z.record(PostCategoryEnum, z.number()).nullable(),
    by_sentiment: z.record(SentimentEnum, z.number()).nullable(),
    avg_engagement: z.number(),
    collection_duration_seconds: z.number()
  }),
  collected_at: z.string()
});

export type ClassifiedCollectionResult = z.infer<typeof ClassifiedCollectionResultSchema>;

/**
 * Configuration du workflow de collecte
 */
export interface PostsWorkflowConfig {
  company_linkedin_url: string;
  company_name: string;
  max_posts?: number;
  classify?: boolean;
}

/**
 * Statistiques globales pour le dashboard
 */
export const DashboardStatsSchema = z.object({
  total_companies: z.number(),
  total_posts: z.number(),
  posts_by_category: z.record(z.string(), z.number()),
  posts_by_sentiment: z.record(z.string(), z.number()),
  top_companies_by_activity: z.array(z.object({
    name: z.string(),
    post_count: z.number()
  })),
  recent_trends: z.array(z.object({
    date: z.string(),
    category: z.string(),
    count: z.number()
  }))
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;
