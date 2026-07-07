import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fde_scenarios } from '../packages/fde/src/fixtures';
import { run_benchmark, type FdeBenchmarkSummary } from '../packages/fde/src/harness';

const proof_dir = resolve('docs/proof/v2.0');
const benchmark_path = resolve(proof_dir, 'benchmark.json');
const audit_path = resolve(proof_dir, 'audit-evidence.json');
const demo_path = resolve(proof_dir, 'demo-run.md');
const readme_path = resolve(proof_dir, 'README.md');

function read_existing_benchmark(): FdeBenchmarkSummary {
  try {
    return JSON.parse(readFileSync('packages/fde/benchmark/benchmark.json', 'utf8')) as FdeBenchmarkSummary;
  } catch {
    return run_benchmark(fde_scenarios, '2026-07-07T00:00:00.000Z');
  }
}

function build_audit_evidence(benchmark: FdeBenchmarkSummary) {
  return {
    version: benchmark.version,
    generated_at: benchmark.generated_at,
    redaction: {
      synthetic_only: true,
      contains_real_customer_data: false,
      secrets_included: false,
    },
    events: benchmark.results.flatMap((result) => [
      {
        event_type: 'agent_policy_decision',
        scenario_id: result.scenario_id,
        decision: result.generation.policy_decision,
        tenant_id: '[REDACTED_TENANT]',
        user_id: '[REDACTED_USER]',
        evidence_ids: result.generation.produced_evidence_ids,
      },
      {
        event_type: 'fde_evaluation_completed',
        scenario_id: result.scenario_id,
        passed: result.evaluation.passed,
        scores: result.evaluation.scores,
      },
    ]),
  };
}

function build_demo_run(benchmark: FdeBenchmarkSummary): string {
  const rows = benchmark.results
    .map((result) => `| ${result.scenario_id} | ${result.generation.policy_decision} | ${result.evaluation.passed ? 'pass' : 'fail'} |`)
    .join('\n');

  return `# ClawKeeper v2.0 Demo Run

Generated: ${benchmark.generated_at}

This is an offline deterministic proof run. It uses synthetic finance scenarios and does not call live providers or move money.

## Command

\`\`\`bash
npm run proof:v2
npm run proof:v2:validate
\`\`\`

## Result

- Scenarios: ${benchmark.scenarios_passed}/${benchmark.scenarios_total} passed
- Average score: ${benchmark.average_score}
- Plateau detected: ${benchmark.plateau_detected}

| Scenario | Policy decision | Evaluation |
|---|---:|---:|
${rows}
`;
}

function build_readme(benchmark: FdeBenchmarkSummary): string {
  return `# ClawKeeper v2.0 Proof Bundle

This bundle is generated from deterministic offline FDE scenarios.

## What This Proves

- FDE benchmark contracts are executable.
- Finance-agent scenarios are policy-gated.
- Approval-gated payment intent does not execute payment actions.
- Audit evidence is redacted and synthetic.

## Verification

\`\`\`bash
npm run fde:contracts
npm run fde:benchmark
npm run proof:v2
npm run proof:v2:validate
\`\`\`

## Current Result

- Scenarios passed: ${benchmark.scenarios_passed}/${benchmark.scenarios_total}
- Average score: ${benchmark.average_score}
- Generated at: ${benchmark.generated_at}

## Files

- \`benchmark.json\`: deterministic FDE benchmark output.
- \`demo-run.md\`: summarized one-command demo proof.
- \`audit-evidence.json\`: redacted synthetic audit events.

## Limits

- This is not a live payment proof.
- This does not write to Plaid, Stripe, QuickBooks, or Xero.
- Docker validation is tracked separately because the local Zo shell does not expose Docker.
`;
}

const benchmark = read_existing_benchmark();
mkdirSync(proof_dir, { recursive: true });

writeFileSync(benchmark_path, `${JSON.stringify(benchmark, null, 2)}\n`);
writeFileSync(audit_path, `${JSON.stringify(build_audit_evidence(benchmark), null, 2)}\n`);
writeFileSync(demo_path, build_demo_run(benchmark));
writeFileSync(readme_path, build_readme(benchmark));

console.log(JSON.stringify({
  proof_dir,
  files: [readme_path, benchmark_path, demo_path, audit_path],
  scenarios_passed: benchmark.scenarios_passed,
  scenarios_total: benchmark.scenarios_total,
}, null, 2));
