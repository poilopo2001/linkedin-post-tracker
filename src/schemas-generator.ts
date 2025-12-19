import { z } from "zod";

// ============ Profile Schemas ============

export const TargetAudienceSchema = z.object({
  roles: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  company_sizes: z.array(z.string()).default([])
});

export const UserProfileSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  industry: z.string(),
  sub_industry: z.string().nullable(),
  company_size: z.string().nullable(),
  tone_of_voice: z.array(z.string()).nullable(),
  key_messages: z.array(z.string()).nullable(),
  values: z.array(z.string()).nullable(),
  differentiators: z.array(z.string()).nullable(),
  target_audience: TargetAudienceSchema.nullable(),
  audience_pain_points: z.array(z.string()).nullable(),
  preferred_categories: z.array(z.string()).nullable(),
  excluded_topics: z.array(z.string()).nullable(),
  hashtag_preferences: z.array(z.string()).nullable()
});

// ============ Post Schemas ============

export const PostSchema = z.object({
  id: z.number(),
  company_id: z.number(),
  company_name: z.string().nullable(),
  content: z.string().nullable(),
  category: z.string().nullable(),
  sentiment: z.string().nullable(),
  posted_at: z.string().nullable(),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0)
});

// ============ Relevance Scoring Schemas ============

export const RelevanceScoreSchema = z.object({
  post_id: z.number().describe("ID du post analyse"),
  overall_relevance: z.number().min(0).max(100).describe("Score global de pertinence 0-100"),
  theme_relevance: z.number().min(0).max(100).describe("Pertinence du theme 0-100"),
  audience_relevance: z.number().min(0).max(100).describe("Pertinence pour l'audience cible 0-100"),
  industry_relevance: z.number().min(0).max(100).describe("Pertinence sectorielle 0-100"),
  is_company_specific: z.boolean().describe("True si le post est specifique a l'entreprise concurrente (evenement interne, nomination)"),
  is_adaptable: z.boolean().describe("True si le theme peut etre reutilise pour notre entreprise"),
  universal_theme: z.string().nullable().describe("Theme universel extractible (ex: transformation digitale, innovation)"),
  adaptable_elements: z.array(z.string()).nullable().describe("Elements reutilisables: hook, structure, CTA, format"),
  reasoning: z.string().describe("Explication du score et de l'analyse")
});

export const RelevanceAnalysisResultSchema = z.object({
  scores: z.array(RelevanceScoreSchema),
  total_analyzed: z.number(),
  avg_relevance: z.number(),
  adaptable_count: z.number(),
  company_specific_count: z.number()
});

// ============ Theme Extraction Schemas ============

export const ExtractedThemeSchema = z.object({
  theme_name: z.string().describe("Nom du theme identifie"),
  theme_description: z.string().describe("Description detaillee du theme"),
  category: z.string().nullable().describe("Categorie de post associee"),
  occurrence_count: z.number().describe("Nombre de fois ou ce theme apparait"),
  avg_engagement: z.number().describe("Engagement moyen des posts sur ce theme"),
  source_post_ids: z.array(z.number()).describe("IDs des posts sources"),
  example_angles: z.array(z.string()).describe("Angles possibles pour aborder ce theme"),
  is_trending: z.boolean().describe("True si le theme est en tendance recente")
});

export const ThemeExtractionResultSchema = z.object({
  themes: z.array(ExtractedThemeSchema),
  total_posts_analyzed: z.number(),
  unique_themes_found: z.number()
});

// ============ Post Generation Schemas ============

export const GeneratedPostSchema = z.object({
  content: z.string().describe("Contenu complet du post LinkedIn"),
  hashtags: z.array(z.string()).describe("Hashtags recommandes"),
  call_to_action: z.string().nullable().describe("Appel a l'action final"),
  theme: z.string().describe("Theme utilise pour la generation"),
  category: z.string().describe("Categorie du post genere"),
  target_emotion: z.string().describe("Emotion cible: inspire, educate, engage, entertain"),
  predicted_engagement: z.number().min(0).max(100).describe("Score de prediction d'engagement 0-100"),
  authenticity_score: z.number().min(0).max(100).describe("Score d'authenticite par rapport au profil 0-100"),
  inspiration_sources: z.array(z.number()).describe("IDs des posts d'inspiration")
});

export const PostGenerationResultSchema = z.object({
  posts: z.array(GeneratedPostSchema),
  themes_used: z.array(z.string()),
  generation_quality: z.number().describe("Score qualite global de la generation")
});

// ============ Workflow Input/Output Schemas ============

export const AnalyzeWorkflowInputSchema = z.object({
  profile_id: z.number(),
  post_ids: z.array(z.number()),
  profile: UserProfileSchema,
  posts: z.array(PostSchema)
});

export const ThemesWorkflowInputSchema = z.object({
  profile_id: z.number(),
  profile: UserProfileSchema,
  scored_posts: z.array(z.object({
    post: PostSchema,
    score: RelevanceScoreSchema
  }))
});

export const GenerateWorkflowInputSchema = z.object({
  profile_id: z.number(),
  profile: UserProfileSchema,
  themes: z.array(ExtractedThemeSchema),
  num_posts: z.number().default(3),
  category: z.string().nullable(),
  target_emotion: z.string().nullable()
});

// ============ Type Exports ============

export type TargetAudience = z.infer<typeof TargetAudienceSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Post = z.infer<typeof PostSchema>;
export type RelevanceScore = z.infer<typeof RelevanceScoreSchema>;
export type RelevanceAnalysisResult = z.infer<typeof RelevanceAnalysisResultSchema>;
export type ExtractedTheme = z.infer<typeof ExtractedThemeSchema>;
export type ThemeExtractionResult = z.infer<typeof ThemeExtractionResultSchema>;
export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;
export type PostGenerationResult = z.infer<typeof PostGenerationResultSchema>;
export type AnalyzeWorkflowInput = z.infer<typeof AnalyzeWorkflowInputSchema>;
export type ThemesWorkflowInput = z.infer<typeof ThemesWorkflowInputSchema>;
export type GenerateWorkflowInput = z.infer<typeof GenerateWorkflowInputSchema>;
