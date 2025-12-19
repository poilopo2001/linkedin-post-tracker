import "dotenv/config";
import { collectDRHLuxembourg, type WorkflowConfig } from "./workflow.js";
import { exportToCSV, exportToJSON } from "./export.js";

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║     COLLECTEUR DRH LUXEMBOURG - Bright Data + OpenAI      ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Vérification des clés API
  if (!process.env.OPENAI_API_KEY) {
    console.error("Erreur: OPENAI_API_KEY non définie dans .env");
    process.exit(1);
  }

  if (!process.env.BRIGHTDATA_MCP_TOKEN) {
    console.error("Erreur: BRIGHTDATA_MCP_TOKEN non définie dans .env");
    process.exit(1);
  }

  // Configuration de la collecte
  const config: WorkflowConfig = {
    // Paramètres de recherche
    targetIndustries: [],                     // Vide = tous les secteurs
    minCompanySize: 20,                       // 20+ employés
    maxCompanies: parseInt(process.env.MAX_COMPANIES || "50"),

    // Enrichissement
    enrichContacts: true,                     // Activer l'enrichissement email
    requireEmail: false,                      // Garder contacts sans email

    // Export
    exportFormat: (process.env.OUTPUT_FORMAT as "csv" | "json") || "csv",
    outputPath: "./output"
  };

  console.log("Configuration:");
  console.log(`  - Entreprises max: ${config.maxCompanies}`);
  console.log(`  - Taille min: ${config.minCompanySize}+ employés`);
  console.log(`  - Secteurs: ${config.targetIndustries?.length ? config.targetIndustries.join(", ") : "Tous"}`);
  console.log(`  - Enrichissement: ${config.enrichContacts ? "Oui" : "Non"}`);
  console.log(`  - Format export: ${config.exportFormat?.toUpperCase()}`);
  console.log("");

  try {
    // Lancer la collecte
    const result = await collectDRHLuxembourg(config);

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                      RÉSULTATS                            ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    console.log("Statistiques:");
    console.log(`  - Entreprises analysées: ${result.statistics.total_companies_found}`);
    console.log(`  - Contacts DRH trouvés: ${result.statistics.total_contacts_found}`);
    console.log(`  - Avec email: ${result.statistics.contacts_with_email}`);
    console.log(`  - Avec téléphone: ${result.statistics.contacts_with_phone}`);
    console.log(`  - Score confiance moyen: ${result.statistics.average_confidence_score}%`);
    console.log(`  - Durée: ${result.statistics.collection_duration_seconds}s`);

    // Export des données
    if (result.drh_contacts.length > 0) {
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `drh_luxembourg_${timestamp}`;

      if (config.exportFormat === "csv") {
        const csvPath = await exportToCSV(result.drh_contacts, `${config.outputPath}/${filename}.csv`);
        console.log(`\nExporté vers: ${csvPath}`);
      } else {
        const jsonPath = await exportToJSON(result, `${config.outputPath}/${filename}.json`);
        console.log(`\nExporté vers: ${jsonPath}`);
      }

      // Aperçu des premiers contacts
      console.log("\n--- Aperçu des 5 premiers contacts ---");
      result.drh_contacts.slice(0, 5).forEach((contact, i) => {
        console.log(`\n${i + 1}. ${contact.full_name}`);
        console.log(`   Poste: ${contact.job_title}`);
        console.log(`   Entreprise: ${contact.company.name}`);
        console.log(`   Email: ${contact.email || contact.email_pattern || "Non trouvé"}`);
        console.log(`   LinkedIn: ${contact.linkedin_url || "Non trouvé"}`);
      });
    } else {
      console.log("\nAucun contact trouvé.");
    }

  } catch (error) {
    console.error("\nErreur lors de la collecte:", error);
    process.exit(1);
  }
}

main();
