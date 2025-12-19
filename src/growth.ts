#!/usr/bin/env tsx
/**
 * Growth Signals - Marketing Jobs Collector
 *
 * Trouve les entreprises qui recrutent en marketing = signal de croissance
 *
 * Usage:
 *   npm run growth
 *   npm run growth -- --location=Luxembourg --max=50
 */

import "dotenv/config";
import { findGrowthSignals, type GrowthConfig } from "./workflow-growth.js";
import { exportGrowthToCSV, exportGrowthToJSON } from "./export-growth.js";

function parseArgs(): Partial<GrowthConfig> {
  const args = process.argv.slice(2);
  const config: Partial<GrowthConfig> = {};

  for (const arg of args) {
    if (arg.startsWith("--location=")) {
      config.location = arg.split("=")[1];
    }
    if (arg.startsWith("--max=")) {
      config.maxJobs = parseInt(arg.split("=")[1]);
    }
    if (arg.startsWith("--keywords=")) {
      config.jobKeywords = arg.split("=")[1].split(",");
    }
    if (arg === "--no-dm") {
      config.findDecisionMaker = false;
    }
    if (arg === "--json") {
      config.exportFormat = "json";
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Growth Signals - Marketing Jobs Collector

Trouve les entreprises qui recrutent en marketing (signal de croissance fort).

Usage:
  npm run growth [options]

Options:
  --location=PAYS      Pays/région cible (défaut: France)
  --max=N              Nombre max d'offres à analyser (défaut: 20)
  --keywords=A,B,C     Postes à chercher (défaut: Marketing Manager, CMO, etc.)
  --no-dm              Ne pas chercher le décideur
  --json               Export JSON au lieu de CSV
  -h, --help           Afficher cette aide

Exemples:
  npm run growth -- --location=Luxembourg --max=30
  npm run growth -- --location=Belgium --keywords="Growth Manager,CMO"
  npm run growth -- --location=France --json

Scoring:
  Le score de croissance (0-100) est basé sur:
  - Nombre d'offres marketing actives
  - Niveau de séniorité des postes
  - Présence de postes "growth/performance"
`);
}

async function main() {
  const config = parseArgs();

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   GROWTH SIGNALS - Marketing Jobs Collector               ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  if (!process.env.OPENAI_API_KEY) {
    console.error("Erreur: OPENAI_API_KEY non définie");
    process.exit(1);
  }

  if (!process.env.BRIGHTDATA_MCP_TOKEN) {
    console.error("Erreur: BRIGHTDATA_MCP_TOKEN non définie");
    process.exit(1);
  }

  const finalConfig: GrowthConfig = {
    location: config.location || "France",
    jobKeywords: config.jobKeywords || [
      "Marketing Manager",
      "Head of Marketing",
      "CMO",
      "VP Marketing",
      "Growth Manager",
      "Digital Marketing Director"
    ],
    maxJobs: config.maxJobs || 20,
    findDecisionMaker: config.findDecisionMaker !== false,
    exportFormat: config.exportFormat || "csv",
    outputPath: "./output"
  };

  console.log("Configuration:");
  console.log(`  Location: ${finalConfig.location}`);
  console.log(`  Max jobs: ${finalConfig.maxJobs}`);
  console.log(`  Keywords: ${finalConfig.jobKeywords?.slice(0, 3).join(", ")}...`);
  console.log(`  Find decision maker: ${finalConfig.findDecisionMaker}`);
  console.log("");

  try {
    const result = await findGrowthSignals(finalConfig);

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                      RÉSULTATS                            ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    console.log("Statistiques:");
    console.log(`  Offres analysées: ${result.statistics.total_jobs_found}`);
    console.log(`  Entreprises uniques: ${result.statistics.unique_companies}`);
    console.log(`  Avec décideur identifié: ${result.statistics.leads_with_decision_maker}`);
    console.log(`  Avec email: ${result.statistics.leads_with_email}`);
    console.log(`  Score croissance moyen: ${result.statistics.average_growth_score}%`);
    console.log(`  Durée: ${result.statistics.collection_duration_seconds}s`);

    if (result.leads.length > 0) {
      const timestamp = new Date().toISOString().split("T")[0];
      const location = finalConfig.location.toLowerCase().replace(/\s+/g, "-");
      const filename = `growth_signals_${location}_${timestamp}`;

      if (finalConfig.exportFormat === "json") {
        const path = await exportGrowthToJSON(result, `${finalConfig.outputPath}/${filename}.json`);
        console.log(`\nExporté: ${path}`);
      } else {
        const path = await exportGrowthToCSV(result.leads, `${finalConfig.outputPath}/${filename}.csv`);
        console.log(`\nExporté: ${path}`);
      }

      // Top 5 leads
      console.log("\n--- TOP 5 Leads (par score de croissance) ---");
      result.leads.slice(0, 5).forEach((lead, i) => {
        console.log(`\n${i + 1}. ${lead.name} (Score: ${lead.growth_score}%)`);
        console.log(`   Postes marketing: ${lead.marketing_jobs_count}`);
        console.log(`   Jobs: ${lead.job_titles.slice(0, 2).join(", ")}`);
        if (lead.decision_maker) {
          console.log(`   Décideur: ${lead.decision_maker.full_name} (${lead.decision_maker.job_title})`);
          console.log(`   Email: ${lead.decision_maker.email || lead.decision_maker.email_pattern || "Non trouvé"}`);
        }
      });
    } else {
      console.log("\nAucun lead trouvé.");
    }

  } catch (error) {
    console.error("\nErreur:", error);
    process.exit(1);
  }
}

main();
