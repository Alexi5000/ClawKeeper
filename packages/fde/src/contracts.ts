import { z } from 'zod';

export const FDE_CONTRACT_VERSION = 'clawkeeper.fde.v2.0' as const;

export const FDE_AXIS_KEYS = [
  'policy_safety',
  'financial_correctness',
  'evidence_completeness',
  'operator_usability',
] as const;

export const fde_axis_key_schema = z.enum(FDE_AXIS_KEYS);

export const fde_score_schema = z.object({
  axis: fde_axis_key_schema,
  score: z.number().min(0).max(1),
  rationale: z.string().min(1),
});

export const fde_policy_expectation_schema = z.object({
  expected_decision: z.enum(['allow', 'requires_approval', 'deny']),
  required_approval: z.boolean(),
  forbidden_actions: z.array(z.string()).default([]),
  required_audit_events: z.array(z.string()).default([]),
});

export const fde_evidence_item_schema = z.object({
  id: z.string().min(1),
  type: z.enum(['invoice', 'transaction', 'approval', 'audit_event', 'policy_decision', 'report']),
  description: z.string().min(1),
  redacted: z.boolean(),
});

export const fde_scenario_schema = z.object({
  version: z.literal(FDE_CONTRACT_VERSION),
  id: z.string().regex(/^fde-[a-z0-9-]+$/),
  title: z.string().min(1),
  domain: z.enum([
    'invoice_intake',
    'reconciliation_exception',
    'approval_gated_payment',
    'audit_trail_reconstruction',
  ]),
  objective: z.string().min(1),
  tenant_id: z.string().min(1),
  user_role: z.enum(['tenant_admin', 'accountant', 'viewer', 'platform_admin']),
  input: z.record(z.unknown()),
  expected_capabilities: z.array(z.string()).min(1),
  policy: fde_policy_expectation_schema,
  required_evidence: z.array(fde_evidence_item_schema).min(1),
  success_criteria: z.array(z.string()).min(1),
});

export const fde_plan_step_schema = z.object({
  id: z.string().min(1),
  scenario_id: z.string().min(1),
  assigned_agent: z.string().min(1),
  required_capabilities: z.array(z.string()).min(1),
  action: z.string().min(1),
  expected_evidence_ids: z.array(z.string()).min(1),
});

export const fde_plan_schema = z.object({
  version: z.literal(FDE_CONTRACT_VERSION),
  scenario_id: z.string().min(1),
  steps: z.array(fde_plan_step_schema).min(1),
});

export const fde_generation_schema = z.object({
  version: z.literal(FDE_CONTRACT_VERSION),
  scenario_id: z.string().min(1),
  policy_decision: z.enum(['allow', 'requires_approval', 'deny']),
  produced_evidence_ids: z.array(z.string()),
  operator_summary: z.string().min(1),
  proposed_actions: z.array(z.string()),
});

export const fde_evaluation_schema = z.object({
  version: z.literal(FDE_CONTRACT_VERSION),
  scenario_id: z.string().min(1),
  scores: z.array(fde_score_schema).length(FDE_AXIS_KEYS.length),
  passed: z.boolean(),
  blocking_findings: z.array(z.string()),
});

export type FdeAxisKey = z.infer<typeof fde_axis_key_schema>;
export type FdeScore = z.infer<typeof fde_score_schema>;
export type FdeScenario = z.infer<typeof fde_scenario_schema>;
export type FdePlan = z.infer<typeof fde_plan_schema>;
export type FdeGeneration = z.infer<typeof fde_generation_schema>;
export type FdeEvaluation = z.infer<typeof fde_evaluation_schema>;

export function validate_fde_scenario(scenario: unknown): FdeScenario {
  return fde_scenario_schema.parse(scenario);
}

export function validate_fde_scenarios(scenarios: unknown[]): FdeScenario[] {
  return scenarios.map(validate_fde_scenario);
}
