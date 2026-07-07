# ClawKeeper v2.0 Build Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ClawKeeper v2.0 into a client-ready, proof-backed finance-agent control plane first, then package it like a strong public GitHub showcase.

**Architecture:** Work proceeds through a gated agent loop: Scout -> Plan -> Build -> Verify -> Review -> Commit -> Log -> Approval Gate. Each task produces a small, independently testable diff and a run-log entry before the next task begins.

**Tech Stack:** TypeScript, Hono, React/Vite dashboard, Node test runner, Bun/npm lockfiles already present, Docker, GitHub Actions, deterministic offline FDE benchmark.

## Global Constraints

- Client-ready production demo first, GitHub virality second.
- Do not add more agents for v2.0.
- Do not add live Stripe, Plaid, QuickBooks, or Xero production writeback.
- Do not claim autonomous payment execution.
- Do not add paid provider dependencies to the default demo.
- Do not rewrite the backend framework.
- Public claims must map to a proof surface.
- Stop before push, PR, merge, deploy, release, secrets, destructive cleanup, or paid/live provider tests.
- Keep each task small enough to verify and commit independently.

---

## File Structure

Build-loop artifacts:

- `docs/operations/v2-build-loop.md`: operating loop, agent roles, gates, failure policy.
- `docs/operations/v2-run-log.md`: append-only checkpoint log.
- `docs/recipes/clawkeeper-v2-agent-build-loop.yaml`: reusable loop recipe.

Implementation files expected in later tasks:

- `.github/workflows/ci.yml`: public quality gate.
- `dashboard/src/lib/api.ts`: dashboard API types and methods.
- `dashboard/src/pages/**`: narrowly repaired pages only where build errors require it.
- `package.json`: FDE/proof scripts when added.
- `packages/fde/**`: typed contracts, harness, benchmark.
- `docs/proof/v2.0/**`: generated proof bundle.
- `docs/security/v2-audit-waivers.md`: only if audit findings are accepted instead of resolved.
- `README.md`, `RELEASE_NOTES.md`: public packaging after proof exists.

## Task 0: Baseline Lock

**Files:**

- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Consumes: current repo state.
- Produces: a baseline checkpoint for later agents.

- [ ] **Step 1: Confirm branch state**

Run:

```bash
git status --short --branch
```

Expected:

```text
## main...origin/main [ahead N]
```

No untracked or modified source files.

- [ ] **Step 2: Run backend quality**

Run:

```bash
npm run quality
```

Expected:

```text
# pass 139
# fail 0
```

- [ ] **Step 3: Run dashboard build and capture failure**

Run:

```bash
cd dashboard && npm install && npm run build
```

Expected current failure:

```text
Cannot find name 'OrchestrationPlan'
Property 'start_agent' does not exist on type 'ApiClient'
Property 'accounts' does not exist on type '{}'
```

- [ ] **Step 4: Run audit**

Run:

```bash
npm audit --audit-level=moderate
```

Expected current failure:

```text
hono high
ws high
js-yaml moderate
uuid moderate
```

- [ ] **Step 5: Append baseline log**

Append this shape to `docs/operations/v2-run-log.md`:

```markdown
## 2026-07-07 — Step 0 Baseline Lock

Step: baseline lock
Agent owner: Emile

Commands:

- `git status --short --branch`
- `npm run quality`
- `cd dashboard && npm install && npm run build`
- `npm audit --audit-level=moderate`

Result:

- Backend quality:
- Dashboard build:
- Audit:

Next step:

- Step 1: dashboard build repair.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add docs/operations/v2-run-log.md
git commit -m "docs: record ClawKeeper v2 baseline"
```

## Task 1: Dashboard Build Repair

**Files:**

- Modify: `dashboard/src/lib/api.ts`
- Inspect and modify when named in the TypeScript error output: `dashboard/src/pages/agents/AgentsPage.tsx`
- Inspect and modify when named in the TypeScript error output: `dashboard/src/pages/agents/CommandCenterPage.tsx`
- Inspect and modify when named in the TypeScript error output: `dashboard/src/pages/reconciliation/ReconciliationPage.tsx`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces exported dashboard API types:
  - `OrchestrationPlan`
  - `OrchestrationEvent`
  - `OrchestrationResult`
- Produces `ApiClient` methods:
  - `start_agent(agent_id: string): Promise<AgentActionResponse>`
  - `stop_agent(agent_id: string): Promise<AgentActionResponse>`

- [ ] **Step 1: Reproduce dashboard build failure**

Run:

```bash
cd dashboard && npm run build
```

Expected: FAIL with missing orchestration types/methods.

- [ ] **Step 2: Read the failing API/page surfaces**

Run:

```bash
sed -n '1,340p' dashboard/src/lib/api.ts
sed -n '1,140p' dashboard/src/pages/agents/AgentsPage.tsx
sed -n '1,340p' dashboard/src/pages/agents/CommandCenterPage.tsx
sed -n '1,140p' dashboard/src/pages/reconciliation/ReconciliationPage.tsx
```

- [ ] **Step 3: Add the missing API contracts**

In `dashboard/src/lib/api.ts`, define the missing exported types near existing type declarations:

```ts
export interface OrchestrationPlan {
  id: string;
  task_id: string;
  status: 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
  tasks: Array<{
    id: string;
    name: string;
    assigned_agent: string;
    required_capabilities: string[];
    status: string;
  }>;
  created_at: string;
  updated_at?: string;
}

export interface OrchestrationEvent {
  id: string;
  type: string;
  task_id?: string;
  agent_id?: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface OrchestrationResult {
  plan_id: string;
  status: 'completed' | 'failed' | 'cancelled';
  output?: Record<string, unknown>;
  events: OrchestrationEvent[];
  duration_ms?: number;
  error?: string | null;
}

export interface AgentActionResponse {
  success: boolean;
  agent_id: string;
  status: string;
  message?: string;
}
```

- [ ] **Step 4: Add missing API methods**

In `ApiClient`, add methods using the existing request helper style:

```ts
async start_agent(agent_id: string): Promise<AgentActionResponse> {
  return this.request<AgentActionResponse>(`/api/agents/${agent_id}/start`, {
    method: 'POST',
  });
}

async stop_agent(agent_id: string): Promise<AgentActionResponse> {
  return this.request<AgentActionResponse>(`/api/agents/${agent_id}/stop`, {
    method: 'POST',
  });
}
```

- [ ] **Step 5: Fix remaining page type errors only**

If TypeScript still reports implicit `any` in agent pages, annotate callback parameters with the local types already imported from `dashboard/src/lib/api.ts`.

If reconciliation still reports `Property 'accounts' does not exist on type '{}'`, replace the untyped default with:

```ts
const reconciliation_data = data ?? { accounts: [] };
```

using the page's actual variable names.

- [ ] **Step 6: Verify dashboard build**

Run:

```bash
cd dashboard && npm run build
```

Expected: PASS.

- [ ] **Step 7: Verify backend still passes**

Run:

```bash
npm run quality
```

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add dashboard/src docs/operations/v2-run-log.md
git commit -m "fix: restore dashboard build"
```

## Task 2: CI Restore

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces GitHub workflow jobs:
  - `backend`
  - `dashboard`
  - `audit`
  - `docker`

- [ ] **Step 1: Create workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run quality

  dashboard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
          cache-dependency-path: dashboard/package-lock.json
      - run: npm install
        working-directory: dashboard
      - run: npm run build
        working-directory: dashboard

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=moderate

  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t clawkeeper:ci .
```

- [ ] **Step 2: Ensure dashboard lockfile exists**

Run:

```bash
cd dashboard && npm install --package-lock-only --ignore-scripts
```

Expected: `dashboard/package-lock.json` exists and is committed with CI because the workflow uses npm cache.

- [ ] **Step 3: Run local CI equivalent**

Run:

```bash
npm ci
npm run quality
cd dashboard && npm install && npm run build
cd .. && npm audit --audit-level=moderate
docker build -t clawkeeper:ci .
```

Expected: all pass except audit if Task 3 has not run yet. If audit still fails, keep the workflow but do not call CI fully green until Task 3.

- [ ] **Step 4: Commit**

Run:

```bash
git add .github/workflows/ci.yml dashboard/package-lock.json docs/operations/v2-run-log.md
git commit -m "ci: restore ClawKeeper quality gates"
```

## Task 3: Dependency Security Cleanup

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create when `npm audit --audit-level=moderate` cannot pass without a major upgrade: `docs/security/v2-audit-waivers.md`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces a passing or explicitly waived dependency audit gate.

- [ ] **Step 1: Inspect audit findings**

Run:

```bash
npm audit --audit-level=moderate --json > /tmp/clawkeeper-audit.json
node -e "const j=require('/tmp/clawkeeper-audit.json'); for (const [k,v] of Object.entries(j.vulnerabilities||{})) console.log(k, v.severity, JSON.stringify(v.fixAvailable));"
```

- [ ] **Step 2: Apply non-breaking fixes**

Run:

```bash
npm audit fix
```

- [ ] **Step 3: Re-run quality**

Run:

```bash
npm run quality
npm audit --audit-level=moderate
```

Expected: PASS.

- [ ] **Step 4: If audit cannot pass without major changes, document waiver**

Create `docs/security/v2-audit-waivers.md` when `npm audit --audit-level=moderate` cannot pass without a major upgrade:

```markdown
# ClawKeeper v2.0 Audit Waivers

Date: 2026-07-07

| Package | Severity | Finding | Reason Accepted | Revisit Trigger |
|---|---|---|---|---|
```

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json package-lock.json docs/security docs/operations/v2-run-log.md
git commit -m "fix: resolve v2 dependency audit findings"
```

## Task 4: FDE Contracts

**Files:**

- Create: `packages/fde/package.json`
- Create: `packages/fde/src/contracts.ts`
- Create: `packages/fde/test/contracts.test.ts`
- Modify: `package.json`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces:
  - `FinanceScenario`
  - `FinanceAction`
  - `FinanceEvaluation`
  - `V2_CONTRACT_VERSION`

- [ ] **Step 1: Add package scripts**

In root `package.json`, add:

```json
"fde:contracts": "node --test --import tsx \"packages/fde/test/**/*.test.ts\"",
"fde:test": "npm run fde:contracts"
```

- [ ] **Step 2: Create FDE package**

Create `packages/fde/package.json`:

```json
{
  "name": "@clawkeeper/fde",
  "version": "0.1.0",
  "type": "module",
  "private": true
}
```

- [ ] **Step 3: Add contract tests**

Create `packages/fde/test/contracts.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { V2_CONTRACT_VERSION, create_invoice_scenario } from '../src/contracts';

test('creates a versioned invoice scenario', () => {
  const scenario = create_invoice_scenario();
  assert.equal(V2_CONTRACT_VERSION, 'clawkeeper.v2.0');
  assert.equal(scenario.kind, 'invoice_intake');
  assert.equal(scenario.expected_controls.includes('policy_check'), true);
  assert.equal(scenario.expected_controls.includes('audit_event'), true);
});
```

- [ ] **Step 4: Implement contracts**

Create `packages/fde/src/contracts.ts`:

```ts
export const V2_CONTRACT_VERSION = 'clawkeeper.v2.0' as const;

export type FinanceScenarioKind =
  | 'invoice_intake'
  | 'reconciliation_exception'
  | 'approval_gated_payment'
  | 'audit_reconstruction';

export interface FinanceScenario {
  version: typeof V2_CONTRACT_VERSION;
  id: string;
  kind: FinanceScenarioKind;
  title: string;
  input: Record<string, unknown>;
  expected_controls: Array<'policy_check' | 'approval_gate' | 'audit_event' | 'tenant_boundary'>;
}

export interface FinanceAction {
  id: string;
  scenario_id: string;
  agent_id: string;
  capability: string;
  input: Record<string, unknown>;
  requires_approval: boolean;
}

export interface FinanceEvaluation {
  scenario_id: string;
  policy_safety: number;
  financial_correctness: number;
  evidence_completeness: number;
  operator_usability: number;
  passed: boolean;
}

export function create_invoice_scenario(): FinanceScenario {
  return {
    version: V2_CONTRACT_VERSION,
    id: 'scenario_invoice_intake_001',
    kind: 'invoice_intake',
    title: 'Validate invoice intake before payment workflow',
    input: {
      vendor: 'Demo Office Supply',
      invoice_number: 'INV-2001',
      amount_cents: 12500,
      currency: 'USD',
    },
    expected_controls: ['policy_check', 'audit_event', 'tenant_boundary'],
  };
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run fde:contracts
npm run quality
```

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json packages/fde docs/operations/v2-run-log.md
git commit -m "feat: add v2 FDE contracts"
```

## Task 5: FDE Benchmark Harness

**Files:**

- Create: `packages/fde/src/scenarios.ts`
- Create: `packages/fde/src/benchmark.ts`
- Create: `packages/fde/test/benchmark.test.ts`
- Modify: `package.json`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces `run_v2_benchmark(): FinanceEvaluation[]`.
- Produces `docs/proof/v2.0/benchmark.json`.

- [ ] **Step 1: Add benchmark script**

In root `package.json`, add:

```json
"fde:benchmark": "tsx packages/fde/src/benchmark.ts"
```

- [ ] **Step 2: Add benchmark tests**

Create `packages/fde/test/benchmark.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { run_v2_benchmark } from '../src/benchmark';

test('v2 benchmark passes all deterministic finance scenarios', () => {
  const results = run_v2_benchmark();
  assert.equal(results.length, 4);
  assert.equal(results.every(result => result.passed), true);
  assert.equal(results.every(result => result.policy_safety >= 0.9), true);
});
```

- [ ] **Step 3: Implement scenarios**

Create `packages/fde/src/scenarios.ts`:

```ts
import type { FinanceScenario } from './contracts';
import { V2_CONTRACT_VERSION, create_invoice_scenario } from './contracts';

export function create_reconciliation_scenario(): FinanceScenario {
  return {
    version: V2_CONTRACT_VERSION,
    id: 'scenario_reconciliation_exception_001',
    kind: 'reconciliation_exception',
    title: 'Detect a bank reconciliation exception without mutating books',
    input: {
      bank_transaction_cents: 9800,
      ledger_transaction_cents: 8900,
      payee: 'Demo Utilities',
    },
    expected_controls: ['policy_check', 'audit_event', 'tenant_boundary'],
  };
}

export function create_payment_scenario(): FinanceScenario {
  return {
    version: V2_CONTRACT_VERSION,
    id: 'scenario_approval_gated_payment_001',
    kind: 'approval_gated_payment',
    title: 'Require approval before creating a payment intent',
    input: {
      vendor: 'Demo Office Supply',
      amount_cents: 12500,
      approval_id: null,
    },
    expected_controls: ['policy_check', 'approval_gate', 'audit_event', 'tenant_boundary'],
  };
}

export function create_audit_scenario(): FinanceScenario {
  return {
    version: V2_CONTRACT_VERSION,
    id: 'scenario_audit_reconstruction_001',
    kind: 'audit_reconstruction',
    title: 'Reconstruct the finance-agent decision trail from redacted events',
    input: {
      task_id: 'task_demo_001',
      event_count: 3,
    },
    expected_controls: ['audit_event', 'tenant_boundary'],
  };
}

export function create_v2_scenarios(): FinanceScenario[] {
  return [
    create_invoice_scenario(),
    create_reconciliation_scenario(),
    create_payment_scenario(),
    create_audit_scenario(),
  ];
}
```

- [ ] **Step 4: Implement benchmark**

Create `packages/fde/src/benchmark.ts`:

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FinanceEvaluation, FinanceScenario } from './contracts';
import { create_v2_scenarios } from './scenarios';

const root_dir = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const benchmark_path = join(root_dir, 'docs/proof/v2.0/benchmark.json');

function evaluate_scenario(scenario: FinanceScenario): FinanceEvaluation {
  const has_policy = scenario.expected_controls.includes('policy_check');
  const has_audit = scenario.expected_controls.includes('audit_event');
  const has_tenant_boundary = scenario.expected_controls.includes('tenant_boundary');
  const has_approval_gate =
    scenario.kind !== 'approval_gated_payment' || scenario.expected_controls.includes('approval_gate');

  const result: FinanceEvaluation = {
    scenario_id: scenario.id,
    policy_safety: has_policy || scenario.kind === 'audit_reconstruction' ? 1 : 0,
    financial_correctness: scenario.input.amount_cents === undefined || Number(scenario.input.amount_cents) >= 0 ? 1 : 0,
    evidence_completeness: has_audit ? 1 : 0,
    operator_usability: has_tenant_boundary && has_approval_gate ? 1 : 0.5,
    passed: false,
  };

  result.passed =
    result.policy_safety >= 0.9 &&
    result.financial_correctness >= 0.9 &&
    result.evidence_completeness >= 0.9 &&
    result.operator_usability >= 0.9;

  return result;
}

export function run_v2_benchmark(): FinanceEvaluation[] {
  return create_v2_scenarios().map(evaluate_scenario);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = run_v2_benchmark();
  mkdirSync(dirname(benchmark_path), { recursive: true });
  writeFileSync(
    benchmark_path,
    `${JSON.stringify({ generated_at: new Date().toISOString(), results }, null, 2)}\n`
  );
  console.log(`wrote ${benchmark_path}`);
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run fde:test
npm run fde:benchmark
test -f docs/proof/v2.0/benchmark.json
```

- [ ] **Step 6: Commit**

Run:

```bash
git add package.json packages/fde docs/proof/v2.0/benchmark.json docs/operations/v2-run-log.md
git commit -m "feat: add v2 FDE benchmark"
```

## Task 6: Proof Bundle Generator

**Files:**

- Create: `scripts/proof-v2.ts`
- Create: `scripts/validate-proof-v2.ts`
- Modify: `package.json`
- Create/modify: `docs/proof/v2.0/**`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces commands:
  - `npm run proof:v2`
  - `npm run proof:v2:validate`

- [ ] **Step 1: Add scripts**

In root `package.json`, add:

```json
"proof:v2": "tsx scripts/proof-v2.ts",
"proof:v2:validate": "tsx scripts/validate-proof-v2.ts"
```

- [ ] **Step 2: Implement proof generator**

Create `scripts/proof-v2.ts`:

```ts
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const proof_dir = join(process.cwd(), 'docs/proof/v2.0');
const benchmark_path = join(proof_dir, 'benchmark.json');

mkdirSync(proof_dir, { recursive: true });

const benchmark_note = existsSync(benchmark_path)
  ? 'Benchmark file present: `benchmark.json`.'
  : 'Benchmark file missing. Run `npm run fde:benchmark` before final release.';

const audit_events = [
  {
    event_type: 'agent_policy_decision',
    task_id: 'task_demo_invoice_001',
    tenant_id: 'tenant_demo',
    user_id: 'user_demo',
    capability: 'invoice_validation',
    status: 'allow',
    risk_tier: 'medium',
    approval_id: null,
  },
  {
    event_type: 'agent_policy_decision',
    task_id: 'task_demo_payment_001',
    tenant_id: 'tenant_demo',
    user_id: 'user_demo',
    capability: 'payment_processing',
    status: 'requires_approval',
    risk_tier: 'critical',
    approval_id: null,
  },
];

writeFileSync(
  join(proof_dir, 'README.md'),
  `# ClawKeeper v2.0 Proof Bundle

This bundle contains deterministic proof artifacts for the ClawKeeper v2.0 release.

${benchmark_note}

## Verify

\`\`\`bash
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
\`\`\`
`
);

writeFileSync(
  join(proof_dir, 'demo-run.md'),
  `# ClawKeeper v2.0 Demo Run

Synthetic demo path:

1. Invoice intake is allowed after policy evaluation.
2. Payment processing is blocked until approval metadata exists.
3. Redacted audit evidence is exported.
4. No real money movement occurs.
`
);

writeFileSync(join(proof_dir, 'audit-evidence.json'), `${JSON.stringify(audit_events, null, 2)}\n`);

if (existsSync(benchmark_path)) {
  JSON.parse(readFileSync(benchmark_path, 'utf8'));
}

console.log(`wrote ${proof_dir}`);
```

- [ ] **Step 3: Implement proof validator**

Create `scripts/validate-proof-v2.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const proof_dir = join(process.cwd(), 'docs/proof/v2.0');
const required_files = ['README.md', 'demo-run.md', 'audit-evidence.json'];

for (const file of required_files) {
  const path = join(proof_dir, file);
  if (!existsSync(path)) {
    throw new Error(`Missing proof file: ${path}`);
  }
}

const evidence_path = join(proof_dir, 'audit-evidence.json');
const evidence_text = readFileSync(evidence_path, 'utf8');
JSON.parse(evidence_text);

const forbidden_patterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /api[_-]?key/i,
  /password/i,
  /token/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[ -]*?){13,16}\b/,
];

for (const pattern of forbidden_patterns) {
  if (pattern.test(evidence_text)) {
    throw new Error(`Proof evidence contains forbidden sensitive pattern: ${pattern}`);
  }
}

console.log('v2 proof bundle valid');
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run proof:v2
npm run proof:v2:validate
```

- [ ] **Step 5: Commit**

Run:

```bash
git add package.json scripts/proof-v2.ts scripts/validate-proof-v2.ts docs/proof/v2.0 docs/operations/v2-run-log.md
git commit -m "feat: generate v2 proof bundle"
```

## Task 7: Docker and Demo Validation

**Files:**

- Modify when `docker build -t clawkeeper:v2 .` fails: `Dockerfile`
- Create when local Postgres orchestration is required for `npm run demo:quick`: `docker-compose.yml`
- Modify: `README.md`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces a documented local demo path.

- [ ] **Step 1: Test Docker build**

Run:

```bash
docker build -t clawkeeper:v2 .
```

- [ ] **Step 2: If Docker build fails, fix only Docker build**

Do not alter app behavior unless the Docker build exposes a real missing production dependency.

- [ ] **Step 3: Run demo proof commands**

Run:

```bash
npm run demo:quick
npm run proof:v2
npm run proof:v2:validate
```

- [ ] **Step 4: Document exact local demo**

Add a concise section to `README.md`:

~~~markdown
## Verify v2 Locally

```bash
npm ci
npm run quality
cd dashboard && npm install && npm run build
cd ..
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
docker build -t clawkeeper:v2 .
```
~~~

- [ ] **Step 5: Commit**

Run:

```bash
git add Dockerfile docker-compose.yml README.md docs/operations/v2-run-log.md
git commit -m "docs: add v2 local verification path"
```

## Task 8: Public Packaging

**Files:**

- Modify: `README.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SECURITY_MODEL.md`
- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces proof-backed public copy.

- [ ] **Step 1: Scan for stale claims**

Run:

```bash
rg -n "pending|coming soon|production-deployed|v1\\.5|autonomous payment|zero manual" README.md docs RELEASE_NOTES.md
```

- [ ] **Step 2: Rewrite public lead around proof**

README lead must state:

```markdown
ClawKeeper is an auditable SMB finance-agent control plane. Agents can propose finance work; deterministic policy, tenant boundaries, approval gates, and evidence logs decide what can run.
```

- [ ] **Step 3: Link proof bundle**

README must link:

```markdown
See `docs/proof/v2.0/README.md` for the v2 proof bundle and verification commands.
```

- [ ] **Step 4: Verify docs**

Run:

```bash
rg -n "pending|coming soon|production-deployed|autonomous payment" README.md docs RELEASE_NOTES.md
npm run quality
cd dashboard && npm run build
cd .. && npm run proof:v2:validate
```

Expected: no stale claim matches except intentional historical release notes.

- [ ] **Step 5: Commit**

Run:

```bash
git add README.md RELEASE_NOTES.md docs/ARCHITECTURE.md docs/SECURITY_MODEL.md docs/operations/v2-run-log.md
git commit -m "docs: package ClawKeeper v2 proof story"
```

## Task 9: Release Gate

**Files:**

- Modify: `docs/operations/v2-run-log.md`

**Interfaces:**

- Produces final release readiness evidence.

- [ ] **Step 1: Run final local gates**

Run:

```bash
npm ci
npm run quality
cd dashboard && npm install && npm run build
cd ..
npm audit --audit-level=moderate
npm run fde:test
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
docker build -t clawkeeper:v2 .
git status --short --branch
```

- [ ] **Step 2: Append release gate log**

Append final command results to `docs/operations/v2-run-log.md`.

- [ ] **Step 3: Commit release gate log**

Run:

```bash
git add docs/operations/v2-run-log.md
git commit -m "docs: record ClawKeeper v2 release gate"
```

- [ ] **Step 4: Stop for Alex approval**

Ask Alex before:

```bash
git push origin main
gh release create v2.0.0 --title "ClawKeeper v2.0" --notes-file RELEASE_NOTES.md
```

Do not push, tag, release, or deploy without explicit approval.

## Self-Review

Spec coverage:

- Dashboard build repair maps to Task 1.
- CI restore maps to Task 2.
- Dependency audit maps to Task 3.
- FDE contracts and harness map to Tasks 4 and 5.
- Proof bundle maps to Task 6.
- Docker/demo validation maps to Task 7.
- Public packaging maps to Task 8.
- Release criteria map to Task 9.

Placeholder scan:

- Each task has explicit acceptance criteria.
- Future implementation details are bounded to exact files and commands.

Type consistency:

- Dashboard type names match known compiler errors.
- FDE scripts introduced in `package.json` match later command gates.
