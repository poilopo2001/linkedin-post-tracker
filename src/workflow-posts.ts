import { Runner, AgentInputItem, withTrace } from "@openai/agents";
import { postCollectorAgent, postClassifierAgent } from "./agents-posts.js";
import type {
  PostsWorkflowConfig,
  ClassifiedCollectionResult,
  ClassifiedPost,
  LinkedInPostRaw,
  PostCategory,
  Sentiment
} from "./schemas-posts.js";
import { log, clearLog } from "./logger.js";

/**
 * Workflow principal - Collecte et classification des posts LinkedIn
 */
export async function collectAndClassifyPosts(
  config: PostsWorkflowConfig
): Promise<ClassifiedCollectionResult> {
  const startTime = Date.now();
  const maxPosts = config.max_posts || 20;
  const shouldClassify = config.classify !== false;

  return await withTrace("LinkedIn Posts Collection", async () => {
    clearLog();

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "linkedin-posts",
        workflow_id: `posts-${Date.now()}`
      }
    });

    log("=== PHASE 1: Collecte des posts LinkedIn ===");
    log(`Entreprise: ${config.company_name}`);
    log(`URL: ${config.company_linkedin_url}`);

    // Phase 1: Collecter les posts
    const collectQuery: AgentInputItem[] = [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Collecte les posts LinkedIn de cette entreprise:
Nom: ${config.company_name}
URL LinkedIn: ${config.company_linkedin_url}

Récupère tous les posts récents disponibles (maximum ${maxPosts}).`
      }]
    }];

    const collectResult = await runner.run(postCollectorAgent, collectQuery);

    if (!collectResult.finalOutput || !collectResult.finalOutput.posts) {
      log("Aucun post trouvé");
      return buildEmptyResult(config, startTime);
    }

    const rawPosts = collectResult.finalOutput.posts.slice(0, maxPosts);
    const company = collectResult.finalOutput.company;

    log(`Trouvé ${rawPosts.length} posts`);

    // Phase 2: Classifier chaque post (si activé)
    const classifiedPosts: ClassifiedPost[] = [];

    if (shouldClassify && rawPosts.length > 0) {
      log("=== PHASE 2: Classification des posts ===");

      for (let i = 0; i < rawPosts.length; i++) {
        const post = rawPosts[i];
        log(`[${i + 1}/${rawPosts.length}] Classification en cours...`);

        try {
          const classifyQuery: AgentInputItem[] = [{
            role: "user",
            content: [{
              type: "input_text",
              text: `Classifie ce post LinkedIn:

CONTENU:
${post.content}

DATE: ${post.posted_at || "Non spécifiée"}
ENGAGEMENT: ${post.likes} likes, ${post.comments} comments, ${post.shares} shares`
            }]
          }];

          const classifyResult = await runner.run(postClassifierAgent, classifyQuery);

          if (classifyResult.finalOutput) {
            const classified: ClassifiedPost = {
              ...post,
              category: classifyResult.finalOutput.category,
              sentiment: classifyResult.finalOutput.sentiment,
              confidence_score: classifyResult.finalOutput.confidence_score,
              keywords: classifyResult.finalOutput.keywords
            };

            classifiedPosts.push(classified);
            log(`  -> ${classifyResult.finalOutput.category} (${classifyResult.finalOutput.sentiment}, ${classifyResult.finalOutput.confidence_score}%)`);
          } else {
            // Fallback si classification échoue
            classifiedPosts.push({
              ...post,
              category: "internal_news" as PostCategory,
              sentiment: "neutral" as Sentiment,
              confidence_score: 0,
              keywords: []
            });
          }
        } catch (error) {
          log(`  -> Erreur classification: ${error}`);
          classifiedPosts.push({
            ...post,
            category: "internal_news" as PostCategory,
            sentiment: "neutral" as Sentiment,
            confidence_score: 0,
            keywords: []
          });
        }

        // Rate limiting
        await sleep(1000);
      }
    } else {
      // Sans classification, on retourne les posts bruts avec catégorie par défaut
      for (const post of rawPosts) {
        classifiedPosts.push({
          ...post,
          category: "internal_news" as PostCategory,
          sentiment: "neutral" as Sentiment,
          confidence_score: 0,
          keywords: []
        });
      }
    }

    log("=== PHASE 3: Compilation des résultats ===");

    return buildResult(company, classifiedPosts, startTime);
  });
}

/**
 * Collecte les posts de plusieurs entreprises
 */
export async function collectMultipleCompanies(
  companies: Array<{ name: string; linkedin_url: string }>,
  options: { classify?: boolean; max_posts_per_company?: number } = {}
): Promise<ClassifiedCollectionResult[]> {
  const results: ClassifiedCollectionResult[] = [];

  log(`=== Collecte pour ${companies.length} entreprises ===`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    log(`\n[${i + 1}/${companies.length}] ${company.name}`);

    try {
      const result = await collectAndClassifyPosts({
        company_name: company.name,
        company_linkedin_url: company.linkedin_url,
        max_posts: options.max_posts_per_company || 10,
        classify: options.classify !== false
      });

      results.push(result);
    } catch (error) {
      log(`Erreur pour ${company.name}: ${error}`);
    }

    // Rate limiting entre entreprises
    if (i < companies.length - 1) {
      log("Pause 3s avant prochaine entreprise...");
      await sleep(3000);
    }
  }

  return results;
}

function buildResult(
  company: any,
  posts: ClassifiedPost[],
  startTime: number
): ClassifiedCollectionResult {
  // Calculer statistiques par catégorie
  const byCategory: Record<string, number> = {};
  const bySentiment: Record<string, number> = {};
  let totalEngagement = 0;

  for (const post of posts) {
    byCategory[post.category] = (byCategory[post.category] || 0) + 1;
    bySentiment[post.sentiment] = (bySentiment[post.sentiment] || 0) + 1;
    totalEngagement += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
  }

  return {
    company: {
      name: company.name || "Unknown",
      linkedin_url: company.linkedin_url || "",
      industry: company.industry || null,
      location: company.location || "Luxembourg",
      employee_count: company.employee_count || null,
      website: company.website || null
    },
    posts,
    statistics: {
      total_posts: posts.length,
      by_category: Object.keys(byCategory).length > 0 ? byCategory as any : null,
      by_sentiment: Object.keys(bySentiment).length > 0 ? bySentiment as any : null,
      avg_engagement: posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0,
      collection_duration_seconds: Math.round((Date.now() - startTime) / 1000)
    },
    collected_at: new Date().toISOString()
  };
}

function buildEmptyResult(
  config: PostsWorkflowConfig,
  startTime: number
): ClassifiedCollectionResult {
  return {
    company: {
      name: config.company_name,
      linkedin_url: config.company_linkedin_url,
      industry: null,
      location: "Luxembourg",
      employee_count: null,
      website: null
    },
    posts: [],
    statistics: {
      total_posts: 0,
      by_category: null,
      by_sentiment: null,
      avg_engagement: 0,
      collection_duration_seconds: Math.round((Date.now() - startTime) / 1000)
    },
    collected_at: new Date().toISOString()
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
