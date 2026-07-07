# ClawKeeper v2.0 Agent Build Loop

Date: 2026-07-07
Owner: Alex Cinovoj / TechTide AI
Source spec: `docs/superpowers/specs/2026-07-07-clawkeeper-v2-design.md`
Plan: `docs/superpowers/plans/2026-07-07-clawkeeper-v2-build-loop.md`
Run log: `docs/operations/v2-run-log.md`

## Operating Rule

Build v2.0 one completed step at a time.

No agent starts the next step until the current step has:

1. A scoped branch-local diff.
2. The task-specific verification command passing.
3. A committed checkpoint.
4. A run-log entry with evidence, risks, and next action.
5. Alex approval when the step requires push, PR, deploy, release, secrets, or destructive cleanup.

## Active Engineering Agents

Only the active v1 software-delivery agents are allowed in this loop.

| Agent | Loop Role | Allowed Work | Stop Before |
|---|---|---|---|
| Noble Actual | Operator / release owner | Own v2 scope, approve task order, summarize status, request Alex approvals. | Push, PR, merge, release, production deploy. |
| Carter | Foreman | Break v2 into steps, assign the next active agent, keep tasks small. | Scope expansion, dependency major upgrades, branch strategy changes. |
| Jun | Scout | Read-only repo scan, competitor pattern scan, risk notes before each task. | File edits. |
| Noble Six | Builder | Implement the current approved task only. | Push, PR, deploy, destructive commands, broad refactors. |
| Kat | Reviewer | Review diff, check claims, find regressions, request focused fixes. | Merge, deploy, source edits unless assigned. |
| Emile | QA | Run tests, builds, audits, Docker checks, proof validation. | Paid/live provider tests unless approved. |
| Cortana | Memory / docs | Update run log, proof docs, release docs, agent handoff notes. | Source code edits outside docs unless assigned. |

Inactive agents remain inactive for v2 unless Alex explicitly changes the policy:

- Buck
- Halsey
- Arbiter

## Loop Cycle

Every step follows the same cycle:

1. **Intake**
   - Carter states the exact current step.
   - Jun reads only the relevant files.
   - Noble Actual confirms the acceptance gate.

2. **Plan**
   - Carter lists files expected to change.
   - Kat names the likely regression risks.
   - Emile names the exact verification command.

3. **Build**
   - Noble Six makes the smallest working diff.
   - No unrelated cleanup.
   - No public claim changes until proof exists.

4. **Verify**
   - Emile runs the task gate.
   - If it fails, Noble Six fixes only that failure.
   - After two failed attempts on the same class of issue, Carter narrows scope or parks the sub-issue.

5. **Review**
   - Kat reviews the diff as a code review.
   - Cortana checks docs/run-log consistency.

6. **Commit**
   - Commit only the intended files.
   - Commit message format: `<type>: <small v2 task>`.

7. **Log**
   - Cortana appends to `docs/operations/v2-run-log.md`.
   - Include command evidence and unresolved risks.

8. **Gate**
   - If the next action is push, PR, merge, deploy, release, secret use, or public publication, Noble Actual asks Alex first.

## v2 Step Order

### Step 0: Baseline Lock

Goal: Confirm the repo starts from a known state.

Acceptance:

- `git status --short --branch` is clean except approved docs commits.
- Current baseline commands are recorded.
- Known blockers are written into the run log.

Commands:

```bash
git status --short --branch
npm run quality
cd dashboard && npm install && npm run build
npm audit --audit-level=moderate
```

Expected current state:

- Backend quality passes.
- Dashboard build fails.
- Root audit reports known vulnerabilities.
- No GitHub workflows exist on `main`.

### Step 1: Dashboard Build Repair

Goal: Make the visible app compile.

Acceptance:

```bash
cd dashboard && npm run build
```

must pass.

Scope:

- Restore missing orchestration exported types.
- Restore missing API client methods used by agent pages.
- Fix reconciliation page typing.
- Remove unused imports.

Do not redesign UI in this step.

### Step 2: CI Restore

Goal: Recreate public quality proof on GitHub.

Acceptance:

- `.github/workflows/ci.yml` exists.
- Workflow runs backend quality, dashboard build, dependency audit, Docker build, and FDE gates when available.
- Local equivalent commands pass before push.

Initial local gate:

```bash
npm run quality
cd dashboard && npm run build
npm audit --audit-level=moderate
docker build -t clawkeeper:v2-ci .
```

### Step 3: Dependency Security Cleanup

Goal: Remove or explicitly handle known dependency audit findings.

Acceptance:

```bash
npm audit --audit-level=moderate
```

passes, or `docs/security/v2-audit-waivers.md` documents any accepted risk with package, severity, reason, and revisit date.

Rules:

- Prefer patch/minor upgrades.
- Avoid major upgrades unless the vulnerability requires it.
- Re-run backend tests after any dependency change.

### Step 4: FDE Contract Package

Goal: Add a small deterministic v2 proof package.

Acceptance:

```bash
npm run fde:contracts
npm run fde:test
```

must pass.

Scope:

- Create typed versioned finance-agent contracts.
- Add deterministic scenario fixtures.
- Keep offline by default.

### Step 5: Planner -> Generator -> Evaluator Harness

Goal: Make the FDE loop executable.

Acceptance:

```bash
npm run fde:benchmark
```

produces a benchmark JSON file with four-axis scores:

- policy safety
- financial correctness
- evidence completeness
- operator usability

### Step 6: Proof Bundle Generator

Goal: Generate inspectable v2 proof artifacts.

Acceptance:

```bash
npm run proof:v2
npm run proof:v2:validate
```

must generate and validate:

- `docs/proof/v2.0/README.md`
- `docs/proof/v2.0/benchmark.json`
- `docs/proof/v2.0/demo-run.md`
- `docs/proof/v2.0/audit-evidence.json`

### Step 7: Docker and Demo Validation

Goal: Make the repo runnable as a client demo.

Acceptance:

```bash
docker build -t clawkeeper:v2 .
npm run demo:quick
npm run proof:v2:validate
```

If local Postgres is required, add a Docker Compose file and document the exact command.

### Step 8: Public Packaging

Goal: Package the proof clearly for GitHub without overclaiming.

Acceptance:

- README points to proof bundle.
- Release notes describe v2 proof and limits.
- Badges match real workflows.
- Production claims are backed by commands/artifacts.
- No stale v1.5-only positioning remains.

Verification:

```bash
rg -n "pending|coming soon|production-deployed|v1\\.5" README.md docs RELEASE_NOTES.md
npm run quality
cd dashboard && npm run build
npm run proof:v2:validate
```

### Step 9: v2 Release Gate

Goal: Finish v2 only when the repo is actually ready.

Acceptance:

- `main` is clean.
- No open PRs.
- Only intended branches exist.
- GitHub CI is green.
- Local gates match CI gates.
- v2 tag and release notes point at the final commit.

Human approval required before:

- pushing final branch
- opening PR
- merging
- tagging
- publishing GitHub release
- deploying public demo

## Failure Policy

If a step fails:

1. Capture the exact command and error.
2. Classify the failure:
   - setup
   - typing/build
   - test assertion
   - dependency/security
   - Docker/runtime
   - proof artifact
   - documentation mismatch
3. Fix only that class of failure.
4. Re-run the narrow gate.
5. Re-run the step gate.

If the same failure class repeats twice, Carter must either narrow the task or mark the blocker in the run log before continuing.

## Public Claim Rule

No public claim may be added unless it maps to a proof surface:

| Claim Type | Required Evidence |
|---|---|
| Builds | CI workflow run and local command |
| Secure / policy-gated | policy tests and audit evidence |
| Demo-ready | one-command demo run |
| Docker-ready | Docker build gate |
| Finance correctness | FDE benchmark scenario |
| Audit-ready | redacted proof artifact |
| Production-ready | all release criteria green |

## Completion Definition

v2.0 is fully built only when Step 9 is complete and Alex has approved the final release action.
