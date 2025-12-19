#!/usr/bin/env tsx
/**
 * Script de collecte rapide - CLI simplifié
 *
 * Usage:
 *   npm run collect
 *   npm run collect -- --max=100 --sector=finance
 */

import "dotenv/config";
import { collectDRHLuxembourg, type WorkflowConfig } from "./workflow.js";
import { exportToCSV, exportToJSON, exportEmailsOnly } from "./export.js";

// Parser les arguments CLI
function parseArgs(): Partial<WorkflowConfig> & { emailsOnly?: boolean } {
  const args = process.argv.slice(2);
  const config: Partial<WorkflowConfig> & { emailsOnly?: boolean } = {};

  for (const arg of args) {
    if (arg.startsWith("--max=")) {
      config.maxCompanies = parseInt(arg.split("=")[1]);
    }
    if (arg.startsWith("--sector=")) {
      const sectors = arg.split("=")[1].split(",");
      config.targetIndustries = sectors;
    }
    if (arg.startsWith("--min-size=")) {
      config.minCompanySize = parseInt(arg.split("=")[1]);
    }
    if (arg === "--no-enrich") {
      config.enrichContacts = false;
    }
    if (arg === "--require-email") {
      config.requireEmail = true;
    }
    if (arg === "--json") {
      config.exportFormat = "json";
    }
    if (arg === "--emails-only") {
      config.emailsOnly = true;
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
Collecteur DRH Luxembourg - Options CLI

Usage:
  npm run collect [options]

Options:
  --max=N              Nombre max d'entreprises à analyser (défaut: 50)
  --sector=SECTEUR     Secteur(s) cible(s), séparés par virgule
                       Ex: --sector=finance,tech,industrie
  --min-size=N         Taille minimum d'entreprise en employés (défaut: 20)
  --no-enrich          Désactiver l'enrichissement des contacts
  --require-email      Ne garder que les contacts avec email trouvé
  --json               Exporter en JSON au lieu de CSV
  --emails-only        Exporter uniquement la liste des emails
  -h, --help           Afficher cette aide

Exemples:
  npm run collect -- --max=100 --sector=finance
  npm run collect -- --sector=tech,startup --require-email
  npm run collect -- --max=200 --emails-only
`);
}

async function main() {
  const cliConfig = parseArgs();
  const { emailsOnly, ...workflowConfig } = cliConfig;

  console.log("🔍 Démarrage de la collecte DRH Luxembourg...\n");

  try {
    const result = await collectDRHLuxembourg(workflowConfig);

    // Export
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
    const outputDir = "./output";

    if (emailsOnly) {
      const path = await exportEmailsOnly(
        result.drh_contacts,
        `${outputDir}/emails_drh_${timestamp}.csv`
      );
      console.log(`\n✅ Emails exportés: ${path}`);
    } else if (workflowConfig.exportFormat === "json") {
      const path = await exportToJSON(result, `${outputDir}/drh_luxembourg_${timestamp}.json`);
      console.log(`\n✅ JSON exporté: ${path}`);
    } else {
      const path = await exportToCSV(
        result.drh_contacts,
        `${outputDir}/drh_luxembourg_${timestamp}.csv`
      );
      console.log(`\n✅ CSV exporté: ${path}`);
    }

    // Résumé
    console.log("\n📊 Résumé:");
    console.log(`   Contacts trouvés: ${result.statistics.total_contacts_found}`);
    console.log(`   Avec email: ${result.statistics.contacts_with_email}`);
    console.log(`   Score moyen: ${result.statistics.average_confidence_score}%`);

  } catch (error) {
    console.error("\n❌ Erreur:", error);
    process.exit(1);
  }
}

main();
