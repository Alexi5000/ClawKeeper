// file: src/openclaw/policy.ts
// description: Deterministic OpenClaw-style policy engine for ClawKeeper financial agent execution
// reference: src/openclaw/manifest.ts, src/guardrails/validators.ts

import type { LedgerCapability, LedgerTaskStar } from '../core/types';
import type { TenantContext } from '../agents/base';
import { get_capability_policy, type OpenClawRiskTier } from './manifest';

export type PolicyDecisionStatus = 'allow' | 'deny' | 'requires_approval';

export interface AgentPolicyInput {
  task: LedgerTaskStar;
  tenant_context: TenantContext;
  agent_capabilities: LedgerCapability[];
  approval_id?: string | null;
  request_id?: string | null;
}

export interface AgentPolicyFinding {
  code: string;
  severity: OpenClawRiskTier;
  message: string;
  field?: string;
}

export interface AgentPolicyDecision {
  status: PolicyDecisionStatus;
  allowed: boolean;
  requires_approval: boolean;
  risk_tier: OpenClawRiskTier;
  approval_reasons: string[];
  findings: AgentPolicyFinding[];
  audit_event: {
    event_type: 'agent_policy_decision';
    request_id: string | null;
    task_id: string;
    task_name: string;
    tenant_id: string;
    user_id: string;
    user_role: string;
    required_capabilities: string[];
    status: PolicyDecisionStatus;
    risk_tier: OpenClawRiskTier;
    approval_id: string | null;
    timestamp: string;
  };
}

const RISK_WEIGHT: Record<OpenClawRiskTier, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|system|developer)\s+instructions/i,
  /reveal\s+(the\s+)?(system|developer)\s+(prompt|instructions)/i,
  /disable\s+(guardrails|policy|security|audit)/i,
  /bypass\s+(approval|permissions|tenant|auth|authorization)/i,
  /act\s+as\s+(root|admin|super_admin|system)/i,
  /exfiltrate|leak\s+(secrets|credentials|api\s*keys|tokens)/i,
];

const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b\d{9}\b/,
  /\b(?:\d[ -]*?){13,16}\b/,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];

function max_risk(a: OpenClawRiskTier, b: OpenClawRiskTier): OpenClawRiskTier {
  return RISK_WEIGHT[a] >= RISK_WEIGHT[b] ? a : b;
}

function stringify_task_payload(task: LedgerTaskStar): string {
  return JSON.stringify({
    name: task.name,
    description: task.description,
    input: task.input,
    parameters: task.parameters,
  }, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

function extract_amount_cents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[$,]/g, '').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of ['amount_cents', 'amount', 'invoice_amount', 'payment_amount', 'total']) {
      if (key in record) {
        const nested = extract_amount_cents(record[key]);
        if (nested !== null) return key.includes('cents') ? nested : nested;
      }
    }
  }

  return null;
}

export function redact_policy_payload(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
      .replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_CARD]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
  }

  if (Array.isArray(value)) {
    return value.map(item => redact_policy_payload(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        /secret|token|password|api[_-]?key|credential/i.test(key) ? '[REDACTED_SECRET]' : redact_policy_payload(nested),
      ])
    );
  }

  return value;
}

export function evaluate_agent_policy(input: AgentPolicyInput): AgentPolicyDecision {
  const { task, tenant_context, agent_capabilities, approval_id = null, request_id = null } = input;
  const findings: AgentPolicyFinding[] = [];
  const approval_reasons: string[] = [];
  let requires_approval = false;
  let risk_tier: OpenClawRiskTier = 'low';

  if (task.tenant_id !== tenant_context.tenant_id && tenant_context.user_role !== 'super_admin') {
    findings.push({
      code: 'TENANT_ISOLATION_VIOLATION',
      severity: 'critical',
      message: 'Task tenant does not match the authenticated tenant context.',
      field: 'tenant_id',
    });
    risk_tier = 'critical';
  }

  const missing_capabilities = task.required_capabilities.filter(
    capability => !agent_capabilities.includes(capability)
  );

  if (missing_capabilities.length > 0) {
    findings.push({
      code: 'CAPABILITY_NOT_GRANTED',
      severity: 'high',
      message: `Agent is missing required capabilities: ${missing_capabilities.join(', ')}`,
      field: 'required_capabilities',
    });
    risk_tier = max_risk(risk_tier, 'high');
  }

  for (const capability of task.required_capabilities) {
    const policy = get_capability_policy(capability);
    risk_tier = max_risk(risk_tier, policy.risk_tier);

    if (!policy.allowed_roles.includes(tenant_context.user_role)) {
      findings.push({
        code: 'ROLE_NOT_AUTHORIZED',
        severity: policy.risk_tier,
        message: `Role ${tenant_context.user_role} is not authorized for ${capability}.`,
        field: 'user_role',
      });
    }

    const amount_cents = extract_amount_cents(task.input) ?? extract_amount_cents(task.parameters);
    const exceeds_amount_boundary = policy.max_autonomous_amount_cents !== null
      && amount_cents !== null
      && amount_cents > policy.max_autonomous_amount_cents;

    if (policy.requires_approval || exceeds_amount_boundary) {
      requires_approval = true;
      approval_reasons.push(
        policy.approval_reason ?? `Capability ${capability} requires approval at this risk tier.`
      );
    }
  }

  const payload_text = stringify_task_payload(task);
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(payload_text)) {
      findings.push({
        code: 'PROMPT_INJECTION_DETECTED',
        severity: 'critical',
        message: 'Task input contains prompt-injection or guardrail-bypass instructions.',
        field: 'input',
      });
      risk_tier = 'critical';
      break;
    }
  }

  if (PII_PATTERNS.some(pattern => pattern.test(payload_text))) {
    findings.push({
      code: 'PII_PRESENT',
      severity: 'medium',
      message: 'Task input contains sensitive personal or financial identifiers; audit output must be redacted.',
      field: 'input',
    });
    risk_tier = max_risk(risk_tier, 'medium');
  }

  let status: PolicyDecisionStatus = 'allow';
  if (findings.some(finding => finding.severity === 'critical') || findings.some(finding => finding.code === 'CAPABILITY_NOT_GRANTED' || finding.code === 'ROLE_NOT_AUTHORIZED')) {
    status = 'deny';
  } else if (requires_approval && !approval_id) {
    status = 'requires_approval';
  }

  const decision: AgentPolicyDecision = {
    status,
    allowed: status === 'allow',
    requires_approval,
    risk_tier,
    approval_reasons: Array.from(new Set(approval_reasons)),
    findings,
    audit_event: {
      event_type: 'agent_policy_decision',
      request_id,
      task_id: task.id,
      task_name: task.name,
      tenant_id: tenant_context.tenant_id,
      user_id: tenant_context.user_id,
      user_role: tenant_context.user_role,
      required_capabilities: task.required_capabilities,
      status,
      risk_tier,
      approval_id,
      timestamp: new Date().toISOString(),
    },
  };

  return decision;
}

export function assert_agent_policy_allows(decision: AgentPolicyDecision): void {
  if (decision.allowed) return;

  const finding_text = decision.findings.map(finding => `${finding.code}: ${finding.message}`).join('; ');
  const approval_text = decision.approval_reasons.join('; ');
  const details = finding_text || approval_text || 'Agent policy denied execution.';
  throw new Error(`OpenClaw policy ${decision.status}: ${details}`);
}
