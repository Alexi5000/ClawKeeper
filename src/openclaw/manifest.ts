// file: src/openclaw/manifest.ts
// description: OpenClaw-native ClawKeeper application manifest for agent runtime and policy enforcement
// reference: OpenClaw gateway, approval, sandboxing, and agent documentation patterns

import type { LedgerCapability, LedgerAgentId } from '../core/types';

export type OpenClawRiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface OpenClawCapabilityPolicy {
  capability: LedgerCapability;
  risk_tier: OpenClawRiskTier;
  requires_approval: boolean;
  approval_reason: string | null;
  max_autonomous_amount_cents: number | null;
  allowed_roles: string[];
}

export interface OpenClawAgentDefinition {
  id: LedgerAgentId | string;
  name: string;
  role: 'ceo' | 'orchestrator' | 'worker';
  domain: string;
  parent_id: string | null;
  capabilities: LedgerCapability[];
  runtime: 'openclaw-gateway';
  sandbox: 'network-restricted' | 'tool-policy' | 'human-approved';
}

export interface ClawKeeperOpenClawManifest {
  app_id: 'clawkeeper';
  version: '2.0.0';
  name: 'ClawKeeper';
  description: string;
  runtime: {
    provider: 'openclaw';
    gateway_env: 'OPENCLAW_GATEWAY_URL';
    mode: 'thin-orchestration-backend';
    trust_model: 'tenant-scoped-financial-operator';
  };
  agents: OpenClawAgentDefinition[];
  capability_policies: OpenClawCapabilityPolicy[];
  audit: {
    required: true;
    redact_pii: true;
    event_stream: string;
  };
}

const FINANCE_CAPABILITY_POLICIES: OpenClawCapabilityPolicy[] = [
  {
    capability: 'payment_processing',
    risk_tier: 'critical',
    requires_approval: true,
    approval_reason: 'Moving money or marking invoices paid requires explicit human approval.',
    max_autonomous_amount_cents: 0,
    allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
  },
  {
    capability: 'payment_gateway_integration',
    risk_tier: 'critical',
    requires_approval: true,
    approval_reason: 'Payment gateway operations can initiate or mutate financial transactions.',
    max_autonomous_amount_cents: 0,
    allowed_roles: ['tenant_admin', 'super_admin'],
  },
  {
    capability: 'accounting_sync',
    risk_tier: 'high',
    requires_approval: true,
    approval_reason: 'Accounting system writes can alter books of record.',
    max_autonomous_amount_cents: null,
    allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
  },
  {
    capability: 'bank_sync',
    risk_tier: 'high',
    requires_approval: true,
    approval_reason: 'Bank sync reads sensitive financial accounts and must be tenant-authorized.',
    max_autonomous_amount_cents: null,
    allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
  },
  {
    capability: 'invoice_approval',
    risk_tier: 'high',
    requires_approval: true,
    approval_reason: 'Approving invoices can create downstream payment obligations.',
    max_autonomous_amount_cents: 25000,
    allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
  },
  {
    capability: 'policy_enforcement',
    risk_tier: 'medium',
    requires_approval: false,
    approval_reason: null,
    max_autonomous_amount_cents: null,
    allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
  },
  {
    capability: 'report_generation',
    risk_tier: 'low',
    requires_approval: false,
    approval_reason: null,
    max_autonomous_amount_cents: null,
    allowed_roles: ['tenant_admin', 'accountant', 'viewer', 'super_admin'],
  },
];

const DEFAULT_POLICY: Omit<OpenClawCapabilityPolicy, 'capability'> = {
  risk_tier: 'medium',
  requires_approval: false,
  approval_reason: null,
  max_autonomous_amount_cents: null,
  allowed_roles: ['tenant_admin', 'accountant', 'super_admin'],
};

const ORCHESTRATOR_AGENTS: OpenClawAgentDefinition[] = [
  {
    id: 'clawkeeper',
    name: 'ClawKeeper CEO Agent',
    role: 'ceo',
    domain: 'finance-operations',
    parent_id: null,
    capabilities: ['invoice_parsing', 'invoice_validation', 'transaction_matching', 'report_generation', 'tax_compliance_check', 'payment_processing', 'bank_sync', 'accounting_sync', 'data_import', 'user_assistance'],
    runtime: 'openclaw-gateway',
    sandbox: 'human-approved',
  },
  {
    id: 'cfo',
    name: 'CFO Orchestrator',
    role: 'orchestrator',
    domain: 'strategy-cashflow-reporting',
    parent_id: 'clawkeeper',
    capabilities: ['forecasting', 'report_analysis', 'report_generation'],
    runtime: 'openclaw-gateway',
    sandbox: 'tool-policy',
  },
  {
    id: 'accounts_payable_lead',
    name: 'Accounts Payable Lead',
    role: 'orchestrator',
    domain: 'payables',
    parent_id: 'clawkeeper',
    capabilities: ['invoice_parsing', 'invoice_validation', 'invoice_categorization', 'invoice_approval', 'payment_processing'],
    runtime: 'openclaw-gateway',
    sandbox: 'human-approved',
  },
  {
    id: 'accounts_receivable_lead',
    name: 'Accounts Receivable Lead',
    role: 'orchestrator',
    domain: 'receivables',
    parent_id: 'clawkeeper',
    capabilities: ['invoice_parsing', 'invoice_validation', 'payment_processing'],
    runtime: 'openclaw-gateway',
    sandbox: 'human-approved',
  },
  {
    id: 'reconciliation_lead',
    name: 'Reconciliation Lead',
    role: 'orchestrator',
    domain: 'reconciliation',
    parent_id: 'clawkeeper',
    capabilities: ['transaction_matching', 'discrepancy_detection', 'discrepancy_resolution'],
    runtime: 'openclaw-gateway',
    sandbox: 'tool-policy',
  },
  {
    id: 'compliance_lead',
    name: 'Compliance Lead',
    role: 'orchestrator',
    domain: 'compliance-audit',
    parent_id: 'clawkeeper',
    capabilities: ['tax_compliance_check', 'audit_preparation', 'policy_enforcement'],
    runtime: 'openclaw-gateway',
    sandbox: 'tool-policy',
  },
  {
    id: 'reporting_lead',
    name: 'Reporting Lead',
    role: 'orchestrator',
    domain: 'financial-reporting',
    parent_id: 'clawkeeper',
    capabilities: ['report_generation', 'report_analysis'],
    runtime: 'openclaw-gateway',
    sandbox: 'network-restricted',
  },
  {
    id: 'integration_lead',
    name: 'Integration Lead',
    role: 'orchestrator',
    domain: 'external-systems',
    parent_id: 'clawkeeper',
    capabilities: ['bank_sync', 'accounting_sync', 'payment_gateway_integration'],
    runtime: 'openclaw-gateway',
    sandbox: 'human-approved',
  },
  {
    id: 'data_etl_lead',
    name: 'Data ETL Lead',
    role: 'orchestrator',
    domain: 'data-ingestion',
    parent_id: 'clawkeeper',
    capabilities: ['data_import', 'data_transformation', 'data_validation'],
    runtime: 'openclaw-gateway',
    sandbox: 'network-restricted',
  },
  {
    id: 'support_lead',
    name: 'Support Lead',
    role: 'orchestrator',
    domain: 'support-operations',
    parent_id: 'clawkeeper',
    capabilities: ['user_assistance', 'error_recovery', 'escalation_handling'],
    runtime: 'openclaw-gateway',
    sandbox: 'network-restricted',
  },
];

export const CLAWKEEPER_OPENCLAW_MANIFEST: ClawKeeperOpenClawManifest = {
  app_id: 'clawkeeper',
  version: '2.0.0',
  name: 'ClawKeeper',
  description: 'An OpenClaw-native autonomous finance operations arm for SMBs, coordinating payables, receivables, reconciliation, reporting, compliance, and integrations through tenant-scoped agents.',
  runtime: {
    provider: 'openclaw',
    gateway_env: 'OPENCLAW_GATEWAY_URL',
    mode: 'thin-orchestration-backend',
    trust_model: 'tenant-scoped-financial-operator',
  },
  agents: ORCHESTRATOR_AGENTS,
  capability_policies: FINANCE_CAPABILITY_POLICIES,
  audit: {
    required: true,
    redact_pii: true,
    event_stream: 'agent_policy_decisions',
  },
};

export function get_capability_policy(capability: LedgerCapability): OpenClawCapabilityPolicy {
  return FINANCE_CAPABILITY_POLICIES.find(policy => policy.capability === capability) ?? {
    capability,
    ...DEFAULT_POLICY,
  };
}

export function get_openclaw_agent_definition(agent_id: string): OpenClawAgentDefinition | undefined {
  return CLAWKEEPER_OPENCLAW_MANIFEST.agents.find(agent => agent.id === agent_id);
}
