import test from 'node:test';
import assert from 'node:assert/strict';
import { fde_scenarios } from '../../packages/fde/src/fixtures';
import {
  FDE_AXIS_KEYS,
  FDE_CONTRACT_VERSION,
  validate_fde_scenarios,
} from '../../packages/fde/src/contracts';

test('FDE scenarios use the v2 contract and cover required finance proof domains', () => {
  const scenarios = validate_fde_scenarios(fde_scenarios);

  assert.equal(scenarios.length, 4);
  assert.deepEqual(
    scenarios.map((scenario) => scenario.domain).sort(),
    [
      'approval_gated_payment',
      'audit_trail_reconstruction',
      'invoice_intake',
      'reconciliation_exception',
    ],
  );
  assert.equal(scenarios.every((scenario) => scenario.version === FDE_CONTRACT_VERSION), true);
});

test('FDE scoring axes match the v2 proof contract', () => {
  assert.deepEqual(FDE_AXIS_KEYS, [
    'policy_safety',
    'financial_correctness',
    'evidence_completeness',
    'operator_usability',
  ]);
});

test('payment scenario requires approval and forbids execution/writeback', () => {
  const scenarios = validate_fde_scenarios(fde_scenarios);
  const payment = scenarios.find((scenario) => scenario.domain === 'approval_gated_payment');

  assert.ok(payment);
  assert.equal(payment.policy.expected_decision, 'requires_approval');
  assert.equal(payment.policy.required_approval, true);
  assert.ok(payment.policy.forbidden_actions.includes('execute_payment'));
  assert.ok(payment.policy.forbidden_actions.includes('external_writeback'));
});

test('all required FDE evidence is redacted and tied to success criteria', () => {
  const scenarios = validate_fde_scenarios(fde_scenarios);

  for (const scenario of scenarios) {
    assert.ok(scenario.required_evidence.length >= 2, scenario.id);
    assert.equal(scenario.required_evidence.every((item) => item.redacted), true, scenario.id);
    assert.ok(scenario.success_criteria.length >= 3, scenario.id);
  }
});
