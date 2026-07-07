import test from 'node:test';
import assert from 'node:assert/strict';
import { fde_scenarios } from '../../packages/fde/src/fixtures';
import {
  detect_plateau,
  generate_scenario_output,
  plan_scenario,
  run_benchmark,
} from '../../packages/fde/src/harness';

test('planner maps every scenario to a single deterministic finance-agent step', () => {
  for (const scenario of fde_scenarios) {
    const plan = plan_scenario(scenario);

    assert.equal(plan.scenario_id, scenario.id);
    assert.equal(plan.steps.length, 1);
    assert.deepEqual(plan.steps[0].required_capabilities, scenario.expected_capabilities);
    assert.deepEqual(
      plan.steps[0].expected_evidence_ids,
      scenario.required_evidence.map((item) => item.id),
    );
  }
});

test('generator respects approval gates and does not execute forbidden payment actions', () => {
  const payment = fde_scenarios.find((scenario) => scenario.domain === 'approval_gated_payment');
  assert.ok(payment);

  const generation = generate_scenario_output(payment, plan_scenario(payment));

  assert.equal(generation.policy_decision, 'requires_approval');
  assert.ok(generation.proposed_actions.includes('create_approval_request'));
  assert.equal(generation.proposed_actions.includes('execute_payment'), false);
  assert.equal(generation.proposed_actions.includes('external_writeback'), false);
});

test('benchmark passes all deterministic v2 FDE scenarios', () => {
  const benchmark = run_benchmark(fde_scenarios, '2026-07-07T00:00:00.000Z');

  assert.equal(benchmark.scenarios_total, 4);
  assert.equal(benchmark.scenarios_passed, 4);
  assert.equal(benchmark.average_score, 1);
  assert.equal(benchmark.results.every((result) => result.evaluation.passed), true);
});

test('plateau detection reports identical scenario averages', () => {
  const benchmark = run_benchmark(fde_scenarios, '2026-07-07T00:00:00.000Z');

  assert.equal(detect_plateau(benchmark.results), true);
});
