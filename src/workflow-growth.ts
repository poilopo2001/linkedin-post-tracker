import { Runner, AgentInputItem, withTrace } from "@openai/agents";
import {
  jobSearchAgent,
  companyEnricherAgent,
  decisionMakerAgent
} from "./agents-growth.js";
import type { GrowthCompany, GrowthLeadsOutput, JobListing } from "./schemas-growth.js";
import { log, clearLog } from "./logger.js";

export interface GrowthConfig {
  // Critères de recherche
  location: string;              // Pays/ville cible
  jobKeywords?: string[];        // Mots-clés postes (défaut: marketing)
  maxJobs?: number;              // Nombre max d'offres à traiter

  // Filtres
  minCompanySize?: string;       // Taille min (startup, PME, ETI, GE)
  industries?: string[];         // Secteurs cibles

  // Options
  findDecisionMaker?: boolean;   // Chercher le décideur
  enrichCompany?: boolean;       // Enrichir les données entreprise

  // Export
  exportFormat?: "csv" | "json";
  outputPath?: string;
}

const DEFAULT_CONFIG: GrowthConfig = {
  location: "France",
  jobKeywords: ["Marketing Manager", "Head of Marketing", "CMO", "VP Marketing", "Growth Manager"],
  maxJobs: 20,
  findDecisionMaker: true,
  enrichCompany: true,
  exportFormat: "csv",
  outputPath: "./output"
};

/**
 * Workflow principal - Growth Signals Marketing
 */
export async function findGrowthSignals(
  config: Partial<GrowthConfig> = {}
): Promise<GrowthLeadsOutput> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const startTime = Date.now();

  return await withTrace("Growth Signals - Marketing Jobs", async () => {
    clearLog();

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "growth-signals",
        workflow_id: `growth-${Date.now()}`
      }
    });

    const leads: GrowthCompany[] = [];
    const companiesMap = new Map<string, { jobs: JobListing[], company: Partial<GrowthCompany> }>();

    log("=== PHASE 1: Recherche d'offres marketing ===");
    log(`Location: ${finalConfig.location}`);
    log(`Keywords: ${finalConfig.jobKeywords?.join(", ")}`);

    // Phase 1: Chercher les offres d'emploi
    const jobSearchQuery: AgentInputItem[] = [{
      role: "user",
      content: [{
        type: "input_text",
        text: `Trouve des offres d'emploi marketing à ${finalConfig.location}.

Postes recherchés: ${finalConfig.jobKeywords?.join(", ")}

Trouve ${finalConfig.maxJobs} offres maximum.
Pour chaque offre, extrais le nom de l'entreprise et son URL LinkedIn si possible.`
      }]
    }];

    const jobsResult = await runner.run(jobSearchAgent, jobSearchQuery);

    if (!jobsResult.finalOutput || jobsResult.finalOutput.jobs.length === 0) {
      log("Aucune offre trouvée");
      return buildEmptyOutput(finalConfig, startTime);
    }

    const jobs = jobsResult.finalOutput.jobs.slice(0, finalConfig.maxJobs);
    log(`Trouvé ${jobs.length} offres`);

    // Grouper par entreprise
    for (const job of jobs) {
      const key = job.company_name.toLowerCase().trim();
      if (!companiesMap.has(key)) {
        companiesMap.set(key, {
          jobs: [],
          company: {
            name: job.company_name,
            linkedin_url: job.company_linkedin,
            website: job.company_website,
            location: job.location,
            industry: "",
            size: null,
            marketing_jobs_count: 0,
            job_titles: [],
            growth_score: 0,
            decision_maker: null
          }
        });
      }
      const entry = companiesMap.get(key)!;
      entry.jobs.push(job);
      entry.company.job_titles?.push(job.job_title);
    }

    log(`${companiesMap.size} entreprises uniques identifiées`);

    log("=== PHASE 2: Analyse des entreprises ===");

    let processed = 0;
    for (const [key, entry] of companiesMap) {
      processed++;
      const { jobs: companyJobs, company } = entry;

      log(`[${processed}/${companiesMap.size}] ${company.name} (${companyJobs.length} postes marketing)`);

      try {
        // Calculer le score de croissance
        const growthScore = calculateGrowthScore(companyJobs);
        company.marketing_jobs_count = companyJobs.length;
        company.growth_score = growthScore;

        // Phase 2b: Trouver le décideur marketing
        if (finalConfig.findDecisionMaker) {
          log(`  -> Recherche du décideur marketing...`);

          const dmQuery: AgentInputItem[] = [{
            role: "user",
            content: [{
              type: "input_text",
              text: `Trouve le décideur marketing de ${company.name}.
${company.linkedin_url ? `LinkedIn: ${company.linkedin_url}` : ""}
${company.website ? `Site: ${company.website}` : ""}

Cherche: CMO, VP Marketing, Head of Marketing, ou Marketing Director.
Trouve son email ou déduis le pattern.`
            }]
          }];

          const dmResult = await runner.run(decisionMakerAgent, dmQuery);

          if (dmResult.finalOutput) {
            company.decision_maker = {
              full_name: dmResult.finalOutput.full_name,
              job_title: dmResult.finalOutput.job_title,
              email: cleanEmail(dmResult.finalOutput.email),
              email_pattern: dmResult.finalOutput.email_pattern,
              linkedin_url: dmResult.finalOutput.linkedin_url,
              phone: cleanField(dmResult.finalOutput.phone)
            };

            log(`  -> Décideur: ${dmResult.finalOutput.full_name} (${dmResult.finalOutput.job_title})`);
            if (company.decision_maker.email) {
              log(`     Email: ${company.decision_maker.email}`);
            }
          }
        }

        leads.push(company as GrowthCompany);

      } catch (error) {
        log(`  -> Erreur: ${error}`);
        // Ajouter quand même avec les données de base
        leads.push({
          ...company,
          industry: company.industry || "Unknown",
          marketing_jobs_count: companyJobs.length,
          growth_score: calculateGrowthScore(companyJobs),
          job_titles: companyJobs.map(j => j.job_title)
        } as GrowthCompany);
      }

      await sleep(1500); // Rate limiting
    }

    log("=== PHASE 3: Compilation des résultats ===");

    return buildOutput(leads, jobs.length, finalConfig, startTime);
  });
}

/**
 * Calcule un score de croissance basé sur les offres
 */
function calculateGrowthScore(jobs: JobListing[]): number {
  let score = 0;

  // Plus d'offres = plus de croissance
  score += Math.min(jobs.length * 15, 45);

  // Postes seniors = plus de budget
  const seniorKeywords = ["head", "director", "vp", "chief", "cmo", "lead"];
  const hasSeniorRole = jobs.some(j =>
    seniorKeywords.some(k => j.job_title.toLowerCase().includes(k))
  );
  if (hasSeniorRole) score += 25;

  // Postes growth/performance = startup en scale
  const growthKeywords = ["growth", "performance", "demand", "acquisition"];
  const hasGrowthRole = jobs.some(j =>
    growthKeywords.some(k => j.job_title.toLowerCase().includes(k))
  );
  if (hasGrowthRole) score += 20;

  // Diversité des postes
  if (jobs.length >= 3) score += 10;

  return Math.min(score, 100);
}

function buildOutput(
  leads: GrowthCompany[],
  totalJobs: number,
  config: GrowthConfig,
  startTime: number
): GrowthLeadsOutput {
  const withDM = leads.filter(l => l.decision_maker);
  const withEmail = leads.filter(l => l.decision_maker?.email);
  const avgScore = leads.length > 0
    ? leads.reduce((sum, l) => sum + l.growth_score, 0) / leads.length
    : 0;

  // Trier par score de croissance
  leads.sort((a, b) => b.growth_score - a.growth_score);

  return {
    leads,
    statistics: {
      total_jobs_found: totalJobs,
      unique_companies: leads.length,
      leads_with_decision_maker: withDM.length,
      leads_with_email: withEmail.length,
      average_growth_score: Math.round(avgScore),
      collection_duration_seconds: Math.round((Date.now() - startTime) / 1000)
    },
    search_criteria: {
      job_keywords: config.jobKeywords || [],
      location: config.location,
      date_range: "last 30 days"
    }
  };
}

function buildEmptyOutput(config: GrowthConfig, startTime: number): GrowthLeadsOutput {
  return {
    leads: [],
    statistics: {
      total_jobs_found: 0,
      unique_companies: 0,
      leads_with_decision_maker: 0,
      leads_with_email: 0,
      average_growth_score: 0,
      collection_duration_seconds: Math.round((Date.now() - startTime) / 1000)
    },
    search_criteria: {
      job_keywords: config.jobKeywords || [],
      location: config.location,
      date_range: "last 30 days"
    }
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  let cleaned = email.replace(/^[:\s]+/, "").trim();
  const invalid = ["/", "-", "N/A", "n/a", "none", "null", "undefined", ""];
  if (invalid.includes(cleaned.toLowerCase())) return null;
  if (cleaned.startsWith("/") || cleaned.startsWith("@")) return null;
  if (!cleaned.includes("@") || !cleaned.includes(".")) return null;
  return cleaned;
}

function cleanField(value: string | null | undefined): string | null {
  if (!value) return null;
  let cleaned = value.replace(/^[:\s]+/, "").trim();
  const invalid = ["/", "-", "N/A", "n/a", "none", "null", "undefined", ""];
  if (invalid.includes(cleaned.toLowerCase())) return null;
  return cleaned;
}
