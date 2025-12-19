import "dotenv/config";
import { Runner, AgentInputItem, withTrace } from "@openai/agents";
import {
  relevanceScorerAgent,
  themeExtractorAgent,
  postGeneratorAgent
} from "./agents-generator.js";
import type {
  UserProfile,
  Post,
  RelevanceScore,
  ExtractedTheme,
  GeneratedPost,
  RelevanceAnalysisResult,
  ThemeExtractionResult,
  PostGenerationResult
} from "./schemas-generator.js";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const DB_PATH = path.join(__dirname, "..", "data", "posts.db");

function getDb() {
  return new Database(DB_PATH);
}

function log(message: string) {
  console.log(`[Generator] ${message}`);
}

/**
 * Charge le profil utilisateur depuis la DB
 */
function loadProfile(db: Database.Database, profileId: number): UserProfile | null {
  const row = db.prepare(`
    SELECT * FROM user_company_profile WHERE id = ?
  `).get(profileId) as any;

  if (!row) return null;

  return {
    id: row.id,
    company_name: row.company_name,
    industry: row.industry,
    sub_industry: row.sub_industry,
    company_size: row.company_size,
    tone_of_voice: row.tone_of_voice ? JSON.parse(row.tone_of_voice) : null,
    key_messages: row.key_messages ? JSON.parse(row.key_messages) : null,
    values: row.values ? JSON.parse(row.values) : null,
    differentiators: row.differentiators ? JSON.parse(row.differentiators) : null,
    target_audience: row.target_audience ? JSON.parse(row.target_audience) : null,
    audience_pain_points: row.audience_pain_points ? JSON.parse(row.audience_pain_points) : null,
    preferred_categories: row.preferred_categories ? JSON.parse(row.preferred_categories) : null,
    excluded_topics: row.excluded_topics ? JSON.parse(row.excluded_topics) : null,
    hashtag_preferences: row.hashtag_preferences ? JSON.parse(row.hashtag_preferences) : null
  };
}

/**
 * Charge les posts depuis la DB
 */
function loadPosts(db: Database.Database, postIds: number[]): Post[] {
  const placeholders = postIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT p.*, c.name as company_name
    FROM posts p
    LEFT JOIN companies c ON p.company_id = c.id
    WHERE p.id IN (${placeholders})
  `).all(...postIds) as any[];

  return rows.map(row => ({
    id: row.id,
    company_id: row.company_id,
    company_name: row.company_name,
    content: row.content,
    category: row.category,
    sentiment: row.sentiment,
    posted_at: row.posted_at,
    likes: row.likes || 0,
    comments: row.comments || 0,
    shares: row.shares || 0
  }));
}

/**
 * Charge les posts d'inspiration depuis le tracker
 * Posts avec score d'adaptabilite >= 70
 */
interface TrackerInsight {
  post_id: number;
  profile_name: string;
  content: string;
  category: string | null;
  hook_type: string | null;
  structure_type: string | null;
  engagement: number;
  adaptability_score: number;
  adaptation_suggestions: string[];
  engagement_drivers: string[];
}

function loadTrackerInsights(db: Database.Database, limit: number = 10): TrackerInsight[] {
  const rows = db.prepare(`
    SELECT
      tp.id as post_id,
      prof.display_name as profile_name,
      tp.content,
      tp.category,
      tp.hook_type,
      tp.structure_type,
      (tp.likes + tp.comments) as engagement,
      pci.adaptability_score,
      pci.adaptation_suggestions,
      pci.engagement_drivers
    FROM tracked_posts tp
    JOIN post_content_insights pci ON tp.id = pci.post_id
    JOIN tracked_profiles prof ON tp.profile_id = prof.id
    WHERE pci.adaptability_score >= 70
    ORDER BY pci.adaptability_score DESC, engagement DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map(row => ({
    post_id: row.post_id,
    profile_name: row.profile_name,
    content: row.content,
    category: row.category,
    hook_type: row.hook_type,
    structure_type: row.structure_type,
    engagement: row.engagement || 0,
    adaptability_score: row.adaptability_score,
    adaptation_suggestions: row.adaptation_suggestions ? JSON.parse(row.adaptation_suggestions) : [],
    engagement_drivers: row.engagement_drivers ? JSON.parse(row.engagement_drivers) : []
  }));
}

/**
 * Sauvegarde les scores de pertinence
 */
function saveRelevanceScores(
  db: Database.Database,
  profileId: number,
  scores: RelevanceScore[]
) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO post_relevance_scores (
      post_id, profile_id, overall_relevance, theme_relevance,
      audience_relevance, industry_relevance, is_company_specific,
      is_adaptable, universal_theme, adaptable_elements, reasoning, scored_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const transaction = db.transaction(() => {
    for (const score of scores) {
      insert.run(
        score.post_id,
        profileId,
        score.overall_relevance,
        score.theme_relevance,
        score.audience_relevance,
        score.industry_relevance,
        score.is_company_specific ? 1 : 0,
        score.is_adaptable ? 1 : 0,
        score.universal_theme,
        score.adaptable_elements ? JSON.stringify(score.adaptable_elements) : null,
        score.reasoning
      );
    }
  });

  transaction();
}

/**
 * Sauvegarde les themes extraits
 */
function saveThemes(
  db: Database.Database,
  profileId: number,
  themes: ExtractedTheme[]
) {
  const insert = db.prepare(`
    INSERT INTO extracted_themes (
      profile_id, theme_name, theme_description, category,
      occurrence_count, avg_engagement, avg_relevance_score,
      source_post_ids, example_angles, is_trending,
      first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const transaction = db.transaction(() => {
    for (const theme of themes) {
      insert.run(
        profileId,
        theme.theme_name,
        theme.theme_description,
        theme.category,
        theme.occurrence_count,
        theme.avg_engagement,
        null, // avg_relevance_score calculer plus tard
        JSON.stringify(theme.source_post_ids),
        JSON.stringify(theme.example_angles),
        theme.is_trending ? 1 : 0
      );
    }
  });

  transaction();
}

/**
 * Sauvegarde les posts generes
 */
function saveGeneratedPosts(
  db: Database.Database,
  profileId: number,
  posts: GeneratedPost[]
) {
  const insert = db.prepare(`
    INSERT INTO generated_posts (
      profile_id, content, hashtags, call_to_action,
      theme, category, target_emotion, inspiration_post_ids,
      predicted_engagement, authenticity_score, status, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))
  `);

  const transaction = db.transaction(() => {
    for (const post of posts) {
      insert.run(
        profileId,
        post.content,
        JSON.stringify(post.hashtags),
        post.call_to_action,
        post.theme,
        post.category,
        post.target_emotion,
        JSON.stringify(post.inspiration_sources),
        post.predicted_engagement,
        post.authenticity_score
      );
    }
  });

  transaction();
}

/**
 * Phase 1: Analyse de pertinence des posts
 */
async function analyzeRelevance(
  profileId: number,
  postIds: number[]
): Promise<RelevanceAnalysisResult> {
  const db = getDb();

  try {
    const profile = loadProfile(db, profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const posts = loadPosts(db, postIds);
    if (posts.length === 0) {
      throw new Error("No posts found");
    }

    log(`Analyzing ${posts.length} posts for profile: ${profile.company_name}`);

    return await withTrace("Relevance Analysis", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "generator",
          workflow_id: `analyze-${Date.now()}`
        }
      });

      // Preparer le contexte pour l'agent
      const postsContext = posts.map(p => ({
        id: p.id,
        company: p.company_name,
        category: p.category,
        content: p.content?.substring(0, 500),
        engagement: p.likes + p.comments + p.shares
      }));

      const query: AgentInputItem[] = [{
        role: "user",
        content: [{
          type: "input_text",
          text: `PROFIL ENTREPRISE:
Nom: ${profile.company_name}
Secteur: ${profile.industry}
Ton: ${profile.tone_of_voice?.join(", ") || "professionnel"}
Messages cles: ${profile.key_messages?.join("; ") || "N/A"}
Audience cible: ${JSON.stringify(profile.target_audience) || "N/A"}

POSTS A ANALYSER:
${JSON.stringify(postsContext, null, 2)}

Analyse chaque post et retourne un score de pertinence.`
        }]
      }];

      const result = await runner.run(relevanceScorerAgent, query);

      if (result.finalOutput) {
        // Sauvegarder les scores
        saveRelevanceScores(db, profileId, result.finalOutput.scores);
        log(`Saved ${result.finalOutput.scores.length} relevance scores`);
        return result.finalOutput;
      }

      return {
        scores: [],
        total_analyzed: posts.length,
        avg_relevance: 0,
        adaptable_count: 0,
        company_specific_count: 0
      };
    });
  } finally {
    db.close();
  }
}

/**
 * Phase 2: Extraction des themes
 */
async function extractThemes(
  profileId: number,
  _scoreIds: number[]
): Promise<ThemeExtractionResult> {
  const db = getDb();

  try {
    const profile = loadProfile(db, profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Charger les scores pertinents avec les posts
    const scoredPosts = db.prepare(`
      SELECT prs.*, p.content, p.category, p.likes, p.comments, p.shares,
             c.name as company_name
      FROM post_relevance_scores prs
      JOIN posts p ON prs.post_id = p.id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE prs.profile_id = ?
        AND prs.overall_relevance >= 50
        AND prs.is_adaptable = 1
      ORDER BY prs.overall_relevance DESC
    `).all(profileId) as any[];

    if (scoredPosts.length === 0) {
      throw new Error("No adaptable posts found. Run analyze first.");
    }

    log(`Extracting themes from ${scoredPosts.length} relevant posts`);

    return await withTrace("Theme Extraction", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "generator",
          workflow_id: `themes-${Date.now()}`
        }
      });

      // NE PAS passer le contenu brut - seulement les themes abstraits
      const postsContext = scoredPosts.map(p => ({
        post_id: p.post_id,
        // content: OMIS volontairement pour eviter la copie
        category: p.category,
        universal_theme: p.universal_theme || "theme non identifie",
        relevance: p.overall_relevance,
        engagement: (p.likes || 0) + (p.comments || 0) + (p.shares || 0)
      }));

      const query: AgentInputItem[] = [{
        role: "user",
        content: [{
          type: "input_text",
          text: `PROFIL ENTREPRISE:
Nom: ${profile.company_name}
Secteur: ${profile.industry}

POSTS PERTINENTS AVEC SCORES:
${JSON.stringify(postsContext, null, 2)}

Extrait les themes communs et propose des angles.`
        }]
      }];

      const result = await runner.run(themeExtractorAgent, query);

      if (result.finalOutput) {
        saveThemes(db, profileId, result.finalOutput.themes);
        log(`Saved ${result.finalOutput.themes.length} themes`);
        return result.finalOutput;
      }

      return {
        themes: [],
        total_posts_analyzed: scoredPosts.length,
        unique_themes_found: 0
      };
    });
  } finally {
    db.close();
  }
}

/**
 * Phase 3: Generation de posts
 */
async function generatePosts(
  profileId: number,
  args: {
    num_posts: number;
    category?: string | null;
    theme?: string | null;
    target_emotion?: string | null;
  }
): Promise<PostGenerationResult> {
  const db = getDb();

  try {
    const profile = loadProfile(db, profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Charger les themes
    let themesQuery = db.prepare(`
      SELECT * FROM extracted_themes
      WHERE profile_id = ?
      ORDER BY occurrence_count DESC, avg_engagement DESC
      LIMIT 10
    `);

    const themes = themesQuery.all(profileId) as any[];

    if (themes.length === 0) {
      log("No themes found, generating with profile only");
    }

    // Charger les insights du tracker
    const trackerInsights = loadTrackerInsights(db, 10);
    log(`Loaded ${trackerInsights.length} tracker insights for inspiration`);

    log(`Generating ${args.num_posts} posts with ${themes.length} themes`);

    return await withTrace("Post Generation", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "generator",
          workflow_id: `generate-${Date.now()}`
        }
      });

      const themesContext = themes.map(t => ({
        name: t.theme_name,
        description: t.theme_description,
        category: t.category,
        angles: t.example_angles ? JSON.parse(t.example_angles) : [],
        engagement: t.avg_engagement
      }));

      // Formater les insights tracker pour le prompt
      const trackerContext = trackerInsights.map(t => ({
        source: t.profile_name,
        category: t.category,
        hook_type: t.hook_type,
        structure: t.structure_type,
        engagement: t.engagement,
        adaptability: t.adaptability_score,
        drivers: t.engagement_drivers,
        how_to_adapt: t.adaptation_suggestions
      }));

      const query: AgentInputItem[] = [{
        role: "user",
        content: [{
          type: "input_text",
          text: `PROFIL ENTREPRISE:
Nom: ${profile.company_name}
Secteur: ${profile.industry}
Sous-secteur: ${profile.sub_industry || "N/A"}
Taille: ${profile.company_size || "N/A"}
Ton souhaite: ${profile.tone_of_voice?.join(", ") || "professionnel"}
Valeurs: ${profile.values?.join(", ") || "N/A"}
Ce qui les differencie: ${profile.differentiators?.join("; ") || "N/A"}
Audience cible: ${JSON.stringify(profile.target_audience) || "N/A"}
Problemes de l'audience: ${profile.audience_pain_points?.join("; ") || "N/A"}

INTENTION GENERALE (a reformuler, NE PAS copier):
${profile.key_messages?.join("\n") || "N/A"}

THEMES A EXPLORER (choisis-en un different pour chaque post):
${JSON.stringify(themesContext, null, 2)}

INSIGHTS DU TRACKER (posts performants adaptes pour inspiration):
${trackerContext.length > 0 ? JSON.stringify(trackerContext, null, 2) : "Aucun post tracker disponible"}

INSTRUCTIONS ADAPTATION:
- Utilise les "hook_type" et "structure" des posts performants comme inspiration
- Applique les "drivers" (facteurs de succes) identifies
- Suis les suggestions "how_to_adapt" pour chaque post
- NE COPIE JAMAIS le contenu - inspire-toi uniquement des patterns

PARAMETRES:
- Nombre de posts: ${args.num_posts}
- Categorie: ${args.category || "au choix"}
- Theme specifique: ${args.theme || "libre"}
- Emotion cible: ${args.target_emotion || "inspire"}

IMPORTANT: Chaque post doit etre COMPLETEMENT DIFFERENT des autres.
- Angles differents
- Structures differentes
- Accroches differentes
- Ne JAMAIS reprendre les memes mots ou exemples

Genere ${args.num_posts} posts LinkedIn varies et originaux.`
        }]
      }];

      const result = await runner.run(postGeneratorAgent, query);

      if (result.finalOutput) {
        saveGeneratedPosts(db, profileId, result.finalOutput.posts);
        log(`Saved ${result.finalOutput.posts.length} generated posts`);
        return result.finalOutput;
      }

      return {
        posts: [],
        themes_used: [],
        generation_quality: 0
      };
    });
  } finally {
    db.close();
  }
}

// ============ CLI Entry Point ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: npx tsx workflow-generator.ts <command> <profile_id> [data]");
    console.error("Commands: analyze, themes, generate");
    process.exit(1);
  }

  const command = args[0];
  const profileId = parseInt(args[1]);

  try {
    switch (command) {
      case "analyze": {
        const postIds = JSON.parse(args[2] || "[]");
        const result = await analyzeRelevance(profileId, postIds);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "themes": {
        const scoreIds = JSON.parse(args[2] || "[]");
        const result = await extractThemes(profileId, scoreIds);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "generate": {
        const genArgs = JSON.parse(args[2] || "{}");
        const result = await generatePosts(profileId, {
          num_posts: genArgs.num_posts || 3,
          category: genArgs.category,
          theme: genArgs.theme,
          target_emotion: genArgs.target_emotion
        });
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

main();
