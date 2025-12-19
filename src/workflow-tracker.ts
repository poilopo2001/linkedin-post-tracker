import "dotenv/config";
import { Runner, AgentInputItem, withTrace } from "@openai/agents";
import {
  profileScraperAgent,
  postContentAnalyzerAgent,
  postEngagementScraperAgent
} from "./agents-tracker.js";
import type {
  TrackedProfile,
  ProfileSnapshot,
  TrackedPost,
  ProfileChange,
  ScrapeResult,
  BatchScrapeResult,
  ContentAnalysisResult,
  PostEngagementResult
} from "./schemas-tracker.js";
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
  console.log(`[Tracker] ${message}`);
}

// ============ Database Functions ============

/**
 * Charge un profil tracke depuis la DB
 */
function loadProfile(db: Database.Database, profileId: number): TrackedProfile | null {
  const row = db.prepare(`
    SELECT * FROM tracked_profiles WHERE id = ?
  `).get(profileId) as any;

  if (!row) return null;

  return {
    id: row.id,
    linkedin_url: row.linkedin_url,
    profile_type: row.profile_type,
    display_name: row.display_name,
    headline: row.headline,
    location: row.location,
    industry: row.industry,
    follower_count: row.follower_count,
    connection_count: row.connection_count,
    profile_image_url: row.profile_image_url,
    about: row.about,
    tracking_frequency: row.tracking_frequency || "daily",
    is_active: Boolean(row.is_active),
    priority: row.priority || 5,
    tags: row.tags ? JSON.parse(row.tags) : null,
    notes: row.notes,
    total_posts_tracked: row.total_posts_tracked || 0,
    avg_engagement_rate: row.avg_engagement_rate,
    last_scraped_at: row.last_scraped_at,
    next_scrape_at: row.next_scrape_at
  };
}

/**
 * Charge le dernier snapshot d'un profil
 */
function loadLastSnapshot(db: Database.Database, profileId: number): ProfileSnapshot | null {
  const row = db.prepare(`
    SELECT * FROM profile_snapshots
    WHERE profile_id = ?
    ORDER BY scraped_at DESC
    LIMIT 1
  `).get(profileId) as any;

  if (!row) return null;

  return {
    id: row.id,
    profile_id: row.profile_id,
    raw_data: row.raw_data,
    follower_count: row.follower_count,
    connection_count: row.connection_count,
    headline: row.headline,
    about_summary: row.about_summary,
    changes_detected: row.changes_detected ? JSON.parse(row.changes_detected) : null,
    is_significant_change: Boolean(row.is_significant_change),
    scraped_at: row.scraped_at,
    scrape_duration_ms: row.scrape_duration_ms,
    scrape_status: row.scrape_status,
    error_message: row.error_message
  };
}

/**
 * Sauvegarde un snapshot de profil
 */
function saveSnapshot(
  db: Database.Database,
  profileId: number,
  data: any,
  changes: ProfileChange[],
  durationMs: number
): number {
  const hasSignificantChange = changes.some(c => c.is_significant);

  const result = db.prepare(`
    INSERT INTO profile_snapshots (
      profile_id, raw_data, follower_count, connection_count,
      headline, about_summary, changes_detected, is_significant_change,
      scraped_at, scrape_duration_ms, scrape_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'success')
  `).run(
    profileId,
    JSON.stringify(data),
    data.followers || data.follower_count || null,
    data.connections || data.connection_count || null,
    data.position || data.headline || null,
    data.about?.substring(0, 500) || null,
    changes.length > 0 ? JSON.stringify(changes.map(c => c.field)) : null,
    hasSignificantChange ? 1 : 0,
    durationMs
  );

  return result.lastInsertRowid as number;
}

/**
 * Met a jour les donnees d'un profil tracke
 */
function updateProfileData(db: Database.Database, profileId: number, data: any) {
  db.prepare(`
    UPDATE tracked_profiles SET
      headline = COALESCE(?, headline),
      location = COALESCE(?, location),
      follower_count = COALESCE(?, follower_count),
      connection_count = COALESCE(?, connection_count),
      profile_image_url = COALESCE(?, profile_image_url),
      about = COALESCE(?, about),
      last_scraped_at = datetime('now'),
      next_scrape_at = datetime('now', '+1 day')
    WHERE id = ?
  `).run(
    data.position || data.headline || null,
    data.city ? `${data.city}, ${data.country || ''}` : data.hq_location || null,
    data.followers || null,
    data.connections || null,
    data.profile_image_url || data.logo_url || null,
    data.about || null,
    profileId
  );
}

/**
 * Sauvegarde un post tracke
 */
function saveTrackedPost(
  db: Database.Database,
  profileId: number,
  post: any,
  linkedinPostId: string | null
): number {
  // Verifier si le post existe deja
  if (linkedinPostId) {
    const existing = db.prepare(`
      SELECT id FROM tracked_posts WHERE linkedin_post_id = ?
    `).get(linkedinPostId) as any;

    if (existing) {
      // Mettre a jour l'engagement et le contenu si manquant
      const postContent = post.activity_status || post.shared_content || post.content || null;
      db.prepare(`
        UPDATE tracked_posts SET
          likes = ?, comments = ?, is_new = 0,
          content = COALESCE(content, ?),
          content_length = COALESCE(content_length, ?)
        WHERE id = ?
      `).run(
        post.likes || 0,
        post.comments || 0,
        postContent,
        (postContent || "").length,
        existing.id
      );

      return existing.id;
    }
  }

  // Nouveau post
  // Bright Data utilise activity_status pour le contenu du post
  const postContent = post.activity_status || post.shared_content || post.content || null;

  const result = db.prepare(`
    INSERT INTO tracked_posts (
      profile_id, linkedin_post_id, content, post_url, posted_at,
      likes, comments, shares, media_type, media_url,
      content_length, is_new, first_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
  `).run(
    profileId,
    linkedinPostId,
    postContent,
    post.activity_link || post.post_url || null,
    null, // posted_at - pas toujours disponible
    post.likes || 0,
    post.comments || 0,
    0, // shares - rarement disponible
    post.image ? "image" : "text",
    post.image || null,
    (postContent || "").length
  );

  // Mettre a jour le compteur de posts
  db.prepare(`
    UPDATE tracked_profiles SET
      total_posts_tracked = total_posts_tracked + 1
    WHERE id = ?
  `).run(profileId);

  return result.lastInsertRowid as number;
}

/**
 * Sauvegarde les insights d'un post
 */
function savePostInsights(
  db: Database.Database,
  postId: number,
  insights: ContentAnalysisResult
) {
  // Mettre a jour le post avec classification
  db.prepare(`
    UPDATE tracked_posts SET
      category = ?,
      sentiment = ?,
      confidence_score = ?,
      hook_type = ?,
      structure_type = ?,
      cta_type = ?,
      keywords = ?
    WHERE id = ?
  `).run(
    insights.category,
    insights.sentiment,
    insights.confidence,
    insights.hook_type,
    insights.structure_type,
    insights.cta_type,
    null, // keywords - a extraire separement
    postId
  );

  // Inserer les insights detailles
  db.prepare(`
    INSERT INTO post_content_insights (
      post_id, hook_text, key_takeaways, tone,
      predicted_engagement, engagement_drivers,
      adaptability_score, adaptation_suggestions, analyzed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    postId,
    null, // hook_text - extrait du contenu
    JSON.stringify(insights.key_takeaways),
    null, // tone - a deduire
    null, // predicted_engagement
    JSON.stringify(insights.engagement_drivers),
    insights.adaptability_score,
    JSON.stringify(insights.adaptation_suggestions)
  );
}

/**
 * Cree ou met a jour un job de scrape
 */
function createScrapeJob(
  db: Database.Database,
  profileId: number | null,
  jobType: string
): number {
  const result = db.prepare(`
    INSERT INTO scrape_jobs (
      profile_id, job_type, status, created_at, started_at
    ) VALUES (?, ?, 'running', datetime('now'), datetime('now'))
  `).run(profileId, jobType);

  return result.lastInsertRowid as number;
}

/**
 * Complete un job de scrape
 */
function completeScrapeJob(
  db: Database.Database,
  jobId: number,
  itemsScraped: number,
  newItemsFound: number,
  changesDetected: number,
  error: string | null
) {
  db.prepare(`
    UPDATE scrape_jobs SET
      status = ?,
      completed_at = datetime('now'),
      items_scraped = ?,
      new_items_found = ?,
      changes_detected = ?,
      error_message = ?
    WHERE id = ?
  `).run(
    error ? 'failed' : 'completed',
    itemsScraped,
    newItemsFound,
    changesDetected,
    error,
    jobId
  );
}

// ============ Change Detection ============

/**
 * Detecte les changements entre deux snapshots
 */
function detectChanges(
  oldData: any | null,
  newData: any
): ProfileChange[] {
  if (!oldData) return [];

  const changes: ProfileChange[] = [];

  // Verifier les champs importants
  const fieldsToCheck = [
    { field: "position", significant: true },
    { field: "headline", significant: true },
    { field: "current_company_name", significant: true },
    { field: "about", significant: false },
    { field: "followers", significant: false },
    { field: "connections", significant: false }
  ];

  for (const { field, significant } of fieldsToCheck) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    if (field === "followers" && oldValue && newValue) {
      // Changement significatif si > 10%
      const percentChange = Math.abs((newValue - oldValue) / oldValue) * 100;
      if (percentChange > 10) {
        changes.push({
          field,
          old_value: String(oldValue),
          new_value: String(newValue),
          is_significant: true
        });
      }
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        old_value: oldValue ? String(oldValue) : null,
        new_value: newValue ? String(newValue) : null,
        is_significant: significant
      });
    }
  }

  return changes;
}

// ============ Post Engagement Scraping ============

/**
 * Scrape l'engagement d'un post individuel via son URL
 */
async function scrapePostEngagement(postUrl: string): Promise<PostEngagementResult> {
  try {
    log(`Scraping engagement for: ${postUrl}`);

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "tracker",
        workflow_id: `engagement-${Date.now()}`
      }
    });

    const query: AgentInputItem[] = [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Scrape cette page de post LinkedIn pour extraire les metriques d'engagement:
URL: ${postUrl}

Utilise scrape_as_markdown sur cette URL, puis analyse le contenu pour trouver:
- Nombre de likes/reactions
- Nombre de commentaires
- Nombre de partages/reposts`
      }]
    }];

    const result = await runner.run(postEngagementScraperAgent, query);

    if (result.finalOutput) {
      return result.finalOutput;
    }

    return {
      post_url: postUrl,
      success: false,
      likes: null,
      comments: null,
      shares: null,
      full_content: null,
      error: "No output from agent"
    };
  } catch (error: any) {
    log(`Error scraping engagement for ${postUrl}: ${error.message}`);
    return {
      post_url: postUrl,
      success: false,
      likes: null,
      comments: null,
      shares: null,
      full_content: null,
      error: error.message
    };
  }
}

/**
 * Met a jour l'engagement et le contenu d'un post dans la DB
 */
function updatePostEngagement(
  db: Database.Database,
  postId: number,
  engagement: PostEngagementResult
) {
  if (!engagement.success) return;

  db.prepare(`
    UPDATE tracked_posts SET
      likes = COALESCE(?, likes),
      comments = COALESCE(?, comments),
      shares = COALESCE(?, shares),
      content = COALESCE(?, content),
      content_length = COALESCE(?, content_length)
    WHERE id = ?
  `).run(
    engagement.likes,
    engagement.comments,
    engagement.shares,
    engagement.full_content,
    engagement.full_content ? engagement.full_content.length : null,
    postId
  );

  const contentLen = engagement.full_content ? engagement.full_content.length : 0;
  log(`Updated post ${postId}: ${engagement.likes} likes, ${engagement.comments} comments, ${contentLen} chars`);
}

/**
 * Scrape l'engagement de tous les posts d'un profil
 */
async function scrapeAllPostsEngagement(profileId: number): Promise<number> {
  const db = getDb();

  try {
    // Charger les posts avec URL
    const posts = db.prepare(`
      SELECT id, post_url FROM tracked_posts
      WHERE profile_id = ? AND post_url IS NOT NULL
    `).all(profileId) as any[];

    if (posts.length === 0) {
      log("No posts with URLs to scrape");
      return 0;
    }

    log(`Scraping engagement for ${posts.length} posts`);
    let updated = 0;

    for (const post of posts) {
      const engagement = await scrapePostEngagement(post.post_url);
      if (engagement.success) {
        updatePostEngagement(db, post.id, engagement);
        updated++;
      }
      // Pause entre les scrapes
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    return updated;
  } finally {
    db.close();
  }
}

// ============ Main Workflow Functions ============

/**
 * Scrape un profil LinkedIn
 */
async function scrapeProfile(profileId: number): Promise<ScrapeResult> {
  const db = getDb();
  const startTime = Date.now();
  let jobId: number | null = null;

  try {
    const profile = loadProfile(db, profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    log(`Scraping profile: ${profile.display_name} (${profile.profile_type})`);
    jobId = createScrapeJob(db, profileId, "full");

    // Charger le dernier snapshot pour comparaison
    const lastSnapshot = loadLastSnapshot(db, profileId);
    const oldData = lastSnapshot?.raw_data ? JSON.parse(lastSnapshot.raw_data) : null;

    return await withTrace("Profile Scrape", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "tracker",
          workflow_id: `scrape-${Date.now()}`
        }
      });

      const query: AgentInputItem[] = [{
        role: "user",
        content: [{
          type: "input_text",
          text: `Scrape ce profil LinkedIn:
URL: ${profile.linkedin_url}
Type: ${profile.profile_type}

${oldData ? `DONNEES PRECEDENTES (pour detection changements):
Headline: ${oldData.position || oldData.headline || 'N/A'}
Followers: ${oldData.followers || 'N/A'}
About: ${(oldData.about || '').substring(0, 200)}...` : 'Premier scrape de ce profil.'}

Utilise l'outil ${profile.profile_type === 'person'
  ? 'web_data_linkedin_person_profile'
  : 'web_data_linkedin_company_profile'
} avec l'URL fournie.`
        }]
      }];

      const result = await runner.run(profileScraperAgent, query);
      const durationMs = Date.now() - startTime;

      if (result.finalOutput && result.finalOutput.success) {
        const profileData = result.finalOutput.profile_data;

        // Detecter les changements
        const changes = detectChanges(oldData, profileData);

        // Sauvegarder le snapshot
        saveSnapshot(db, profileId, profileData, changes, durationMs);

        // Mettre a jour le profil
        updateProfileData(db, profileId, profileData);

        // Traiter les posts (activity)
        let newPosts = 0;
        const activity = (profileData as any)?.activity || [];

        for (const post of activity) {
          const postId = post.activity_link?.split('/').pop() || null;
          const savedId = saveTrackedPost(db, profileId, post, postId);

          // Verifier si c'est un nouveau post
          const isNew = db.prepare(`
            SELECT is_new FROM tracked_posts WHERE id = ?
          `).get(savedId) as any;

          if (isNew?.is_new) newPosts++;
        }

        // Completer le job
        completeScrapeJob(db, jobId!, activity.length, newPosts, changes.length, null);

        log(`Scraped ${activity.length} posts, ${newPosts} new, ${changes.length} changes`);

        return {
          profile_id: profileId,
          success: true,
          profile_data: profileData,
          posts_found: activity.length,
          new_posts: newPosts,
          changes,
          error: null,
          duration_ms: durationMs
        };
      }

      throw new Error("Scrape failed - no output from agent");
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    if (jobId) {
      completeScrapeJob(db, jobId, 0, 0, 0, error.message);
    }

    log(`Error scraping profile ${profileId}: ${error.message}`);

    return {
      profile_id: profileId,
      success: false,
      profile_data: null,
      posts_found: 0,
      new_posts: 0,
      changes: [],
      error: error.message,
      duration_ms: durationMs
    };
  } finally {
    db.close();
  }
}

/**
 * Scrape plusieurs profils en batch
 */
async function batchScrapeProfiles(
  profileIds?: number[]
): Promise<BatchScrapeResult> {
  const db = getDb();

  try {
    // Si pas d'IDs fournis, charger les profils actifs dus pour scrape
    let idsToScrape = profileIds;

    if (!idsToScrape || idsToScrape.length === 0) {
      const dueProfiles = db.prepare(`
        SELECT id FROM tracked_profiles
        WHERE is_active = 1
          AND (next_scrape_at IS NULL OR next_scrape_at <= datetime('now'))
        ORDER BY priority DESC, last_scraped_at ASC
        LIMIT 10
      `).all() as any[];

      idsToScrape = dueProfiles.map(p => p.id);
    }

    if (idsToScrape.length === 0) {
      log("No profiles due for scraping");
      return {
        total_profiles: 0,
        successful: 0,
        failed: 0,
        results: [],
        total_posts_found: 0,
        total_new_posts: 0
      };
    }

    log(`Batch scraping ${idsToScrape.length} profiles`);
    db.close();

    // Scraper chaque profil
    const results: ScrapeResult[] = [];

    for (const profileId of idsToScrape) {
      const result = await scrapeProfile(profileId);
      results.push(result);

      // Pause entre les scrapes pour eviter rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const successful = results.filter(r => r.success).length;
    const totalPostsFound = results.reduce((sum, r) => sum + r.posts_found, 0);
    const totalNewPosts = results.reduce((sum, r) => sum + r.new_posts, 0);

    log(`Batch complete: ${successful}/${idsToScrape.length} successful`);

    return {
      total_profiles: idsToScrape.length,
      successful,
      failed: idsToScrape.length - successful,
      results,
      total_posts_found: totalPostsFound,
      total_new_posts: totalNewPosts
    };
  } finally {
    // DB deja fermee dans le try
  }
}

/**
 * Analyse le contenu des posts non analyses
 */
async function analyzeUnanalyzedPosts(limit: number = 50): Promise<number> {
  const db = getDb();

  try {
    // Charger les posts sans insights
    const posts = db.prepare(`
      SELECT tp.id, tp.content, tp.profile_id, tpr.display_name as profile_name
      FROM tracked_posts tp
      JOIN tracked_profiles tpr ON tp.profile_id = tpr.id
      LEFT JOIN post_content_insights pci ON tp.id = pci.post_id
      WHERE pci.id IS NULL
        AND tp.content IS NOT NULL
        AND LENGTH(tp.content) > 50
      LIMIT ?
    `).all(limit) as any[];

    if (posts.length === 0) {
      log("No posts to analyze");
      return 0;
    }

    log(`Analyzing ${posts.length} posts`);

    return await withTrace("Content Analysis", async () => {
      const runner = new Runner({
        traceMetadata: {
          __trace_source__: "tracker",
          workflow_id: `analyze-${Date.now()}`
        }
      });

      const postsContext = posts.map(p => ({
        post_id: p.id,
        profile: p.profile_name,
        content: p.content.substring(0, 1000)
      }));

      const query: AgentInputItem[] = [{
        role: "user",
        content: [{
          type: "input_text",
          text: `Analyse ces ${posts.length} posts LinkedIn:

${JSON.stringify(postsContext, null, 2)}

Pour chaque post, determine:
- category, sentiment, confidence
- hook_type, structure_type, cta_type
- key_takeaways, engagement_drivers
- adaptability_score, adaptation_suggestions`
        }]
      }];

      const result = await runner.run(postContentAnalyzerAgent, query);

      if (result.finalOutput) {
        // Sauvegarder les insights
        for (const insight of result.finalOutput.results) {
          savePostInsights(db, insight.post_id, insight);
        }

        log(`Analyzed ${result.finalOutput.analyzed} posts`);
        return result.finalOutput.analyzed;
      }

      return 0;
    });
  } finally {
    db.close();
  }
}

// ============ CLI Entry Point ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage: npx tsx workflow-tracker.ts <command> [args]");
    console.error("Commands:");
    console.error("  scrape <profile_id>     - Scrape a single profile");
    console.error("  batch [profile_ids...]  - Batch scrape profiles (or all due)");
    console.error("  analyze [limit]         - Analyze unanalyzed posts");
    console.error("  engagement <profile_id> - Scrape engagement for all posts of a profile");
    process.exit(1);
  }

  const command = args[0];

  try {
    switch (command) {
      case "scrape": {
        const profileId = parseInt(args[1]);
        if (isNaN(profileId)) {
          console.error("Error: profile_id must be a number");
          process.exit(1);
        }
        const result = await scrapeProfile(profileId);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "batch": {
        const profileIds = args.slice(1).map(id => parseInt(id)).filter(id => !isNaN(id));
        const result = await batchScrapeProfiles(profileIds.length > 0 ? profileIds : undefined);
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      case "analyze": {
        const limit = parseInt(args[1]) || 50;
        const analyzed = await analyzeUnanalyzedPosts(limit);
        console.log(JSON.stringify({ analyzed }, null, 2));
        break;
      }
      case "engagement": {
        const profileId = parseInt(args[1]);
        if (isNaN(profileId)) {
          console.error("Error: profile_id must be a number");
          process.exit(1);
        }
        const updated = await scrapeAllPostsEngagement(profileId);
        console.log(JSON.stringify({ profile_id: profileId, posts_updated: updated }, null, 2));
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
