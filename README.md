# Collecteur DRH Luxembourg

Workflow OpenAI Agents + Bright Data MCP pour collecter les contacts DRH au Luxembourg.

## Installation

```bash
npm install
```

## Configuration

Copie `.env.example` vers `.env` et configure tes clés :

```bash
cp .env.example .env
```

Variables requises :
- `OPENAI_API_KEY` : Clé API OpenAI
- `BRIGHTDATA_MCP_TOKEN` : Token Bright Data MCP

## Utilisation

### Collecte standard

```bash
npm run dev
```

### Collecte avec options CLI

```bash
# 100 entreprises max
npm run collect -- --max=100

# Secteur finance uniquement
npm run collect -- --sector=finance

# Plusieurs secteurs
npm run collect -- --sector=finance,tech,industrie

# Export JSON
npm run collect -- --json

# Uniquement les emails
npm run collect -- --emails-only --require-email

# Aide
npm run collect -- --help
```

## Architecture

```
src/
├── index.ts      # Point d'entrée principal
├── collect.ts    # Script CLI simplifié
├── workflow.ts   # Workflow de collecte (4 phases)
├── agents.ts     # Agents OpenAI spécialisés
├── schemas.ts    # Schémas Zod (validation données)
└── export.ts     # Export CSV/JSON
```

## Workflow

1. **Company Finder** : Recherche entreprises luxembourgeoises (LinkedIn, annuaires)
2. **DRH Finder** : Identifie les DRH/responsables RH dans chaque entreprise
3. **Contact Enricher** : Complète les données manquantes (emails, téléphones)
4. **Results Compiler** : Dédoublonne et compile les résultats

## Sources de données (via Bright Data)

- LinkedIn Company/People profiles
- Sites web des entreprises
- Annuaires business (Paperjam, Editus)
- Recherche Google

## Output

Les fichiers sont exportés dans `./output/` :
- `drh_luxembourg_YYYY-MM-DD.csv` : Export complet
- `emails_drh_YYYY-MM-DD.csv` : Liste emails uniquement

## Conformité RGPD

Ce collecteur est conçu pour la prospection B2B. Assure-toi de :
- Avoir une base légale (intérêt légitime)
- Permettre le droit d'opposition (lien désinscription)
- Ne pas utiliser pour du spam

## Limites

- Rate limiting automatique entre les requêtes
- Respecte les ToS de LinkedIn et Bright Data
- Données professionnelles uniquement
