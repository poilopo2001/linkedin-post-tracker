import { z } from "zod";

// Schéma pour une entreprise luxembourgeoise
export const CompanySchema = z.object({
  name: z.string().describe("Nom de l'entreprise"),
  industry: z.string().describe("Secteur d'activité"),
  size: z.string().describe("Taille (TPE, PME, ETI, GE)"),
  employees_count: z.number().nullable().describe("Nombre d'employés estimé"),
  website: z.string().nullable().describe("Site web officiel"),
  linkedin_url: z.string().nullable().describe("Page LinkedIn entreprise"),
  address: z.string().nullable().describe("Adresse au Luxembourg"),
  city: z.string().nullable().describe("Ville"),
  postal_code: z.string().nullable().describe("Code postal"),
  phone: z.string().nullable().describe("Téléphone principal"),
  description: z.string().nullable().describe("Description de l'activité"),
  rcs_number: z.string().nullable().describe("Numéro RCS Luxembourg")
});

// Schéma pour un contact DRH
export const DRHContactSchema = z.object({
  first_name: z.string().describe("Prénom"),
  last_name: z.string().describe("Nom de famille"),
  full_name: z.string().describe("Nom complet"),
  job_title: z.string().describe("Intitulé du poste (DRH, HR Director, etc.)"),
  email: z.string().nullable().describe("Email professionnel"),
  email_pattern: z.string().nullable().describe("Pattern email deviné si non trouvé"),
  phone: z.string().nullable().describe("Téléphone direct"),
  mobile: z.string().nullable().describe("Mobile professionnel"),
  linkedin_url: z.string().nullable().describe("Profil LinkedIn"),
  company: CompanySchema.describe("Entreprise du contact"),
  confidence_score: z.number().describe("Score de confiance des données (0-100)"),
  source: z.string().describe("Source des données (LinkedIn, site web, annuaire)"),
  collected_at: z.string().describe("Date de collecte ISO")
});

// Schéma pour la liste des entreprises trouvées
export const CompanyListSchema = z.object({
  companies: z.array(CompanySchema),
  total_found: z.number(),
  search_query: z.string(),
  search_method: z.string()
});

// Schéma pour la liste des contacts DRH
export const DRHContactListSchema = z.object({
  contacts: z.array(DRHContactSchema),
  total_found: z.number(),
  companies_searched: z.number(),
  success_rate: z.number().describe("Pourcentage de contacts avec email trouvé")
});

// Schéma pour le résultat final enrichi
export const EnrichedResultSchema = z.object({
  contact: DRHContactSchema,
  enrichment_sources: z.array(z.string()),
  email_verified: z.boolean(),
  additional_contacts: z.array(z.object({
    name: z.string(),
    title: z.string(),
    email: z.string().nullable()
  })).nullable().describe("Autres contacts RH dans l'entreprise")
});

// Schéma de sortie finale du workflow
export const WorkflowOutputSchema = z.object({
  drh_contacts: z.array(DRHContactSchema),
  statistics: z.object({
    total_companies_found: z.number(),
    total_contacts_found: z.number(),
    contacts_with_email: z.number(),
    contacts_with_phone: z.number(),
    average_confidence_score: z.number(),
    collection_duration_seconds: z.number()
  }),
  export_file: z.string().nullable()
});

export type Company = z.infer<typeof CompanySchema>;
export type DRHContact = z.infer<typeof DRHContactSchema>;
export type CompanyList = z.infer<typeof CompanyListSchema>;
export type DRHContactList = z.infer<typeof DRHContactListSchema>;
export type EnrichedResult = z.infer<typeof EnrichedResultSchema>;
export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;
