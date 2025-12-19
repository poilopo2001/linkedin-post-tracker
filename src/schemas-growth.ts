import { z } from "zod";

// Schéma pour une offre d'emploi marketing
export const JobListingSchema = z.object({
  job_title: z.string().describe("Titre du poste"),
  company_name: z.string().describe("Nom de l'entreprise"),
  company_linkedin: z.string().nullable().describe("URL LinkedIn entreprise"),
  company_website: z.string().nullable().describe("Site web entreprise"),
  location: z.string().describe("Localisation"),
  job_type: z.string().nullable().describe("CDI, CDD, Freelance, etc."),
  seniority: z.string().nullable().describe("Junior, Senior, Manager, Director"),
  posted_date: z.string().nullable().describe("Date de publication"),
  job_url: z.string().nullable().describe("URL de l'offre")
});

// Schéma pour une entreprise en croissance
export const GrowthCompanySchema = z.object({
  name: z.string().describe("Nom de l'entreprise"),
  industry: z.string().describe("Secteur d'activité"),
  size: z.string().nullable().describe("Taille entreprise"),
  website: z.string().nullable().describe("Site web"),
  linkedin_url: z.string().nullable().describe("Page LinkedIn"),
  location: z.string().describe("Localisation siège"),

  // Signaux de croissance
  marketing_jobs_count: z.number().describe("Nombre d'offres marketing actives"),
  job_titles: z.array(z.string()).describe("Liste des postes recherchés"),
  growth_score: z.number().describe("Score de croissance 0-100"),

  // Décideur
  decision_maker: z.object({
    full_name: z.string().describe("Nom complet"),
    job_title: z.string().describe("Poste"),
    email: z.string().nullable().describe("Email"),
    email_pattern: z.string().nullable().describe("Pattern email déduit"),
    linkedin_url: z.string().nullable().describe("Profil LinkedIn"),
    phone: z.string().nullable().describe("Téléphone")
  }).nullable().describe("Décideur marketing identifié")
});

// Schéma pour la liste des offres trouvées
export const JobListingsResultSchema = z.object({
  jobs: z.array(JobListingSchema),
  total_found: z.number(),
  search_query: z.string(),
  location_filter: z.string()
});

// Schéma pour le décideur trouvé
export const DecisionMakerResultSchema = z.object({
  full_name: z.string(),
  job_title: z.string(),
  email: z.string().nullable(),
  email_pattern: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  phone: z.string().nullable(),
  confidence_score: z.number()
});

// Schéma de sortie finale
export const GrowthLeadsOutputSchema = z.object({
  leads: z.array(GrowthCompanySchema),
  statistics: z.object({
    total_jobs_found: z.number(),
    unique_companies: z.number(),
    leads_with_decision_maker: z.number(),
    leads_with_email: z.number(),
    average_growth_score: z.number(),
    collection_duration_seconds: z.number()
  }),
  search_criteria: z.object({
    job_keywords: z.array(z.string()),
    location: z.string(),
    date_range: z.string()
  })
});

export type JobListing = z.infer<typeof JobListingSchema>;
export type GrowthCompany = z.infer<typeof GrowthCompanySchema>;
export type JobListingsResult = z.infer<typeof JobListingsResultSchema>;
export type DecisionMakerResult = z.infer<typeof DecisionMakerResultSchema>;
export type GrowthLeadsOutput = z.infer<typeof GrowthLeadsOutputSchema>;
