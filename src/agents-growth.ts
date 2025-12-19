import { hostedMcpTool, Agent } from "@openai/agents";
import {
  JobListingsResultSchema,
  DecisionMakerResultSchema,
  GrowthCompanySchema
} from "./schemas-growth.js";

// Configuration Bright Data MCP
const BRIGHTDATA_TOKEN = process.env.BRIGHTDATA_MCP_TOKEN || "";

const brightDataMCP = hostedMcpTool({
  serverLabel: "brightdata",
  serverUrl: `https://mcp.brightdata.com/sse?token=${BRIGHTDATA_TOKEN}&groups=social,business`,
  serverDescription: "Bright Data - LinkedIn jobs, profiles, companies",
  authorization: BRIGHTDATA_TOKEN,
  allowedTools: [
    "search_engine",
    "scrape_as_markdown",
    "web_data_linkedin_person_profile",
    "web_data_linkedin_company_profile",
    "web_data_linkedin_job_listings"
  ],
  requireApproval: "never"
});

/**
 * Agent 1: Recherche d'offres d'emploi marketing
 */
export const jobSearchAgent = new Agent({
  name: "Marketing Jobs Finder",
  instructions: `Trouve des offres d'emploi marketing en scrapant jobs.lu.

STRATÉGIE:
1. Utilise scrape_as_markdown sur cette URL exacte:
   https://en.jobs.lu/marketing_market_research_jobs.aspx

2. Parse le markdown retourné pour extraire TOUTES les offres.
   Chaque offre a ce format dans le markdown:
   ## [Titre du poste](URL)
   ### [Nom Entreprise](URL entreprise)
   Location

3. Extrais pour chaque offre:
   - job_title: le titre du poste
   - company_name: le nom de l'entreprise
   - location: la localisation
   - job_url: l'URL de l'offre

4. Retourne TOUTES les offres trouvées (il y en a ~28).

IMPORTANT: Ne fais qu'UN SEUL appel à scrape_as_markdown.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: JobListingsResultSchema
});

/**
 * Agent 2: Extraction des infos entreprise
 */
export const companyEnricherAgent = new Agent({
  name: "Company Enricher",
  instructions: `Enrichis les données d'une entreprise qui recrute en marketing.

DONNÉES À RÉCUPÉRER:
- Taille de l'entreprise
- Secteur d'activité
- Site web officiel
- Page LinkedIn complète

STRATÉGIE:
1. Utilise web_data_linkedin_company_profile si URL LinkedIn fournie
2. Sinon search_engine: "{nom entreprise} LinkedIn company"
3. Scrape le site web pour plus d'infos si nécessaire

Retourne les données enrichies de l'entreprise.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: GrowthCompanySchema
});

/**
 * Agent 3: Recherche du décideur marketing
 */
export const decisionMakerAgent = new Agent({
  name: "Marketing Decision Maker Finder",
  instructions: `Trouve le décideur marketing d'une entreprise.

TITRES CIBLES (par ordre de priorité):
1. CMO, Chief Marketing Officer
2. VP Marketing, VP Growth
3. Head of Marketing, Marketing Director
4. Head of Digital, Head of Growth
5. Marketing Manager (si petite entreprise)

STRATÉGIE:
1. search_engine: "{entreprise} CMO LinkedIn" ou "{entreprise} Head of Marketing"
2. web_data_linkedin_person_profile pour le profil trouvé
3. Déduis l'email: prenom.nom@domaine.com

SCORE DE CONFIANCE:
- 95+ : Email trouvé directement
- 80-94 : Email déduit avec pattern confirmé
- 60-79 : Pattern probable
- <60 : Données incomplètes

Retourne le décideur avec ses coordonnées.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: DecisionMakerResultSchema
});
