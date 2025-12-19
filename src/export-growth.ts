import { createObjectCsvWriter } from "csv-writer";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { GrowthCompany, GrowthLeadsOutput } from "./schemas-growth.js";

/**
 * Exporte les leads growth vers CSV
 */
export async function exportGrowthToCSV(
  leads: GrowthCompany[],
  filepath: string
): Promise<string> {
  await mkdir(dirname(filepath), { recursive: true });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: "name", title: "Entreprise" },
      { id: "industry", title: "Secteur" },
      { id: "size", title: "Taille" },
      { id: "location", title: "Localisation" },
      { id: "website", title: "Site Web" },
      { id: "linkedin_url", title: "LinkedIn Entreprise" },
      { id: "growth_score", title: "Score Croissance" },
      { id: "marketing_jobs_count", title: "Nb Postes Marketing" },
      { id: "job_titles", title: "Postes Recherchés" },
      { id: "dm_name", title: "Décideur" },
      { id: "dm_title", title: "Poste Décideur" },
      { id: "dm_email", title: "Email" },
      { id: "dm_email_pattern", title: "Pattern Email" },
      { id: "dm_linkedin", title: "LinkedIn Décideur" },
      { id: "dm_phone", title: "Téléphone" }
    ],
    encoding: "utf8"
  });

  const flattenedData = leads.map(lead => ({
    name: lead.name,
    industry: lead.industry,
    size: lead.size || "",
    location: lead.location,
    website: lead.website || "",
    linkedin_url: lead.linkedin_url || "",
    growth_score: lead.growth_score,
    marketing_jobs_count: lead.marketing_jobs_count,
    job_titles: lead.job_titles.join(" | "),
    dm_name: lead.decision_maker?.full_name || "",
    dm_title: lead.decision_maker?.job_title || "",
    dm_email: lead.decision_maker?.email || "",
    dm_email_pattern: lead.decision_maker?.email_pattern || "",
    dm_linkedin: lead.decision_maker?.linkedin_url || "",
    dm_phone: lead.decision_maker?.phone || ""
  }));

  await csvWriter.writeRecords(flattenedData);
  return filepath;
}

/**
 * Exporte le résultat complet en JSON
 */
export async function exportGrowthToJSON(
  result: GrowthLeadsOutput,
  filepath: string
): Promise<string> {
  await mkdir(dirname(filepath), { recursive: true });
  await writeFile(filepath, JSON.stringify(result, null, 2), "utf-8");
  return filepath;
}

/**
 * Exporte uniquement les emails pour prospection
 */
export async function exportGrowthEmails(
  leads: GrowthCompany[],
  filepath: string
): Promise<string> {
  await mkdir(dirname(filepath), { recursive: true });

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: [
      { id: "email", title: "Email" },
      { id: "name", title: "Nom" },
      { id: "title", title: "Poste" },
      { id: "company", title: "Entreprise" },
      { id: "growth_score", title: "Score" }
    ],
    encoding: "utf8"
  });

  const emailData = leads
    .filter(l => l.decision_maker?.email)
    .map(l => ({
      email: l.decision_maker!.email,
      name: l.decision_maker!.full_name,
      title: l.decision_maker!.job_title,
      company: l.name,
      growth_score: l.growth_score
    }));

  await csvWriter.writeRecords(emailData);
  return filepath;
}
