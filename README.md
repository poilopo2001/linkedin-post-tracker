# LinkedIn Post Tracker & Generator

Système multi-agents pour tracker, analyser et générer des posts LinkedIn en utilisant l'OpenAI Agents SDK et Bright Data.

## Fonctionnalités

- **Post Tracker** : Suivez les posts LinkedIn de vos concurrents et analysez leur engagement
- **Post Generator** : Générez des posts LinkedIn originaux basés sur l'analyse de posts performants
- **Spin Workflow** : Transformez un post viral en contenu original pour votre marque (sans patterns IA détectables)
- **Growth Signals** : Détectez les signaux de croissance (recrutements marketing, levées de fonds)
- **Dashboard** : Interface Next.js pour visualiser et gérer tout

## Prérequis

- Node.js 18+
- Python 3.10+
- Compte OpenAI avec accès API
- Compte Bright Data (pour le scraping LinkedIn)

---

## Installation

### 1. Cloner le repo

```bash
git clone https://github.com/poilopo2001/linkedin-post-tracker.git
cd linkedin-post-tracker
```

### 2. Installer les dépendances

```bash
# Dépendances Node.js (workflows TypeScript)
npm install

# Dépendances Python (API FastAPI)
cd api
pip install -r requirements.txt
cd ..

# Dépendances Dashboard
cd dashboard
npm install
cd ..
```

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Édite le fichier `.env` avec tes clés :

```env
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Bright Data MCP Token
BRIGHTDATA_MCP_TOKEN=...
```

---

## Où trouver les clés API

### OpenAI API Key

1. Va sur https://platform.openai.com/
2. Connecte-toi ou crée un compte
3. Clique sur ton profil (en haut à droite) → **API Keys**
4. Clique sur **Create new secret key**
5. Copie la clé (commence par `sk-...`)
6. Colle-la dans `.env` sous `OPENAI_API_KEY`

> **Note** : Tu as besoin de crédits sur ton compte OpenAI. Le modèle utilisé est `gpt-4o` (ou `gpt-4o-mini` pour certains agents).

### Bright Data MCP Token

1. Va sur https://brightdata.com/
2. Crée un compte ou connecte-toi
3. Dans le dashboard, va dans **Settings** → **API tokens**
4. Crée un nouveau token avec les permissions nécessaires
5. Copie le token et colle-le dans `.env` sous `BRIGHTDATA_MCP_TOKEN`

> **Note** : Bright Data est utilisé pour scraper les données LinkedIn (profils, posts, engagement). Tu peux utiliser leur offre gratuite pour tester.

---

## Lancer le projet

### Option A : Tout lancer (recommandé)

Ouvre 3 terminaux :

**Terminal 1 - API Backend (FastAPI)**
```bash
cd api
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Serveur TypeScript API (OBLIGATOIRE pour la collecte)**
```bash
npx tsx src/api-posts.ts
```

**Terminal 3 - Dashboard (Next.js)**
```bash
cd dashboard
npm run dev
```

### Accès

- **API Python** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs
- **API TypeScript** : http://localhost:3001
- **Dashboard** : http://localhost:3000

---

## Utilisation

### Via le Dashboard (recommandé)

1. Ouvre http://localhost:3000
2. **Tracker** : Ajoute des URLs LinkedIn à suivre
3. **Generate** : Configure ton profil entreprise et génère des posts
4. **Trends** : Visualise les tendances d'engagement

### Via l'API directement

```bash
# Analyser un post
curl -X POST http://localhost:8000/api/generator/analyze \
  -H "Content-Type: application/json" \
  -d '{"post_url": "https://linkedin.com/posts/..."}'

# Générer un post
curl -X POST http://localhost:8000/api/generator/generate \
  -H "Content-Type: application/json" \
  -d '{"theme": "leadership", "tone": "professional"}'
```

### Via CLI (workflows TypeScript)

```bash
# Tracker - Scraper un profil LinkedIn
npx tsx src/workflow-tracker.ts scrape "https://linkedin.com/company/exemple"

# Generator - Analyser des posts
npx tsx src/workflow-generator.ts analyze

# Growth - Détecter des signaux de croissance
npm run growth

# Collecteur DRH (workflow original)
npm run collect -- --max=100 --sector=tech
```

---

## Architecture

```
linkedin-post-tracker/
├── api/                    # Backend FastAPI (Python)
│   ├── main.py            # Point d'entrée API
│   ├── routes/            # Endpoints (tracker, generator, posts, etc.)
│   ├── services/          # Services métier
│   └── models.py          # Modèles SQLAlchemy
│
├── src/                    # Workflows TypeScript
│   ├── workflow-tracker.ts    # Suivi posts LinkedIn
│   ├── workflow-generator.ts  # Génération de contenu
│   ├── workflow-spin.ts       # Transformation de posts
│   ├── workflow-growth.ts     # Détection signaux croissance
│   ├── agents-*.ts            # Agents OpenAI spécialisés
│   └── schemas-*.ts           # Validation Zod
│
├── dashboard/              # Frontend Next.js
│   ├── app/               # Pages (App Router)
│   ├── components/        # Composants React
│   └── lib/               # Utilitaires et API client
│
└── data/                   # Base de données SQLite (local)
```

## Agents IA

Le système utilise plusieurs agents spécialisés :

| Agent | Rôle |
|-------|------|
| **Post Analyzer** | Analyse la structure, le hook, le thème universel d'un post |
| **Angle Generator** | Génère des angles créatifs et originaux |
| **Post Writer** | Écrit des posts humains sans patterns IA |
| **Humanizer** | Élimine les dernières traces de style IA |
| **Tracker Agent** | Scrape et analyse l'engagement LinkedIn |

---

## Troubleshooting

### "OPENAI_API_KEY not found"
→ Vérifie que ton `.env` est bien à la racine du projet et contient la clé.

### "Bright Data connection failed"
→ Vérifie ton token Bright Data et que tu as des crédits disponibles.

### "Database locked"
→ Ferme toutes les connexions à `data/posts.db` et relance.

### Le dashboard ne charge pas
→ Vérifie que l'API tourne sur le port 8000 (`cd api && python -m uvicorn main:app --reload`).

---

## Licence

MIT

---

## Contribution

Les PRs sont bienvenues ! Pour les bugs, ouvre une issue.
