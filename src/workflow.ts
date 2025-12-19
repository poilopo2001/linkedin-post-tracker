import { Runner, AgentInputItem, withTrace } from "@openai/agents";
import {
  companyFinderAgent,
  drhFinderAgent,
  enrichmentAgent
} from "./agents.js";
import type { Company, DRHContact, WorkflowOutput } from "./schemas.js";

export interface WorkflowConfig {
  // Critères de recherche
  targetIndustries?: string[];      // Secteurs cibles (vide = tous)
  minCompanySize?: number;          // Taille minimum employés
  maxCompanies?: number;            // Nombre max d'entreprises à traiter

  // Options d'enrichissement
  enrichContacts?: boolean;         // Activer l'enrichissement
  requireEmail?: boolean;           // Filtrer contacts sans email

  // Output
  exportFormat?: "csv" | "json";
  outputPath?: string;
}

const DEFAULT_CONFIG: WorkflowConfig = {
  targetIndustries: [],
  minCompanySize: 20,
  maxCompanies: 50,
  enrichContacts: true,
  requireEmail: false,
  exportFormat: "csv",
  outputPath: "./output"
};

/**
 * Workflow principal de collecte des DRH au Luxembourg
 */
export async function collectDRHLuxembourg(
  config: Partial<WorkflowConfig> = {}
): Promise<WorkflowOutput> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  return await withTrace("DRH Luxembourg Collection", async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "drh-collector",
        workflow_id: `drh-lux-${Date.now()}`
      }
    });

    const conversationHistory: AgentInputItem[] = [];
    const allContacts: DRHContact[] = [];

    console.log("=== PHASE 1: Recherche d'entreprises au Luxembourg ===");

    // Construire la requête de recherche
    const searchQuery = buildSearchQuery(finalConfig);
    conversationHistory.push({
      role: "user",
      content: [{
        type: "input_text",
        text: searchQuery
      }]
    });

    // Phase 1: Trouver les entreprises
    const companyResult = await runner.run(companyFinderAgent, conversationHistory);

    if (!companyResult.finalOutput) {
      throw new Error("Aucune entreprise trouvée");
    }

    conversationHistory.push(...companyResult.newItems.map(item => item.rawItem));
    const companies = companyResult.finalOutput.companies.slice(0, finalConfig.maxCompanies);

    console.log(`Trouvé ${companies.length} entreprises`);

    console.log("\n=== PHASE 2: Recherche des DRH ===");

    // Phase 2: Pour chaque entreprise, trouver le DRH
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      console.log(`[${i + 1}/${companies.length}] Recherche DRH pour: ${company.name}`);

      try {
        // Ne pas passer tout l'historique - ça dépasse le contexte
        const drhQuery: AgentInputItem[] = [{
          role: "user",
          content: [{
            type: "input_text",
            text: `Trouve le DRH ou responsable RH de cette entreprise:

Entreprise: ${company.name}
Secteur: ${company.industry}
Site web: ${company.website || "Non connu"}
LinkedIn: ${company.linkedin_url || "Non connu"}
Localisation: Luxembourg

Recherche le contact DRH principal avec email, LinkedIn et téléphone si possible.`
          }]
        }];

        const drhResult = await runner.run(drhFinderAgent, drhQuery);

        if (drhResult.finalOutput && drhResult.finalOutput.contacts.length > 0) {
          let contact = drhResult.finalOutput.contacts[0];

          // Nettoie tous les champs
          contact = {
            ...contact,
            email: cleanEmail(contact.email),
            phone: cleanField(contact.phone),
            mobile: cleanField(contact.mobile),
            email_pattern: cleanField(contact.email_pattern)
          };

          // Phase 3: Enrichissement si activé et pas d'email valide
          if (finalConfig.enrichContacts && !contact.email) {
            console.log(`  -> Enrichissement du contact...`);
            const enrichedContact = await enrichContact(runner, conversationHistory, contact);
            enrichedContact.email = cleanEmail(enrichedContact.email);
            allContacts.push(enrichedContact);
          } else {
            allContacts.push(contact);
          }

          console.log(`  -> Trouvé: ${contact.full_name} (${contact.job_title})`);
          if (contact.email) console.log(`     Email: ${contact.email}`);
          else console.log(`     Email: Non trouvé (pattern: ${contact.email_pattern || "inconnu"})`);
        }
      } catch (error) {
        console.error(`  -> Erreur pour ${company.name}:`, error);
      }

      // Pause pour éviter le rate limiting
      await sleep(1000);
    }

    console.log("\n=== PHASE 4: Compilation des résultats ===");

    // Utilise le fallback directement (plus fiable)
    return buildFallbackOutput(allContacts, companies.length, startTime);
  });
}

/**
 * Enrichit un contact avec données manquantes
 */
async function enrichContact(
  runner: Runner,
  _history: AgentInputItem[],
  contact: DRHContact
): Promise<DRHContact> {
  try {
    // Ne pas passer l'historique - contexte trop grand
    const enrichQuery: AgentInputItem[] = [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Trouve l'email professionnel de ce DRH:

Nom: ${contact.full_name}
Poste: ${contact.job_title}
Entreprise: ${contact.company.name}
Site: ${contact.company.website || "Non connu"}
LinkedIn: ${contact.linkedin_url || "Non connu"}

Cherche sur le site entreprise ou déduis le pattern email.`
      }]
    }];

    const enrichResult = await runner.run(enrichmentAgent, enrichQuery);

    if (enrichResult.finalOutput) {
      return {
        ...contact,
        email: enrichResult.finalOutput.contact.email || contact.email,
        email_pattern: enrichResult.finalOutput.contact.email_pattern || contact.email_pattern,
        phone: enrichResult.finalOutput.contact.phone || contact.phone,
        confidence_score: enrichResult.finalOutput.contact.confidence_score
      };
    }
  } catch (error) {
    console.error("Erreur enrichissement:", error);
  }

  return contact;
}

/**
 * Construit la requête de recherche d'entreprises
 */
function buildSearchQuery(config: WorkflowConfig): string {
  let query = `Trouve des entreprises au Luxembourg avec les critères suivants:

- Localisation: Luxembourg (siège ou filiale importante)
- Taille minimum: ${config.minCompanySize}+ employés
- Nombre maximum à retourner: ${config.maxCompanies}`;

  if (config.targetIndustries && config.targetIndustries.length > 0) {
    query += `\n- Secteurs cibles: ${config.targetIndustries.join(", ")}`;
  } else {
    query += `\n- Secteurs: tous (banque, finance, industrie, services, tech, etc.)`;
  }

  query += `

Utilise LinkedIn, les annuaires business luxembourgeois (Paperjam, Editus), et Google.
Priorise les entreprises avec une page LinkedIn (facilite la recherche DRH ensuite).`;

  return query;
}

/**
 * Construit un output de fallback si la compilation échoue
 */
function buildFallbackOutput(
  contacts: DRHContact[],
  companiesCount: number,
  startTime: number
): WorkflowOutput {
  const contactsWithEmail = contacts.filter(c => c.email);
  const contactsWithPhone = contacts.filter(c => c.phone || c.mobile);
  const avgConfidence = contacts.length > 0
    ? contacts.reduce((sum, c) => sum + c.confidence_score, 0) / contacts.length
    : 0;

  return {
    drh_contacts: contacts,
    statistics: {
      total_companies_found: companiesCount,
      total_contacts_found: contacts.length,
      contacts_with_email: contactsWithEmail.length,
      contacts_with_phone: contactsWithPhone.length,
      average_confidence_score: Math.round(avgConfidence),
      collection_duration_seconds: Math.round((Date.now() - startTime) / 1000)
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Valide et nettoie un email
 */
function cleanEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  // Supprime les préfixes parasites
  let cleaned = email.replace(/^[:\s]+/, "").trim();
  // Filtre les valeurs invalides
  const invalid = ["/", "-", "N/A", "n/a", "none", "null", "undefined", ""];
  if (invalid.includes(cleaned.toLowerCase())) return null;
  // Filtre si commence par / ou @ sans prénom
  if (cleaned.startsWith("/") || cleaned.startsWith("@")) return null;
  // Vérifie le format basique email
  if (!cleaned.includes("@") || !cleaned.includes(".")) return null;
  return cleaned;
}

/**
 * Nettoie une valeur de champ générique
 */
function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  let cleaned = value.replace(/^[:\s]+/, "").trim();
  const invalid = ["/", "-", "N/A", "n/a", "none", "null", "undefined", ""];
  if (invalid.includes(cleaned.toLowerCase())) return null;
  return cleaned;
}
