import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgentProfile, AuditEntry, FinancialReport, LedgerFlowNode, Tenant } from '../src/core/types.js';

const payload = { count: 42, nested: { enabled: true }, list: [1, 'two'], empty: null };

for (const [name, schema] of Object.entries({
  settings: Tenant.shape.settings,
  report: FinancialReport.shape.data,
  changes: AuditEntry.shape.changes,
  metadata: AgentProfile.shape.metadata,
  input: LedgerFlowNode.shape.input,
  output: LedgerFlowNode.shape.output,
  parameters: LedgerFlowNode.shape.parameters,
})) {
  test(`${name} retains arbitrary string-keyed JSON values`, () => {
    assert.deepEqual(schema.parse(payload), payload);
    assert.equal(schema.safeParse(['invalid']).success, false);
  });
}

test('nullable and optional domain payloads retain their contracts', () => {
  assert.equal(AuditEntry.shape.changes.parse(null), null);
  assert.equal(LedgerFlowNode.shape.output.parse(null), null);
  assert.equal(AgentProfile.shape.metadata.parse(undefined), undefined);
  assert.equal(LedgerFlowNode.shape.parameters.parse(undefined), undefined);
  assert.equal(Tenant.shape.settings.safeParse(undefined).success, false);
  assert.equal(FinancialReport.shape.data.safeParse(null).success, false);
  assert.equal(LedgerFlowNode.shape.input.safeParse(null).success, false);
});
