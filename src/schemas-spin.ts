import { z } from "zod";

// ============ Spin Input Schemas ============

export const SpinRequestSchema = z.object({
  original_post: z.object({
    content: z.string(),
    author_name: z.string(),
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    category: z.string().nullable(),
    hook_type: z.string().nullable(),
    structure_type: z.string().nullable()
  }),
  company_profile: z.object({
    company_name: z.string(),
    industry: z.string(),
    tone_of_voice: z.array(z.string()),
    key_messages: z.array(z.string()),
    values: z.array(z.string()),
    target_audience: z.object({
      roles: z.array(z.string()),
      industries: z.array(z.string())
    }).nullable(),
    differentiators: z.array(z.string()).nullable()
  }),
  spin_options: z.object({
    tone: z.enum(["professional", "casual", "inspirational"]).default("professional"),
    angle_preference: z.string().nullable().describe("Optional specific angle to explore"),
    include_cta: z.boolean().default(true)
  })
});

// ============ Spin Output Schemas ============

// Step 1: Deep Analysis of original post
export const PostAnalysisResultSchema = z.object({
  // Core structure
  hook_type: z.string().describe("question, statistic, story, controversial, how_to, list_teaser"),
  hook_text: z.string().describe("The exact first line/hook"),
  structure_type: z.string().describe("listicle, narrative, tutorial, opinion, case_study, comparison"),
  cta_type: z.string().describe("question, share, comment, link, follow, none"),

  // Theme extraction - ABSTRACT only
  universal_theme: z.string().describe("Theme abstrait sans references specifiques"),
  core_message: z.string().describe("Le message central en une phrase"),
  emotional_trigger: z.string().describe("Emotion principale visee: curiosity, inspiration, fear, pride, etc."),

  // Engagement factors
  engagement_drivers: z.array(z.string()).describe("personal_story, controversy, actionable_tips, data_backed, emotional_hook, community_question"),
  readability_score: z.number().min(0).max(100),

  // What makes it work
  success_factors: z.array(z.string()).describe("Ce qui rend ce post performant"),

  // What to AVOID copying
  company_specific_elements: z.array(z.string()).describe("Elements specifiques a l'auteur a NE PAS copier"),

  // Adaptation potential
  adaptability_score: z.number().min(0).max(100),
  adaptation_challenges: z.array(z.string())
}).strict();

// Step 2: New angle generation
export const AngleGenerationResultSchema = z.object({
  angles: z.array(z.object({
    angle_name: z.string().describe("Nom court de l'angle"),
    angle_description: z.string().describe("Description de l'approche"),
    differentiation: z.string().describe("En quoi c'est different de l'original"),
    hook_idea: z.string().describe("Idee d'accroche pour cet angle"),
    relevance_to_company: z.number().min(0).max(100).describe("Pertinence pour l'entreprise"),
    originality_score: z.number().min(0).max(100).describe("Score d'originalite vs original")
  })).min(3).max(5),
  recommended_angle_index: z.number().describe("Index de l'angle recommande (0-based)")
}).strict();

// Step 3: Draft generation
export const DraftGenerationResultSchema = z.object({
  draft_content: z.string().describe("Le post genere complet"),
  hashtags: z.array(z.string()).max(5),

  // Quality metrics
  authenticity_score: z.number().min(0).max(100).describe("Score d'authenticite humaine"),
  originality_score: z.number().min(0).max(100).describe("Difference vs original"),
  predicted_engagement: z.number().min(0).max(100),

  // Self-assessment
  strengths: z.array(z.string()).describe("Points forts du post"),
  weaknesses: z.array(z.string()).describe("Points a ameliorer"),

  // AI pattern detection (self-check)
  ai_patterns_detected: z.array(z.string()).describe("Patterns AI detectes a corriger"),
  needs_revision: z.boolean().describe("True si le post a des patterns AI")
}).strict();

// Step 4: Revision (if needed)
export const RevisionResultSchema = z.object({
  revised_content: z.string(),
  changes_made: z.array(z.string()).describe("Liste des corrections apportees"),
  final_authenticity_score: z.number().min(0).max(100),
  final_originality_score: z.number().min(0).max(100),
  ready_to_publish: z.boolean()
}).strict();

// Final combined result
export const SpinResultSchema = z.object({
  success: z.boolean(),

  // Analysis
  analysis: PostAnalysisResultSchema.nullable(),

  // Angles considered
  angles_generated: z.number(),
  selected_angle: z.string().nullable(),

  // Final output
  final_post: z.object({
    content: z.string(),
    hashtags: z.array(z.string()),
    authenticity_score: z.number(),
    originality_score: z.number(),
    predicted_engagement: z.number()
  }).nullable(),

  // Quality gates
  passed_ai_check: z.boolean().describe("True si aucun pattern AI detecte"),
  passed_plagiarism_check: z.boolean().describe("True si suffisamment different"),

  // Iterations
  iterations_count: z.number(),

  // Error if failed
  error: z.string().nullable()
}).strict();

// ============ Type Exports ============

export type SpinRequest = z.infer<typeof SpinRequestSchema>;
export type PostAnalysisResult = z.infer<typeof PostAnalysisResultSchema>;
export type AngleGenerationResult = z.infer<typeof AngleGenerationResultSchema>;
export type DraftGenerationResult = z.infer<typeof DraftGenerationResultSchema>;
export type RevisionResult = z.infer<typeof RevisionResultSchema>;
export type SpinResult = z.infer<typeof SpinResultSchema>;
