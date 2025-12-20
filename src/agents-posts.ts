import { hostedMcpTool, Agent } from "@openai/agents";
import {
  PostCollectionResultSchema,
  ClassificationResultSchema
} from "./schemas-posts.js";

// Configuration Bright Data MCP
const BRIGHTDATA_TOKEN = process.env.BRIGHTDATA_MCP_TOKEN || "";

const brightDataMCP = hostedMcpTool({
  serverLabel: "brightdata",
  serverUrl: `https://mcp.brightdata.com/sse?token=${BRIGHTDATA_TOKEN}&groups=social,business`,
  authorization: BRIGHTDATA_TOKEN,
  allowedTools: [
    "search_engine",
    "scrape_as_markdown",
    "web_data_linkedin_company_profile",
    "scraping_browser_navigate",
    "scraping_browser_snapshot",
    "scraping_browser_scroll",
    "scraping_browser_get_text"
  ],
  requireApproval: "never"
});

/**
 * Agent 1: Collecteur de posts LinkedIn
 * Récupère les posts récents d'une page entreprise via Bright Data
 */
export const postCollectorAgent = new Agent({
  name: "LinkedIn Post Collector",
  instructions: `Tu collectes les posts récents d'une page LinkedIn entreprise.

STRATÉGIE:
1. Utilise web_data_linkedin_company_profile avec l'URL LinkedIn fournie
2. Le profil retourné contient un champ "updates" avec les posts récents
3. RETOURNE ABSOLUMENT TOUS LES POSTS trouvés dans "updates", sans exception
4. Pour chaque post dans "updates", extrais:
   - post_id: identifiant unique si disponible
   - content: le texte complet du post
   - posted_at: la date de publication (format ISO si possible)
   - likes: nombre de likes
   - comments: nombre de commentaires
   - shares: nombre de partages (reshares)
   - media_type: "text", "image", "video", "document", "poll", "article"
   - url: lien vers le post si disponible

4. Extrais aussi les infos de l'entreprise:
   - name: nom de l'entreprise
   - linkedin_url: URL LinkedIn
   - industry: secteur d'activité
   - location: localisation
   - employee_count: nombre d'employés
   - website: site web officiel

IMPORTANT:
- Ne fais qu'UN SEUL appel à web_data_linkedin_company_profile
- Retourne TOUS les posts trouvés dans "updates"
- Si un champ n'est pas disponible, utilise null`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: PostCollectionResultSchema
});

/**
 * Agent 1b: Collecteur avancé avec scraping browser
 * Pour collecter un grand nombre de posts (> 10)
 */
export const postCollectorBrowserAgent = new Agent({
  name: "LinkedIn Post Collector (Browser)",
  instructions: `Tu collectes un grand nombre de posts LinkedIn via le scraping browser.

STRATÉGIE:
1. Utilise scraping_browser_navigate pour aller sur l'URL LinkedIn fournie
2. Utilise scraping_browser_snapshot pour voir le contenu initial
3. Scroll progressivement avec scraping_browser_scroll pour charger plus de posts
4. À chaque scroll, utilise scraping_browser_get_text pour extraire les nouveaux posts
5. Continue jusqu'à avoir collecté le nombre demandé de posts ou jusqu'à ce qu'il n'y ait plus de nouveaux posts

EXTRACTION DE DONNÉES:
Pour chaque post visible, extrais:
- post_id: identifiant unique si disponible dans l'URL ou data attributes
- content: le texte complet du post
- posted_at: date de publication (cherche des patterns comme "il y a 2 jours", "3h", etc.)
- likes: nombre de réactions/likes
- comments: nombre de commentaires
- shares: nombre de partages
- media_type: "text", "image", "video", "document", "poll", "article"
- url: lien vers le post

IMPORTANT:
- Scroll plusieurs fois si nécessaire pour charger suffisamment de posts
- Déduplique les posts (même content ou post_id)
- Retourne TOUS les posts uniques collectés
- Si un champ n'est pas disponible, utilise null`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: PostCollectionResultSchema
});

/**
 * Agent 2: Classificateur de posts
 * Analyse et catégorise un post LinkedIn
 */
export const postClassifierAgent = new Agent({
  name: "Post Classifier",
  instructions: `Tu analyses et classifies un post LinkedIn dans une catégorie.

CATÉGORIES (choisis UNE seule):
- recruitment: offres d'emploi, recrutement, "we're hiring", "join us", "rejoignez-nous"
- promotional: produits, services, promotions, lancements, offres commerciales
- thought_leadership: articles, réflexions, expertise, tendances secteur, opinions
- events: conférences, webinaires, salons, événements, meetups
- csr: RSE, environnement, social, diversité, impact, développement durable
- internal_news: nominations, anniversaires entreprise, nouveaux bureaux, équipe
- partnerships: partenariats, collaborations, acquisitions, clients, cas d'usage
- fundraising: levées de fonds, financement, investissement, série A/B/C/D, capital, VCs

ANALYSE:
1. Lis attentivement le contenu du post
2. Identifie les mots-clés significatifs
3. Détermine la catégorie principale (celle qui domine)
4. Évalue le sentiment:
   - positive: ton enthousiaste, succès, célébration
   - neutral: informatif, factuel
   - negative: critique, problème, défi
5. Attribue un score de confiance (0-100):
   - 90-100: Très clair, mots-clés évidents
   - 70-89: Assez clair
   - 50-69: Ambigu, plusieurs catégories possibles
   - <50: Difficile à classifier

RETOURNE:
- category: la catégorie choisie
- sentiment: positive/neutral/negative
- confidence_score: 0-100
- keywords: liste des mots-clés identifiés (max 5)
- reasoning: brève explication de ton choix`,
  model: "gpt-5-nano-2025-08-07",
  outputType: ClassificationResultSchema
});

/**
 * Agent de recherche d'entreprises LinkedIn
 * Trouve des entreprises luxembourgeoises à tracker
 */
export const companyFinderAgent = new Agent({
  name: "Luxembourg Company Finder",
  instructions: `Tu recherches des entreprises luxembourgeoises sur LinkedIn.

STRATÉGIE:
1. Utilise search_engine avec une requête comme:
   "{secteur} company Luxembourg LinkedIn"
2. Extrais les URLs LinkedIn des entreprises trouvées
3. Filtre pour ne garder que les vraies pages entreprises LinkedIn
   (format: linkedin.com/company/xxx)

SECTEURS À EXPLORER:
- Finance, Banking, Insurance
- Technology, IT Services
- Professional Services, Consulting
- Industry, Manufacturing
- Retail, Commerce

Retourne une liste d'entreprises avec leur nom et URL LinkedIn.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP]
});
