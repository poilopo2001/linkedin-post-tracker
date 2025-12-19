import { createObjectCsvWriter } from "csv-writer";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { DRHContact, WorkflowOutput } from "./schemas.js";

/**
 * Exporte les contacts DRH vers un fichier CSV
 */
export async function exportToCSV(
  contacts: DRHContact[],
  filepath: string
): Promise<string> {
  // Créer le dossier si nécessaire
  await mkdir(dirname(filepath), { recursive: true });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: "full_name", title: "Nom Complet" },
      { id: "first_name", title: "Prénom" },
      { id: "last_name", title: "Nom" },
      { id: "job_title", title: "Poste" },
      { id: "email", title: "Email" },
      { id: "email_pattern", title: "Pattern Email (si non trouvé)" },
      { id: "phone", title: "Téléphone" },
      { id: "mobile", title: "Mobile" },
      { id: "linkedin_url", title: "LinkedIn" },
      { id: "company_name", title: "Entreprise" },
      { id: "company_industry", title: "Secteur" },
      { id: "company_size", title: "Taille" },
      { id: "company_website", title: "Site Web" },
      { id: "company_linkedin", title: "LinkedIn Entreprise" },
      { id: "company_address", title: "Adresse" },
      { id: "company_city", title: "Ville" },
      { id: "confidence_score", title: "Score Confiance" },
      { id: "source", title: "Source" },
      { id: "collected_at", title: "Date Collecte" }
    ],
    encoding: "utf8"
  });

  // Transformer les données pour le CSV (aplatir l'objet company)
  const flattenedData = contacts.map(contact => ({
    full_name: contact.full_name,
    first_name: contact.first_name,
    last_name: contact.last_name,
    job_title: contact.job_title,
    email: contact.email || "",
    email_pattern: contact.email_pattern || "",
    phone: contact.phone || "",
    mobile: contact.mobile || "",
    linkedin_url: contact.linkedin_url || "",
    company_name: contact.company.name,
    company_industry: contact.company.industry,
    company_size: contact.company.size,
    company_website: contact.company.website || "",
    company_linkedin: contact.company.linkedin_url || "",
    company_address: contact.company.address || "",
    company_city: contact.company.city || "",
    confidence_score: contact.confidence_score,
    source: contact.source,
    collected_at: contact.collected_at
  }));

  await csvWriter.writeRecords(flattenedData);

  return filepath;
}

/**
 * Exporte le résultat complet vers un fichier JSON
 */
export async function exportToJSON(
  result: WorkflowOutput,
  filepath: string
): Promise<string> {
  // Créer le dossier si nécessaire
  await mkdir(dirname(filepath), { recursive: true });

  const jsonContent = JSON.stringify(result, null, 2);
  await writeFile(filepath, jsonContent, "utf-8");

  return filepath;
}

/**
 * Exporte uniquement les emails pour import dans un outil externe
 */
export async function exportEmailsOnly(
  contacts: DRHContact[],
  filepath: string
): Promise<string> {
  await mkdir(dirname(filepath), { recursive: true });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: "email", title: "Email" },
      { id: "full_name", title: "Nom" },
      { id: "company", title: "Entreprise" }
    ],
    encoding: "utf8"
  });

  const emailData = contacts
    .filter(c => c.email)
    .map(c => ({
      email: c.email,
      full_name: c.full_name,
      company: c.company.name
    }));

  await csvWriter.writeRecords(emailData);

  return filepath;
}
