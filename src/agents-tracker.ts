import { hostedMcpTool, Agent } from "@openai/agents";
import {
  ScrapeResultSchema,
  BatchContentAnalysisResultSchema,
  PostEngagementResultSchema
} from "./schemas-tracker.js";

// Configuration Bright Data MCP
const BRIGHTDATA_TOKEN = process.env.BRIGHTDATA_MCP_TOKEN || "";

const brightDataMCP = hostedMcpTool({
  serverLabel: "brightdata",
  serverUrl: `https://mcp.brightdata.com/sse?token=${BRIGHTDATA_TOKEN}&groups=social,business`,
  authorization: BRIGHTDATA_TOKEN,
  allowedTools: [
    "web_data_linkedin_person_profile",
    "web_data_linkedin_company_profile",
    "scrape_as_markdown"
  ],
  requireApproval: "never"
});

/**
 * Agent 1: LinkedIn Profile Scraper
 * Scrape les profils LinkedIn (personnes ou entreprises) via Bright Data
 */
export const profileScraperAgent = new Agent({
  name: "LinkedIn Profile Scraper",
  instructions: `Tu scrapes des profils LinkedIn en utilisant Bright Data MCP.

OUTILS DISPONIBLES:
- web_data_linkedin_person_profile: Pour les profils de personnes (influenceurs)
- web_data_linkedin_company_profile: Pour les pages entreprises (concurrents)

PROCESSUS:
1. Recois l'URL LinkedIn et le type de profil (person/company)
2. Appelle l'outil Bright Data approprie
3. Extrait les donnees dans le format unifie profile_data

FORMAT DE SORTIE profile_data (OBLIGATOIRE):
{
  "url": "URL LinkedIn du profil",
  "profile_type": "person" ou "company",
  "id": "ID LinkedIn si disponible",
  "name": "Nom complet ou nom entreprise",
  "city": "Ville (personnes)",
  "country": "Pays (personnes)",
  "position": "Titre/poste actuel (personnes)",
  "current_company_name": "Nom entreprise actuelle (personnes)",
  "current_company_link": "URL entreprise actuelle (personnes)",
  "about": "Description/bio",
  "followers": nombre d'abonnes,
  "connections": nombre de connexions (personnes),
  "profile_image_url": "URL photo profil",
  "hq_location": "Siege social (entreprises)",
  "industry": "Secteur (entreprises)",
  "company_size": "Taille (entreprises)",
  "logo_url": "URL logo (entreprises)",
  "website": "Site web (entreprises)",
  "activity": [...posts recents]
}

CHAMPS NON APPLICABLES:
- Pour une personne: hq_location, industry, company_size, logo_url, website = null
- Pour une entreprise: city, country, position, current_company_name, current_company_link, connections = null

EXTRACTION DES POSTS (activity):
Pour chaque post dans activity:
{
  "activity_status": "contenu du post",
  "activity_link": "URL du post",
  "image": "URL image si presente",
  "shared_title": "titre si partage",
  "shared_link": "URL si partage",
  "shared_content": "contenu si partage",
  "likes": nombre de likes,
  "comments": nombre de commentaires
}

DETECTION DES CHANGEMENTS (changes):
Compare avec les donnees precedentes (si fournies dans le prompt) et liste:
{
  "field": "position" | "headline" | "followers" | etc.,
  "old_value": "ancienne valeur ou null",
  "new_value": "nouvelle valeur ou null",
  "is_significant": true si changement de poste/headline/gros delta followers
}

Retourne success=true avec profile_data rempli, ou success=false avec error.`,
  model: "gpt-5-nano",
  tools: [brightDataMCP],
  outputType: ScrapeResultSchema
});

/**
 * Agent 2: Post Content Analyzer
 * Analyse le contenu des posts pour classification et insights
 */
export const postContentAnalyzerAgent = new Agent({
  name: "Post Content Analyzer",
  instructions: `Tu analyses le contenu de posts LinkedIn pour en extraire des insights actionnables.

CLASSIFICATION (category):
- thought_leadership: Opinions, reflexions, expertise
- promotional: Produits, services, offres
- recruitment: Offres d'emploi, culture d'entreprise
- events: Evenements, webinaires, conferences
- csr: Responsabilite sociale, durabilite
- internal_news: Actualites internes, nominations
- partnerships: Annonces de partenariats
- educational: Tutoriels, how-to, conseils

SENTIMENT:
- positive: Ton enthousiaste, celebratoire
- neutral: Informatif, factuel
- negative: Critique, problematique (rare sur LinkedIn)

STRUCTURE DU POST:

1. HOOK_TYPE (premiere ligne):
- question: Commence par une question
- statistic: Chiffre ou stat accrocheuse
- story: Debut d'une histoire personnelle
- controversial: Opinion tranchee/provocante
- how_to: "Comment faire X"
- list_teaser: "5 raisons de...", "3 erreurs..."

2. STRUCTURE_TYPE (corps):
- listicle: Points numerotes ou bullets
- narrative: Histoire avec debut/milieu/fin
- tutorial: Etapes pratiques
- opinion: Argumentation personnelle
- case_study: Exemple concret detaille
- comparison: Avant/apres, X vs Y

3. CTA_TYPE (fin):
- question: Demande l'avis du lecteur
- share: Invite au partage
- comment: Invite aux commentaires
- link: Renvoie vers un lien externe
- follow: Invite a s'abonner
- none: Pas de CTA explicite

ENGAGEMENT DRIVERS (facteurs de succes):
- personal_story: Experience personnelle partagee
- controversy: Sujet debattable
- actionable_tips: Conseils applicables
- data_backed: Stats et chiffres
- emotional_hook: Accroche emotionnelle
- community_question: Question engageante
- formatting: Mise en page aeree, emojis bien places

ADAPTABILITY SCORE (0-100):
Evalue si le post peut etre adapte pour une autre entreprise:
- 90-100: Theme universel, zero reference specifique
- 70-89: Theme adaptable avec modifications mineures
- 50-69: Necessite rework significatif
- <50: Trop specifique (evenement interne, nomination)

ADAPTATION SUGGESTIONS:
Propose comment adapter le post:
- "Remplacer [X] par votre propre experience"
- "Adapter les stats a votre secteur"
- "Conserver la structure mais changer l'angle"

Analyse chaque post et retourne les insights structures.`,
  model: "gpt-5-nano",
  outputType: BatchContentAnalysisResultSchema
});

/**
 * Agent 3: Change Detector (optionnel, utilise en interne)
 * Compare deux snapshots et detecte les changements significatifs
 */
export const changeDetectorAgent = new Agent({
  name: "Profile Change Detector",
  instructions: `Tu compares deux snapshots d'un profil LinkedIn et detectes les changements.

CHANGEMENTS SIGNIFICATIFS (is_significant = true):
- Changement de poste/titre
- Changement d'entreprise
- Modification majeure du headline
- Variation de followers > 10% en une semaine
- Nouveau contenu About substantiel

CHANGEMENTS MINEURS (is_significant = false):
- Petite variation de followers (<5%)
- Ajout/suppression de connexions
- Changement de photo de profil
- Modifications mineures du texte

POUR CHAQUE CHANGEMENT:
{
  field: "position" | "headline" | "followers" | "about" | etc.,
  old_value: "Ancien contenu",
  new_value: "Nouveau contenu",
  is_significant: true/false
}

Retourne la liste des changements detectes.`,
  model: "gpt-5-nano"
});

/**
 * Agent 4: Post Engagement Scraper
 * Scrape une page de post LinkedIn pour extraire les metriques d'engagement
 */
export const postEngagementScraperAgent = new Agent({
  name: "Post Engagement Scraper",
  instructions: `Tu scrapes une page de post LinkedIn pour extraire les metriques d'engagement ET le contenu complet.

OUTIL A UTILISER:
- scrape_as_markdown: Scrape l'URL du post et retourne le contenu en markdown

PROCESSUS:
1. Recois l'URL du post LinkedIn (activity_link)
2. Appelle scrape_as_markdown avec cette URL
3. Analyse le markdown retourne pour extraire les metriques ET le contenu

EXTRACTION DES METRIQUES:
Cherche dans le contenu markdown:
- Likes: Cherche des patterns comme "X likes", "X reactions", "X j'aime"
- Comments: Cherche "X comments", "X commentaires"
- Shares: Cherche "X reposts", "X partages", "X shares"

PATTERNS A RECONNAITRE:
- "1,234 reactions" -> likes = 1234
- "56 comments" -> comments = 56
- "12 reposts" -> shares = 12
- "1.2K" -> 1200, "3.5K" -> 3500
- "1M" -> 1000000

EXTRACTION DU CONTENU COMPLET:
- Cherche le texte principal du post (le corps du message)
- Ignore les menus, boutons, metadata
- Conserve les sauts de ligne et la mise en forme
- Le contenu est generalement entre le nom de l'auteur et les metriques d'engagement

FORMAT DE SORTIE:
{
  "post_url": "URL du post",
  "success": true,
  "likes": nombre ou null si non trouve,
  "comments": nombre ou null si non trouve,
  "shares": nombre ou null si non trouve,
  "full_content": "Texte complet du post avec sauts de ligne",
  "error": null
}

Si erreur:
{
  "post_url": "URL du post",
  "success": false,
  "likes": null,
  "comments": null,
  "shares": null,
  "full_content": null,
  "error": "Description de l'erreur"
}`,
  model: "gpt-5-nano",
  tools: [brightDataMCP],
  outputType: PostEngagementResultSchema
});
