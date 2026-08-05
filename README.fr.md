<div align="center">

[English](README.md) | [Español](README.es-ES.md) | [简体中文](README.zh-CN.md) | [Português](README.pt-BR.md) | [العربية](README.ar.md) | **Français** | [Русский](README.ru.md)

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**Plan de contrôle auditable pour agents financiers de PME.**<br/>
Les agents peuvent proposer des opérations financières ; une politique déterministe, l’isolation des locataires, des points de contrôle d’approbation et des journaux de preuves déterminent ce qui peut être exécuté.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v2.0.0-16a34a?style=flat-square)](RELEASE_NOTES.md)
[![CI](https://img.shields.io/badge/CI-backend%20%7C%20dashboard%20%7C%20audit%20%7C%20docker%20%7C%20FDE-16a34a?style=flat-square)](.github/workflows/ci.yml)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Proof](https://img.shields.io/badge/proof-v2.0%20bundle-16a34a?style=flat-square)](docs/proof/v2.0/README.md)

[Architecture](#agent-architecture) · [Fonctionnalités](#what-clawkeeper-does) · [Limites](#what-clawkeeper-deliberately-does-not-do) · [Installation](#install) · [Utilisation](#usage-examples) · [Sécurité](#security-posture) · [Documentation](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## Point d’ancrage de la recherche

Lors de tests comparatifs face à des références open source ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)), l’architecture ClawKeeper a démontré une meilleure atténuation des menaces liées aux agents LLM autonomes dans des contextes d’exécution financière. Le modèle de menace cible l’injection de prompts, les fuites de données entre locataires et les mouvements de fonds non autorisés -- des modes de défaillance qui font toujours l’objet de recherches actives et ne sont pas considérés comme résolus.

La sécurité des agents est continue, non absolue. Les résultats du benchmark correspondent à un banc d’essai précis, comparé à un ensemble précis de références, à un instant donné. De nouveaux vecteurs d’attaque contre les agents financiers autonomes apparaissent régulièrement. L’architecture vise à limiter le rayon d’impact des comportements indésirables des agents, et non à les éliminer.

## État des preuves de la v2.0

ClawKeeper v2.0 s’articule autour d’un socle de preuves vérifiable :

- Contrôle qualité du backend : `npm run quality`
- Build de production du dashboard : `cd dashboard && npm run build`
- Audit des dépendances : `npm audit --audit-level=moderate`
- Benchmark FDE : `npm run fde:benchmark`
- Validation du bundle de preuves : `npm run proof:v2:validate`
- Contrôle du build Docker : `.github/workflows/ci.yml`

Consultez [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) pour le bundle de preuves v2 et les commandes de vérification. Le bundle de preuves est déterministe, hors ligne, synthétique et expurgé.

<br/>

<a id="agent-architecture"></a>

## Architecture des agents

ClawKeeper modélise un service financier sous la forme d’une hiérarchie d’agents à trois niveaux : un orchestrateur CEO, neuf responsables de domaine et 100 workers spécialisés. Chaque agent hérite de `BaseAgent`, qui évalue le moteur de politiques OpenClaw avant l’exécution des tâches. Aucun agent n’accède à un workflow financier à haut risque sans satisfaire à des contrôles de politique déterministes dans le code -- et non dans les prompts.

```text
                          ClawKeeper CEO
                     (top-level orchestrator)
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |   CFO Lead  |    |  AP Lead  |    |   AR Lead     |
     |  (8 workers)|    |(15 workers)|   | (15 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     | Recon Lead  |    |Compliance |    | Reporting     |
     |(12 workers) |    |   Lead    |    |    Lead       |
     |             |    |(10 workers)|   | (12 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘
            |                  |                  |
     ┌──────┴──────┐    ┌─────┴─────┐    ┌───────┴───────┐
     |Integration  |    | Data/ETL  |    |  Support      |
     |   Lead      |    |   Lead    |    |    Lead       |
     |(12 workers) |    |(10 workers)|   |  (6 workers)  |
     └─────────────┘    └───────────┘    └───────────────┘

                    ── APPROVAL GATE ──
     Every high-risk action (payment, writeback, tax filing,
     cross-tenant operation) requires approval metadata before
     the policy engine permits execution. The gate is
     deterministic code in src/openclaw/policy.ts, not an
     LLM judgment call.
```

### Logique du point de contrôle d’approbation

La couche de politique est délibérément déterministe. Elle ne demande pas à un LLM si un paiement, une réécriture ou une action inter-locataires est sûre.

```text
Agent requests task execution
        │
        ▼
┌─────────────────────┐     ┌─────────────────┐
│ Tenant isolation    │──X──│ DENY: wrong     │
│ check               │     │ tenant context   │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Capability check    │──X──│ DENY: missing   │
│ (role + permissions)│     │ capability       │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌─────────────────┐
│ Prompt-safety scan  │──X──│ DENY: injection │
│ (injection, bypass) │     │ attempt detected │
└────────┬────────────┘     └─────────────────┘
         │ pass
         ▼
┌─────────────────────┐     ┌──────────────────┐
│ Risk tier + amount  │──?──│ GATE: approval   │
│ threshold check     │     │ metadata required │
└────────┬────────────┘     └──────────────────┘
         │ approved or low-risk
         ▼
┌─────────────────────┐
│ EXECUTE + emit      │
│ redacted audit event│
└─────────────────────┘
```

Implémentation de la politique : [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Adaptateur d’exécution : [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Application dans l’agent de base : [`src/agents/base.ts`](src/agents/base.ts)

<br/>

<a id="what-clawkeeper-does"></a>

## Ce que fait ClawKeeper

| Domaine | Agents | Ce qu’ils prennent en charge |
|--------|-------:|-----------------|
| **Comptes fournisseurs** | 15 | Analyse des factures, validation OCR, rapprochement à trois éléments (bon de commande-facture-réception), détection des doublons, acheminement des approbations, planification des paiements, gestion des fournisseurs |
| **Comptes clients** | 15 | Facturation des clients, rapprochement des paiements, relance des encaissements, gestion des litiges, comptabilisation des produits, analyse de l’ancienneté, génération des relevés |
| **Rapprochement** | 12 | Importation des transactions bancaires via Plaid, rapprochement approximatif par date/montant/bénéficiaire, investigation des écarts, écritures d’ajustement, gestion des exceptions |
| **Reporting** | 12 | Compte de résultat, bilan, tableaux des flux de trésorerie, création de rapports personnalisés, ratios financiers, génération de graphiques, envoi planifié de rapports |
| **Intégration** | 12 | Flux bancaires Plaid, paiements Stripe, synchronisation QuickBooks, synchronisation Xero, gestion des flux OAuth, traitement des webhooks, coupe-circuits |
| **Conformité** | 10 | Contrôles de conformité fiscale, préparation des audits, vérification de la séparation des tâches, détection de la fraude, conservation des documents, reporting réglementaire |
| **Données / ETL** | 10 | Importation CSV/Excel/JSON, mise en correspondance des schémas, validation des données, déduplication, enrichissement, traitement en masse, prise en charge des migrations |
| **CFO / Stratégie** | 8 | Prévision des flux de trésorerie, gestion budgétaire, modélisation financière, suivi des KPI, analyse des écarts, évaluation des risques |
| **Support** | 6 | Assistance, diagnostic des erreurs, récupération, gestion des escalades, onboarding |

**Total : 110 agents** (1 orchestrateur CEO + 9 responsables de domaine + 100 workers spécialisés).

<br/>

<a id="what-clawkeeper-deliberately-does-not-do"></a>

## Ce que ClawKeeper ne fait délibérément PAS

Nommer les modes de défaillance importe davantage que nommer les fonctionnalités.

| Limite | Pourquoi elle existe |
|----------|--------------|
| **Aucune exécution financière autonome sans approbation humaine** | Le traitement des paiements, les écritures dans les systèmes comptables, les déclarations fiscales et les opérations à haut risque exigent des métadonnées d’approbation explicites. Le moteur de politiques refuse l’exécution si l’approbation est absente -- même si l’agent dispose de la capacité technique. Il s’agit de la contrainte architecturale la plus importante. |
| **Aucun partage de données entre locataires** | Les agents sont rattachés à un locataire. Le moteur de politiques refuse toute requête lorsque le contexte de locataire de l’agent ne correspond pas à la ressource cible. L’application de la RLS dans PostgreSQL fournit une seconde limite au niveau de la couche de données. |
| **Aucune décision de sécurité fondée sur un LLM** | Le moteur de politiques est du code TypeScript déterministe, pas un prompt. La détection des injections de prompts, les contrôles de capacités et les points de contrôle d’approbation sont évalués dans `src/openclaw/policy.ts` avant tout appel à un LLM. Cela ne rend pas le système invulnérable aux injections -- cela réduit la surface d’attaque en retirant le LLM du processus de décision de sécurité. |
| **Aucune journalisation d’audit non expurgée** | Les PII et les secrets sont expurgés des événements d’audit avant leur persistance en base de données. Les enregistrements d’audit utilisent des déclencheurs PostgreSQL en ajout seul -- une fois écrits, ils ne peuvent être ni modifiés ni supprimés via la couche applicative. |
| **Aucune dépense LLM sans limite** | Une configuration du client LLM sensible aux coûts et une temporisation en cas de limitation de débit empêchent l’emballement des coûts d’API lors d’exécutions multi-agents simultanées. Ces mesures atténuent le risque financier sans l’éliminer dans les scénarios à fort volume. |

<br/>

<a id="install"></a>

## Installation

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Variables d’environnement minimales

```bash
# Required
DATABASE_URL=postgresql://clawkeeper:password@localhost:5432/clawkeeper
JWT_SECRET=<random-string-minimum-32-chars>
OPENAI_API_KEY=<your-key>        # or ANTHROPIC_API_KEY

# Optional integrations
PLAID_CLIENT_ID=                 # bank feeds
STRIPE_API_KEY=                  # payment processing
QUICKBOOKS_CLIENT_ID=            # accounting sync
XERO_CLIENT_ID=                  # accounting sync
```

### Démarrer les services

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### Valider

```bash
npm run quality             # typecheck + lint + test suite
```

## Vérifier la v2 localement

Utilisez le parcours de preuves hors ligne pour effectuer une vérification sans base de données :

```bash
npm ci
npm run quality
cd dashboard && npm install && npm run build
cd ..
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
npm run demo:offline
```

Utilisez le parcours de démonstration avec base de données lorsque Docker est disponible :

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

Les données de démonstration sont synthétiques. Le parcours de preuves v2 n’appelle ni Plaid, ni Stripe, ni QuickBooks, ni Xero, ni aucun réseau de paiement réel.

<br/>

<a id="usage-examples"></a>

## Exemples d’utilisation

### Évaluer une décision de politique (simulation)

Vérifiez si une action proposée par un agent serait autorisée, soumise à approbation ou refusée -- sans rien exécuter.

```bash
curl -X POST http://localhost:4004/api/agents/openclaw/policy/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "agentId": "payment-processor",
    "capability": "process_payment",
    "tenantId": "tenant_001",
    "amount": 15000,
    "approvalMetadata": null
  }'

# Response: { "decision": "approval_required", "reason": "amount exceeds threshold", ... }
```

### Inspecter le manifeste OpenClaw

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### Téléverser et traiter une facture

```bash
curl -X POST http://localhost:4004/api/invoices/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@invoice.pdf"

# Triggers: OCR extraction → line-item validation → duplicate check
#           → expense categorization → approval routing
# Failure mode: OCR sum-matching guardrail will reject the invoice
# if line-item totals do not match the stated total.
```

<br/>

<a id="security-posture"></a>

## Posture de sécurité

La sécurité des agents est une pratique continue, et non une fonctionnalité livrée une fois pour toutes. Le modèle de menace de ClawKeeper se concentre sur les surfaces d’attaque propres aux agents financiers autonomes : injection de prompts, fuite entre locataires, mouvements de fonds non autorisés et altération des audits.

| Garde-fou | Mise en œuvre | Limite connue |
|-----------|---------------|-----------------|
| **Isolation des locataires** | Moteur de politiques + RLS PostgreSQL | Le contournement de la RLS est possible si un accès SQL brut est accordé en dehors de la couche applicative |
| **Points de contrôle d’approbation** | Contrôles de politique déterministes dans `src/openclaw/policy.ts` | Les métadonnées d’approbation sont considérées comme fiables une fois fournies -- l’interface du workflow d’approbation figure sur la feuille de route v1.6 |
| **Refus des injections de prompts** | Garde-fous par correspondance de motifs évalués avant l’appel au LLM | La détection fondée sur des motifs ne repère pas les nouvelles techniques d’injection ; il s’agit d’un domaine de recherche actif |
| **Immuabilité des audits** | Déclencheurs PostgreSQL en ajout seul ; expurgation des PII/secrets avant écriture | Un contournement au niveau de la base de données (SQL direct) peut éviter les déclencheurs ; ce risque est atténué par les contrôles d’accès réseau |
| **Validation OCR** | Vérification programmatique de la somme des lignes par rapport aux totaux indiqués | Les factures malveillantes conçues pour réussir les contrôles de somme tout en contenant des lignes individuelles incorrectes constituent une lacune connue |
| **Résilience aux limitations de débit** | Nouvelles tentatives avec temporisation exponentielle pour les erreurs 429/transitoires | Des plafonds de temporisation existent, mais une limitation prolongée du débit lors des pics de concurrence peut réduire le débit de traitement des agents |

Contexte de recherche : [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Modèle de sécurité : [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Signalement des vulnérabilités : [`SECURITY.md`](SECURITY.md)

<br/>

## Surface de l’API

```text
GET  /health                                 # liveness
POST /api/auth/login                         # JWT authentication
POST /api/auth/register                      # tenant registration
GET  /api/agents                             # agent registry
GET  /api/agents/openclaw/manifest           # OpenClaw manifest inspection
POST /api/agents/openclaw/policy/evaluate    # dry-run policy evaluation
GET  /api/invoices                           # invoice list
POST /api/invoices/upload                    # OCR invoice processing
POST /api/reconciliation/start              # bank reconciliation
GET  /api/reports/:type                      # financial reports
WS   /ws                                     # real-time agent events
```

<br/>

## Tests et contrôles qualité

La suite de tests valide les parties du système qui comptent pour une version destinée aux agents financiers : exactitude du manifeste, décisions de politique, exigences d’approbation, isolation des locataires, refus des injections de prompts et expurgation des audits. Les tests de comportement du dashboard sont secondaires.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
npm run fde:benchmark      # deterministic finance-agent benchmark
npm run proof:v2:validate  # proof bundle validation
```

| Fichier de test | Ce qu’il valide |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | Identité de l’application, enregistrement des agents, politique des capacités à haut risque, état de l’adaptateur d’exécution |
| `test/openclaw.policy.test.ts` | Reporting autonome, flux de paiement nécessitant une approbation, refus lié à l’isolation des locataires, refus lié à une capacité manquante, refus des injections de prompts, expurgation des audits |

<br/>

<a id="documentation"></a>

## Structure du dépôt

```text
ClawKeeper/
├── src/
│   ├── agents/          # CEO, orchestrator, worker, BaseAgent execution
│   ├── api/             # Hono server, finance + control-plane routes
│   ├── core/            # Types, LLM client, observability, scheduling
│   ├── guardrails/      # Validation, PII detection, injection checks
│   ├── integrations/    # Plaid, Stripe, QuickBooks, Xero, Document AI
│   ├── memory/          # Agent memory and context primitives
│   └── openclaw/        # Manifest, policy engine, runtime adapter
├── agents/              # 110 AGENT.md definitions (CEO + leads + workers)
├── test/                # OpenClaw manifest + policy tests
├── dashboard/           # React/Vite/Tailwind command center
├── db/                  # PostgreSQL schema, RLS, RBAC, seed data
├── docs/                # Architecture, security model, API, deployment
└── skills/              # Finance skill definitions
```

<br/>

## Documentation

| Document | Objet |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture du système et hiérarchie des agents |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Limites des agents OpenClaw, points de contrôle d’approbation, garde-fous financiers |
| [`docs/proof/v2.0/README.md`](docs/proof/v2.0/README.md) | Bundle de preuves v2 et commandes de vérification |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | Notes de version historiques et preuves de validation |
| [`docs/API.md`](docs/API.md) | Référence de l’API |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Guide de déploiement |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Isolation des locataires et modèle RBAC |
| [`AGENTS.md`](AGENTS.md) | Index complet des 110 agents et de leur hiérarchie |
| [`SECURITY.md`](SECURITY.md) | Politique de signalement des vulnérabilités |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Workflow de contribution |

<br/>

## Feuille de route

| Version | Orientation | Risque ouvert |
|---------|-----------|-----------|
| **v2.1** | Espace d’approbation -- file d’approbation humaine, commentaires des réviseurs, preuves d’approbation immuables dans le dashboard | Latence de l’interface d’approbation pour les opérations AP à fort volume |
| **v2.2** | Renforcement des intégrations -- tests de contrat pour les adaptateurs Plaid, Stripe, QuickBooks et Xero | Dérive du schéma des API tierces entre les environnements de test et de production |
| **v2.3** | Extension de l’exécution -- planification distribuée des agents, sandboxing des outils, relecture des exécutions | Fidélité de la relecture lorsque l’état d’un système externe a changé |
| **v3.0** | Pilote automatique financier -- workflows de bout en bout combinant approbations, rapprochement, reporting et réécriture | Cumul des taux d’erreur dans les chaînes d’agents en plusieurs étapes |

<br/>

## Licence

MIT. Consultez [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

Pour le déploiement en production, les audits de sécurité ou l’assistance à l’intégration : [techtideai.io](https://techtideai.io/)

</div>
