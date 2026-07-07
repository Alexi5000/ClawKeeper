import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const proof_dir = resolve('docs/proof/v2.0');
const required_files = ['README.md', 'benchmark.json', 'demo-run.md', 'audit-evidence.json'];
const secret_patterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]{16,}/i,
  /postgres(?:ql)?:\/\/[^@\s]+:[^@\s]+@/i,
  /api[_-]?key["'\s:=]+[A-Za-z0-9._-]{16,}/i,
];

for (const file of required_files) {
  const path = resolve(proof_dir, file);
  if (!existsSync(path)) {
    throw new Error(`Missing proof file: ${path}`);
  }

  const content = readFileSync(path, 'utf8');
  for (const pattern of secret_patterns) {
    if (pattern.test(content)) {
      throw new Error(`Potential secret found in ${file}`);
    }
  }
}

const benchmark = JSON.parse(readFileSync(resolve(proof_dir, 'benchmark.json'), 'utf8'));
if (benchmark.scenarios_total !== 4 || benchmark.scenarios_passed !== 4 || benchmark.average_score !== 1) {
  throw new Error('Benchmark proof does not show 4/4 passing scenarios with average score 1');
}

const audit = JSON.parse(readFileSync(resolve(proof_dir, 'audit-evidence.json'), 'utf8'));
if (audit.redaction?.synthetic_only !== true || audit.redaction?.secrets_included !== false) {
  throw new Error('Audit evidence redaction metadata is invalid');
}

for (const event of audit.events ?? []) {
  if (event.tenant_id && event.tenant_id !== '[REDACTED_TENANT]') {
    throw new Error(`Unredacted tenant id in audit event for ${event.scenario_id}`);
  }
  if (event.user_id && event.user_id !== '[REDACTED_USER]') {
    throw new Error(`Unredacted user id in audit event for ${event.scenario_id}`);
  }
}

console.log(JSON.stringify({
  proof_dir,
  required_files,
  benchmark: {
    scenarios_total: benchmark.scenarios_total,
    scenarios_passed: benchmark.scenarios_passed,
    average_score: benchmark.average_score,
  },
}, null, 2));
