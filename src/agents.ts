import { hostedMcpTool, Agent } from "@openai/agents";
import {
  CompanyListSchema,
  DRHContactListSchema,
  EnrichedResultSchema,
  WorkflowOutputSchema
} from "./schemas.js";

// Configuration Bright Data MCP
const BRIGHTDATA_TOKEN = process.env.BRIGHTDATA_MCP_TOKEN || "9e9d94fca62095edf5584e5b4d7aad2df4789c057b8e376becdf87ddd11252dd";

const brightDataMCP = hostedMcpTool({
  serverLabel: "brightdata",
  serverUrl: `https://mcp.brightdata.com/sse?token=${BRIGHTDATA_TOKEN}&groups=social,business`,
  serverDescription: "Bright Data - LinkedIn et recherche web",
  authorization: BRIGHTDATA_TOKEN,
  allowedTools: [
    // Recherche web
    "search_engine",
    "scrape_as_markdown",

    // LinkedIn uniquement (essentiel pour DRH)
    "web_data_linkedin_person_profile",
    "web_data_linkedin_company_profile",
    "web_data_linkedin_people_search"
  ],
  requireApproval: "never"
});

/**
 * Agent 1: Recherche d'entreprises au Luxembourg
 * Trouve les entreprises luxembourgeoises avec département RH
 */
export const companyFinderAgent = new Agent({
  name: "Company Finder Luxembourg",
  instructions: `Trouve des entreprises au Luxembourg avec 20+ employés.

STRATÉGIE:
1. Utilise search_engine pour chercher "entreprises Luxembourg" ou "top companies Luxembourg"
2. Utilise web_data_linkedin_company_profile pour les pages LinkedIn trouvées
3. Extrais: nom, secteur, taille, site web, LinkedIn URL

Priorise les entreprises avec page LinkedIn.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: CompanyListSchema
});

/**
 * Agent 2: Recherche des DRH par entreprise
 * Trouve les contacts DRH/RH dans les entreprises identifiées
 */
export const drhFinderAgent = new Agent({
  name: "DRH Finder",
  instructions: `Trouve le DRH/responsable RH d'une entreprise.

TITRES CIBLES: DRH, HR Director, Head of HR, CHRO, Responsable RH

STRATÉGIE:
1. Utilise search_engine: "{entreprise} DRH LinkedIn" ou "{entreprise} HR Director"
2. Utilise web_data_linkedin_person_profile pour le profil trouvé
3. Si pas d'email direct, déduis le pattern (prenom.nom@domaine.lu)

Retourne: nom complet, poste, email (ou pattern), LinkedIn, téléphone si trouvé.
Score de confiance: 90+ si email trouvé, 70+ si pattern déduit, <70 si incomplet.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: DRHContactListSchema
});

/**
 * Agent 3: Enrichissement des contacts
 * Complète les données manquantes (emails, téléphones)
 */
export const enrichmentAgent = new Agent({
  name: "Contact Enricher",
  instructions: `Enrichis un contact DRH pour trouver son email.

STRATÉGIE:
1. Scrape le site entreprise (page contact, équipe) avec scrape_as_markdown
2. Cherche le nom dans les articles/communiqués via search_engine
3. Déduis le pattern email si non trouvé directement

PATTERNS EMAIL COURANTS: prenom.nom@, p.nom@, pnom@, prenom@

Score: 90+ email trouvé, 70-89 pattern déduit, <70 incomplet.`,
  model: "gpt-5-nano-2025-08-07",
  tools: [brightDataMCP],
  outputType: EnrichedResultSchema
});

/**
 * Agent 4: Compilation et export final
 * Compile tous les résultats et prépare l'export
 */
export const compilerAgent = new Agent({
  name: "Results Compiler",
  instructions: `Compile les contacts DRH et calcule les statistiques.

TÂCHES:
1. Dédoublonne les contacts
2. Calcule: total entreprises, contacts trouvés, avec email, avec téléphone, score moyen
3. Retourne la liste finale structurée`,
  model: "gpt-5-nano-2025-08-07",
  outputType: WorkflowOutputSchema
});
