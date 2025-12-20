import "dotenv/config";
import express from "express";
import cors from "cors";
import { collectAndClassifyPosts, collectMultipleCompanies } from "./workflow-posts.js";
import { log } from "./logger.js";

const app = express();
const PORT = process.env.POSTS_API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

/**
 * Health check
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "linkedin-posts-collector",
    timestamp: new Date().toISOString()
  });
});

/**
 * Collecter les posts d'une entreprise
 * POST /collect
 * Body: { company_linkedin_url, company_name, max_posts?, classify? }
 */
app.post("/collect", async (req, res) => {
  const { company_linkedin_url, company_name, max_posts, classify } = req.body;

  if (!company_linkedin_url || !company_name) {
    return res.status(400).json({
      error: "Missing required fields: company_linkedin_url, company_name"
    });
  }

  log(`API: Collecte demandée pour ${company_name}`);

  try {
    const result = await collectAndClassifyPosts({
      company_linkedin_url,
      company_name,
      max_posts: max_posts || 20,
      classify: classify !== false
    });

    log(`API: Collecte terminée - ${result.posts.length} posts`);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log(`API: Erreur - ${error}`);
    res.status(500).json({
      success: false,
      error: String(error)
    });
  }
});

/**
 * Collecter les posts de plusieurs entreprises
 * POST /collect/batch
 * Body: { companies: [{ name, linkedin_url }], max_posts_per_company?, classify? }
 */
app.post("/collect/batch", async (req, res) => {
  const { companies, max_posts_per_company, classify } = req.body;

  if (!companies || !Array.isArray(companies) || companies.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid companies array"
    });
  }

  log(`API: Collecte batch demandée pour ${companies.length} entreprises`);

  try {
    const results = await collectMultipleCompanies(companies, {
      max_posts_per_company: max_posts_per_company || 10,
      classify: classify !== false
    });

    const totalPosts = results.reduce((sum, r) => sum + r.posts.length, 0);
    log(`API: Collecte batch terminée - ${totalPosts} posts total`);

    res.json({
      success: true,
      data: {
        results,
        summary: {
          companies_processed: results.length,
          total_posts: totalPosts,
          companies_with_posts: results.filter(r => r.posts.length > 0).length
        }
      }
    });
  } catch (error) {
    log(`API: Erreur batch - ${error}`);
    res.status(500).json({
      success: false,
      error: String(error)
    });
  }
});

/**
 * Classifier un post individuel
 * POST /classify
 * Body: { content: string }
 */
app.post("/classify", async (req, res) => {
  const { content } = req.body;

  if (!content || typeof content !== "string") {
    return res.status(400).json({
      error: "Missing or invalid 'content' field"
    });
  }

  log(`API: Classification demandée pour un post`);

  try {
    const { Runner } = await import("@openai/agents");
    const { postClassifierAgent } = await import("./agents-posts.js");

    const runner = new Runner();

    const classifyQuery = [{
      role: "user" as const,
      content: [{
        type: "input_text" as const,
        text: `Classifie ce post LinkedIn:

CONTENU:
${content}`
      }]
    }];

    const classifyResult = await runner.run(postClassifierAgent, classifyQuery);

    if (!classifyResult.finalOutput) {
      throw new Error("No classification result");
    }

    log(`API: Classification terminée - ${classifyResult.finalOutput.category}`);

    res.json(classifyResult.finalOutput);
  } catch (error) {
    log(`API: Erreur classification - ${error}`);
    res.status(500).json({
      error: String(error)
    });
  }
});

/**
 * Liste des catégories disponibles
 * GET /categories
 */
app.get("/categories", (req, res) => {
  res.json({
    categories: [
      { id: "recruitment", label: "Recrutement", description: "Offres d'emploi, hiring" },
      { id: "promotional", label: "Promotionnel", description: "Produits, services, offres" },
      { id: "thought_leadership", label: "Thought Leadership", description: "Articles, expertise" },
      { id: "events", label: "Événements", description: "Conférences, webinars" },
      { id: "csr", label: "RSE", description: "Environnement, social" },
      { id: "internal_news", label: "Actualités internes", description: "Nominations, équipe" },
      { id: "partnerships", label: "Partenariats", description: "Collaborations, acquisitions" },
      { id: "fundraising", label: "Levée de fonds", description: "Financement, investissement, série A/B/C" }
    ]
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  LinkedIn Posts Collector API                              ║
║  Running on http://localhost:${PORT}                          ║
╠════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║  GET  /health          - Health check                      ║
║  POST /collect         - Collect posts for one company     ║
║  POST /collect/batch   - Collect posts for multiple        ║
║  GET  /categories      - List available categories         ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app };
