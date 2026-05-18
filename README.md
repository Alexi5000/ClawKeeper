<div align="center">

<img src="assets/icon.png" alt="ClawKeeper Logo" width="120" />

# ClawKeeper

### The OpenClaw-native finance operating system for SMBs

**ClawKeeper turns the finance arm of a small business into an agent-run operation: invoices, reconciliation, reporting, compliance, integrations, and payment workflows coordinated through an OpenClaw-native agent control plane.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/release-v1.5.0-16a34a)](docs/RELEASE_1_5.md)
[![OpenClaw Native](https://img.shields.io/badge/OpenClaw-native-16a34a)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Quality Gate](https://img.shields.io/badge/quality-typecheck%20%7C%20lint%20%7C%20test-16a34a)](#testing-and-quality-gates)

[Quick Start](#quick-start) · [Agent Architecture](#what-clawkeeper-runs) · [Security Model](#security-model) · [Testing](#testing-and-quality-gates) · [API](#api-surface) · [Docs](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper OpenClaw-native finance-agent control surface" width="100%" />

</div>

## Why ClawKeeper exists

Most SMB finance teams do not need a static dashboard; they need the work to happen. ClawKeeper is built around that premise. The product is a **full-stack agent application** where a CEO finance agent coordinates domain leads and specialized workers across accounts payable, accounts receivable, reconciliation, reporting, compliance, integrations, ETL, and support. The dashboard remains important, but the center of gravity in v1.5 is the backend agent infrastructure: deterministic policy checks, auditable execution, tenant-aware boundaries, and an OpenClaw-native manifest that defines how finance agents are allowed to operate.

> ClawKeeper v1.5 establishes **OpenClaw-native agent infrastructure for SMB financial operations**.

| Repository maturity axis | v1.5 state |
|---|---|
| **Agent identity** | OpenClaw-native application manifest in `src/openclaw/manifest.ts` defines runtime, agents, capabilities, approval policy, and observability contracts. |
| **Execution guardrails** | `BaseAgent` now evaluates the OpenClaw finance policy before task execution and emits redacted policy audit events. |
| **Finance safety** | Aggregations use precise BigInt integer cents math. Features strict programmatic OCR line-item guardrails, rate-limit backoff retry loops, and native append-only audit database triggers. |
| **Backend surface** | Agent API routes expose manifest and dry-run policy evaluation endpoints for inspecting the control plane before execution. |
| **Testing** | Node-compatible TypeScript tests cover manifest integrity, runtime adapter health, approvals, tenant isolation, missing capabilities, prompt-injection denial, and audit redaction. |
| **Quality gate** | `npm run quality` runs TypeScript checking, ESLint, and the v1.5 test suite; `docs/templates/quality.workflow.yml` provides the GitHub Actions workflow template with `npm audit`. |

## What ClawKeeper runs

ClawKeeper models the finance department as a hierarchy of OpenClaw agents. The top-level CEO agent decomposes work, the finance leads own operational domains, and worker agents handle specialized tasks. The v1.5 runtime policy layer makes those agents safer by moving critical decisions out of prompts and into deterministic code.

```text
ClawKeeper CEO Agent
│
├── CFO Lead                  strategic finance, budgets, forecasting
├── Accounts Payable Lead      invoices, approvals, disbursements
├── Accounts Receivable Lead   billing, collections, revenue operations
├── Reconciliation Lead        bank matching, exception review
├── Compliance Lead            tax posture, audit preparation, controls
├── Reporting Lead             P&L, cash flow, balance sheet, KPIs
├── Integration Lead           Plaid, Stripe, QuickBooks, Xero, Document AI
├── Data / ETL Lead            imports, normalization, validation
└── Support Lead               user support, recovery, human handoff
```

| Layer | Implementation |
|---|---|
| **Agent runtime** | TypeScript agent classes in `src/agents`, OpenClaw application contract in `src/openclaw`, runtime adapter in `src/openclaw/runtime.ts`. |
| **API** | Hono API server with agent, invoice, report, reconciliation, auth, and health routes. |
| **Dashboard** | React/Vite/Tailwind command center for SMB operators and finance reviewers. |
| **Persistence** | PostgreSQL schema, RLS, RBAC, seed data, and tenant-aware backend types. |
| **AI provider path** | OpenAI-compatible LLM client abstraction with cost-sensitive configuration and prompt-safety guardrails. |
| **Finance integrations** | Plaid, Stripe, QuickBooks, Xero, and document-processing integration clients. |
| **Security controls** | Zod validation, PII detection, prompt-injection detection, rate limiting, audit logging, tenant isolation, approval gates, and local/CI-ready quality checks. |

## OpenClaw-native v1.5 control plane

ClawKeeper v1.5 introduces a dedicated OpenClaw module rather than leaving the agent system as UI-driven TypeScript glue. The manifest defines ClawKeeper as an **OpenClaw finance-agent application**, and the policy engine makes execution decisions before an agent touches a high-risk finance workflow.

| File | Purpose |
|---|---|
| `src/openclaw/manifest.ts` | Declares ClawKeeper’s OpenClaw app metadata, finance agents, capabilities, runtime boundaries, risk tiers, approval rules, and audit stream. |
| `src/openclaw/policy.ts` | Implements deterministic pre-execution policy evaluation for tenant isolation, role/capability checks, prompt-injection denial, amount thresholds, and approval requirements. |
| `src/openclaw/runtime.ts` | Provides the runtime adapter boundary for OpenClaw gateway metadata, manifest health, agent lookup, and guarded execution. |
| `src/agents/base.ts` | Enforces the policy engine for every agent task before execution and records redacted audit metadata. |
| `src/api/routes/agents.ts` | Exposes agent status, OpenClaw manifest inspection, and dry-run policy evaluation routes. |

The policy layer is deliberately deterministic. It does not ask an LLM whether a payment, writeback, or tenant-crossing action is safe. Instead, it evaluates the requested capability, tenant context, role, approval metadata, amount boundary, and prompt-safety findings before allowing execution.

## Security model

ClawKeeper is built for financial workloads where the agent cannot be treated as an unrestricted chatbot. The v1.5 security model adds an explicit control plane around agent execution and documents the operating boundary in [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md).

| Guardrail | v1.5 behavior |
|---|---|
| **Tenant boundary** | Agents may not act across tenants unless the request comes from a platform-level context explicitly allowed by policy. |
| **Capability boundary** | Every finance action is checked against the tenant/user capability set before execution. |
| **Approval boundary** | Payment processing, accounting-system writes, tax workflows, and high-risk operations require approval metadata. |
| **Prompt-safety boundary** | Prompt-injection and guardrail-bypass phrases are denied before execution. |
| **Audit boundary** | Policy decisions are captured as audit events with PII and secrets redacted. Audits are secured durably in the database using native PostgreSQL immutable, append-only triggers. |
| **Integration boundary** | External systems remain behind typed clients and policy-gated agent tasks. |
| **OCR validation** | Programmatic sum-matching guardrails compare line-item totals, subtotals, and totals, throwing validation errors on discrepancy to prevent junk ledger writes. |
| **Rate-limit resilience** | Generic exponential backoff retry loop protects LLM completions from rate limits (429) or transient errors during highly concurrent multi-agent runs. |

Security documentation is split between the operational model in [`SECURITY.md`](SECURITY.md) and the v1.5 OpenClaw agent boundary in [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md).

## Quick Start

ClawKeeper is a Bun-first repository for local development, with Node-compatible test and quality commands for CI. Use Bun for the application runtime and npm for the local quality gate if you are validating in a Node-only environment.

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

Set the required environment variables in `.env`, then initialize the database and start the services.

```bash
bun run setup:full
bun run dev
bun run dashboard:dev
```

| Service | Default command | Notes |
|---|---|---|
| **API server** | `bun run dev` | Runs the Hono backend and agent-control-plane routes. |
| **Dashboard** | `bun run dashboard:dev` | Starts the React command center from `dashboard/`. |
| **Database setup** | `bun run setup:full` | Applies schema, RLS, RBAC, and seed data. |
| **Validation** | `npm run quality` | Runs typecheck, lint, and tests in the v1.5 quality gate. |

## API surface

The backend exposes the finance operations API and the new OpenClaw control-plane inspection endpoints. The exact route implementations live in `src/api/routes`.

```text
GET  /health
POST /api/auth/login
POST /api/auth/register
GET  /api/agents
GET  /api/agents/openclaw/manifest
POST /api/agents/openclaw/policy/evaluate
GET  /api/invoices
POST /api/invoices/upload
POST /api/reconciliation/start
GET  /api/reports/:type
WS   /ws
```

The OpenClaw policy evaluation endpoint is a **dry-run inspection route**. It is designed for dashboards, tests, and operators to understand whether a proposed agent action would be allowed, approval-gated, or denied before actual execution.

## Testing and quality gates

ClawKeeper v1.5 adds focused tests for the agent infrastructure rather than only testing dashboard behavior. The suite validates the parts of the system that matter most for a finance-agent release: manifest correctness, policy decisions, approval requirements, tenant isolation, prompt-injection denial, and audit redaction.

```bash
npm run typecheck
npm run lint
npm test
npm run quality
```

| Test file | Coverage |
|---|---|
| `test/openclaw.manifest.test.ts` | OpenClaw app identity, finance-agent registration, high-risk capability policy, and runtime adapter health. |
| `test/openclaw.policy.test.ts` | Autonomous reporting, approval-required payment flows, approved high-risk actions, tenant isolation denial, missing capability denial, prompt-injection denial, and redaction. |
| `docs/templates/quality.workflow.yml` | GitHub Actions template for install, typecheck, lint, tests, and npm audit. |

## Repository structure

```text
ClawKeeper/
├── src/
│   ├── agents/          # CEO, orchestrator, worker, and base execution classes
│   ├── api/             # Hono server and finance/control-plane routes
│   ├── core/            # Shared types, LLM client, observability, scheduling
│   ├── guardrails/      # Validation, PII detection, injection checks, audit helpers
│   ├── integrations/    # Plaid, Stripe, QuickBooks, Xero, Document AI clients
│   ├── memory/          # Agent memory and context primitives
│   └── openclaw/        # v1.5 manifest, policy engine, runtime adapter
├── test/                # OpenClaw manifest, runtime, and policy tests
├── dashboard/           # React command center
├── db/                  # PostgreSQL schema, RLS, RBAC, and seed data
├── docs/                # Architecture, security model, API, release, deployment docs
├── agents/              # Agent definitions and worker summaries
├── skills/              # Finance skill definitions
└── docs/templates/      # CI-ready quality workflow template
```

## Documentation

| Document | What it explains |
|---|---|
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | v1.5 release notes, implementation highlights, and validation evidence. |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | OpenClaw agent boundary, approval gates, and finance guardrails. |
| [`docs/V1_5_ARCHITECTURE_ASSESSMENT.md`](docs/V1_5_ARCHITECTURE_ASSESSMENT.md) | Baseline maturity assessment that informed v1.5. |
| [`docs/V1_5_IMPLEMENTATION_SCOPE.md`](docs/V1_5_IMPLEMENTATION_SCOPE.md) | Concrete v1.5 scope derived from ClawKeeper gaps and OpenClaw patterns. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and agent hierarchy. |
| [`docs/API.md`](docs/API.md) | API reference. |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guidance. |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Tenant isolation and RBAC model. |
| [`SECURITY.md`](SECURITY.md) | Security policy and operational security notes. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution workflow. |

## Roadmap

v1.5 establishes the agent-control-plane foundation. The next milestones should deepen OpenClaw runtime execution, add policy-backed approval UX in the dashboard, expand integration writeback tests, and move from dry-run policy inspection to full operator-reviewed execution queues for money movement and accounting mutations.

| Milestone | Direction |
|---|---|
| **v1.6 Approval Workbench** | Human approval queue, reviewer comments, immutable approval evidence, and dashboard controls for high-risk actions. |
| **v1.7 Integration Hardening** | Contract tests around Plaid, Stripe, QuickBooks, Xero, and document-processing adapters. |
| **v1.8 OpenClaw Runtime Expansion** | Deeper gateway integration, distributed agent scheduling, tool sandboxing, and execution replay. |
| **v2.0 Finance Autopilot** | End-to-end SMB finance workflows that combine approvals, reconciliation, reporting, and accounting-system writeback. |

## License

ClawKeeper is released under the MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**Built by [Alex Cinovoj](https://github.com/Alexi5000) · OpenClaw-native SMB finance agents**

*Run the finance arm of the business on agents, not spreadsheets.*

</div>
