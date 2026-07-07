import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fde_scenarios } from '../packages/fde/src/fixtures';
import { run_benchmark } from '../packages/fde/src/harness';

const output_path = resolve('packages/fde/benchmark/benchmark.json');
const benchmark = run_benchmark(fde_scenarios, '2026-07-07T00:00:00.000Z');

mkdirSync(dirname(output_path), { recursive: true });
writeFileSync(output_path, `${JSON.stringify(benchmark, null, 2)}\n`);

console.log(JSON.stringify({
  output_path,
  scenarios_total: benchmark.scenarios_total,
  scenarios_passed: benchmark.scenarios_passed,
  average_score: benchmark.average_score,
}, null, 2));
