// file: test/openclaw.manifest.test.ts
// description: Contract tests for ClawKeeper v2.0 OpenClaw manifest and runtime adapter

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAWKEEPER_OPENCLAW_MANIFEST,
  get_capability_policy,
  get_openclaw_agent_definition,
  OpenClawRuntimeAdapter,
} from '../src/openclaw';

test('declares ClawKeeper as an OpenClaw-native v2.0 finance agent application', () => {
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.app_id, 'clawkeeper');
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.version, '2.0.0');
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.runtime.provider, 'openclaw');
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.runtime.trust_model, 'tenant-scoped-financial-operator');
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.audit.required, true);
  assert.equal(CLAWKEEPER_OPENCLAW_MANIFEST.audit.redact_pii, true);
});

test('registers a CEO agent and finance-domain orchestrators with OpenClaw runtime metadata', () => {
  const ceo = get_openclaw_agent_definition('clawkeeper');
  const payable_lead = get_openclaw_agent_definition('accounts_payable_lead');
  const integration_lead = get_openclaw_agent_definition('integration_lead');

  assert.equal(ceo?.role, 'ceo');
  assert.equal(ceo?.runtime, 'openclaw-gateway');
  assert.equal(payable_lead?.sandbox, 'human-approved');
  assert.ok(payable_lead?.capabilities.includes('invoice_approval'));
  assert.ok(integration_lead?.capabilities.includes('payment_gateway_integration'));
});

test('marks money movement and books-of-record changes as high-risk or critical', () => {
  const payment_policy = get_capability_policy('payment_processing');
  const accounting_policy = get_capability_policy('accounting_sync');
  const reporting_policy = get_capability_policy('report_generation');

  assert.equal(payment_policy.risk_tier, 'critical');
  assert.equal(payment_policy.requires_approval, true);
  assert.equal(accounting_policy.risk_tier, 'high');
  assert.equal(accounting_policy.requires_approval, true);
  assert.equal(reporting_policy.risk_tier, 'low');
  assert.equal(reporting_policy.requires_approval, false);
});

test('runtime adapter reports gateway configuration and manifest health', () => {
  const degraded = new OpenClawRuntimeAdapter(undefined).health();
  const ready = new OpenClawRuntimeAdapter('https://openclaw.example.test').health();

  assert.equal(degraded.status, 'degraded');
  assert.equal(degraded.gateway_url_configured, false);
  assert.equal(degraded.manifest_version, '2.0.0');
  assert.ok(degraded.registered_agents >= 10);

  assert.equal(ready.status, 'ready');
  assert.equal(ready.gateway_url_configured, true);
});
