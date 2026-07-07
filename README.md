<div align="center">

<img src="assets/icon.png" alt="ClawKeeper" width="120" />

# ClawKeeper

**OpenClaw-native SMB finance-agent platform.**<br/>
110 TypeScript agents. Approval-gated. Audit-logged. Production-deployed.

[![License: MIT](https://img.shields.io/badge/license-MIT-3B82F6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/release-v1.5.0-16a34a?style=flat-square)](docs/RELEASE_1_5.md)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-native-16a34a?style=flat-square)](https://github.com/openclaw/openclaw)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Quality](https://img.shields.io/badge/gate-typecheck%20%7C%20lint%20%7C%20test-16a34a?style=flat-square)](#testing--quality-gates)

[Architecture](#agent-architecture) · [What It Does](#what-clawkeeper-does) · [What It Does Not Do](#what-clawkeeper-deliberately-does-not-do) · [Install](#install) · [Usage](#usage-examples) · [Security](#security-posture) · [Docs](#documentation)

---

<img src="assets/cover.png" alt="ClawKeeper agent control surface" width="100%" />

</div>

<br/>

## Research anchor

In benchmark testing against open-source baselines ([arXiv:2603.24414](https://arxiv.org/abs/2603.24414)), the ClawKeeper architecture demonstrated superior mitigation of autonomous LLM agent threats in financial execution contexts. The threat model targets prompt injection, cross-tenant data leakage, and unsanctioned money movement -- failure modes that remain under active research and are not considered solved.

Agent security is continuous, not absolute. The benchmark results reflect a specific test harness against a specific set of baselines at a point in time. New attack vectors against autonomous financial agents emerge regularly. The architecture is designed to reduce the blast radius of agent misbehavior, not to eliminate it.

<br/>

## Agent architecture

ClawKeeper models a finance department as a three-layer agent hierarchy: one CEO orchestrator, nine domain leads, and 100 specialized workers. Every agent inherits from `BaseAgent`, which evaluates the OpenClaw policy engine before task execution. No agent touches a high-risk financial workflow without passing deterministic policy checks in code -- not in prompts.

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

### Approval gate logic

The policy layer is deliberately deterministic. It does not ask an LLM whether a payment, writeback, or tenant-crossing action is safe.

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

Policy implementation: [`src/openclaw/policy.ts`](src/openclaw/policy.ts) · Runtime adapter: [`src/openclaw/runtime.ts`](src/openclaw/runtime.ts) · Base agent enforcement: [`src/agents/base.ts`](src/agents/base.ts)

<br/>

## What ClawKeeper does

| Domain | Agents | What they handle |
|--------|-------:|-----------------|
| **Accounts Payable** | 15 | Invoice parsing, OCR validation, three-way matching (PO-invoice-receipt), duplicate detection, approval routing, payment scheduling, vendor management |
| **Accounts Receivable** | 15 | Customer invoicing, payment matching, collections follow-up, dispute handling, revenue recognition, aging analysis, statement generation |
| **Reconciliation** | 12 | Bank transaction import via Plaid, fuzzy matching by date/amount/payee, discrepancy investigation, adjustment entries, exception handling |
| **Reporting** | 12 | P&L, balance sheet, cash flow statements, custom report building, financial ratios, chart generation, scheduled report delivery |
| **Integration** | 12 | Plaid bank feeds, Stripe payments, QuickBooks sync, Xero sync, OAuth flow management, webhook processing, circuit breakers |
| **Compliance** | 10 | Tax compliance checks, audit preparation, segregation-of-duties verification, fraud detection, document retention, regulatory reporting |
| **Data / ETL** | 10 | CSV/Excel/JSON import, schema mapping, data validation, deduplication, enrichment, bulk processing, migration support |
| **CFO / Strategic** | 8 | Cash flow forecasting, budget management, financial modeling, KPI tracking, variance analysis, risk assessment |
| **Support** | 6 | Help desk, error diagnosis, recovery, escalation management, onboarding |

**Total: 110 agents** (1 CEO orchestrator + 9 domain leads + 100 specialized workers).

<br/>

## What ClawKeeper deliberately does NOT do

Naming the failure modes matters more than naming the features.

| Boundary | Why it exists |
|----------|--------------|
| **No autonomous financial execution without human approval** | Payment processing, accounting-system writes, tax filings, and high-risk operations require explicit approval metadata. The policy engine will deny execution if approval is missing -- even if the agent has the technical capability. This is the most important architectural constraint. |
| **No cross-tenant data sharing** | Agents are tenant-scoped. The policy engine denies any request where the agent's tenant context does not match the target resource. RLS enforcement in PostgreSQL provides a second boundary at the data layer. |
| **No LLM-based security decisions** | The policy engine is deterministic TypeScript code, not a prompt. Prompt-injection detection, capability checks, and approval gates are evaluated in `src/openclaw/policy.ts` before any LLM is invoked. This does not make the system injection-proof -- it reduces the attack surface by removing the LLM from the security decision path. |
| **No unredacted audit logging** | PII and secrets are redacted from audit events before database persistence. Audit records use PostgreSQL append-only triggers -- once written, they cannot be modified or deleted through the application layer. |
| **No unbounded LLM spending** | Cost-sensitive LLM client configuration and rate-limit backoff prevent runaway API costs during concurrent multi-agent runs. This mitigates but does not eliminate cost risk in high-volume scenarios. |

<br/>

## Install

```bash
git clone https://github.com/Alexi5000/ClawKeeper.git
cd ClawKeeper
bun install
cp .env.example .env
```

### Minimum environment variables

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

### Start services

```bash
bun run setup:full          # schema, RLS, RBAC, seed data
bun run dev                 # Hono API server + agent control plane
bun run dashboard:dev       # React command center
```

### Validate

```bash
npm run quality             # typecheck + lint + test suite
```

## Verify v2 locally

Use the offline proof path when you want a no-database verification run:

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

Use the database-backed demo path when Docker is available:

```bash
docker compose up -d postgres
export DATABASE_URL=postgresql://clawkeeper:clawkeeper_local_password@localhost:5432/clawkeeper
npm run demo:db
docker build -t clawkeeper:v2 .
```

The demo data is synthetic. The v2 proof path does not call Plaid, Stripe, QuickBooks, Xero, or live payment rails.

<br/>

## Usage examples

### Evaluate a policy decision (dry run)

Check whether a proposed agent action would be allowed, approval-gated, or denied -- without executing anything.

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

### Inspect the OpenClaw manifest

```bash
curl http://localhost:4004/api/agents/openclaw/manifest \
  -H "Authorization: Bearer $TOKEN"

# Returns: full agent registry, capabilities, risk tiers, approval rules
```

### Upload and process an invoice

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

## Security posture

Agent security is a continuous practice, not a shipped feature. The ClawKeeper threat model focuses on the attack surfaces specific to autonomous financial agents: prompt injection, cross-tenant leakage, unsanctioned money movement, and audit tampering.

| Guardrail | Implementation | Known limitation |
|-----------|---------------|-----------------|
| **Tenant isolation** | Policy engine + PostgreSQL RLS | RLS bypass is possible if raw SQL access is granted outside the application layer |
| **Approval gates** | Deterministic policy checks in `src/openclaw/policy.ts` | Approval metadata is trusted once provided -- the approval workflow UI is roadmap v1.6 |
| **Prompt-injection denial** | Pattern-matching guardrails evaluated before LLM invocation | Pattern-based detection does not catch novel injection techniques; this is an active research area |
| **Audit immutability** | PostgreSQL append-only triggers; PII/secret redaction before write | Database-level bypass (direct SQL) can circumvent triggers; mitigated by network access controls |
| **OCR validation** | Programmatic sum-matching of line items vs. stated totals | Adversarial invoices designed to pass sum checks while containing incorrect individual line items are a known gap |
| **Rate-limit resilience** | Exponential backoff retry on 429/transient errors | Backoff caps exist but sustained rate limiting during peak concurrency can degrade agent throughput |

Research context: [arXiv:2603.24414](https://arxiv.org/abs/2603.24414) · Security model: [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) · Vulnerability reports: [`SECURITY.md`](SECURITY.md)

<br/>

## API surface

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

## Testing & quality gates

The test suite validates the parts of the system that matter for a finance-agent release: manifest correctness, policy decisions, approval requirements, tenant isolation, prompt-injection denial, and audit redaction. Dashboard behavior tests are secondary.

```bash
npm run typecheck          # TypeScript strict mode
npm run lint               # ESLint
npm test                   # OpenClaw manifest + policy tests
npm run quality            # all three, sequential
```

| Test file | What it validates |
|-----------|------------------|
| `test/openclaw.manifest.test.ts` | App identity, agent registration, high-risk capability policy, runtime adapter health |
| `test/openclaw.policy.test.ts` | Autonomous reporting, approval-required payment flows, tenant isolation denial, missing capability denial, prompt-injection denial, audit redaction |

<br/>

## Repository structure

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

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture and agent hierarchy |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | OpenClaw agent boundary, approval gates, finance guardrails |
| [`docs/RELEASE_1_5.md`](docs/RELEASE_1_5.md) | v1.5 release notes and validation evidence |
| [`docs/API.md`](docs/API.md) | API reference |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment guidance |
| [`docs/MULTI-TENANCY.md`](docs/MULTI-TENANCY.md) | Tenant isolation and RBAC model |
| [`AGENTS.md`](AGENTS.md) | Full 110-agent index with hierarchy |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting policy |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution workflow |

<br/>

## Roadmap

| Version | Direction | Open risk |
|---------|-----------|-----------|
| **v1.6** | Approval workbench -- human approval queue, reviewer comments, immutable approval evidence in dashboard | Approval UX latency for high-volume AP operations |
| **v1.7** | Integration hardening -- contract tests for Plaid, Stripe, QuickBooks, Xero adapters | Third-party API schema drift between test and production |
| **v1.8** | OpenClaw runtime expansion -- distributed agent scheduling, tool sandboxing, execution replay | Replay fidelity when external system state has changed |
| **v2.0** | Finance autopilot -- end-to-end workflows combining approvals, reconciliation, reporting, and writeback | Compounding error rates across multi-step agent chains |

<br/>

## License

MIT. See [`LICENSE`](LICENSE).

---

<div align="center">

**[Alex Cinovoj](https://www.linkedin.com/in/alexcinovoj)** · [TechTide AI](https://techtideai.io/) · Columbus, Ohio

For production deployment, security review, or integration support: [techtideai.io](https://techtideai.io/)

</div>
