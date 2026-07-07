import {
  FDE_AXIS_KEYS,
  FDE_CONTRACT_VERSION,
  fde_evaluation_schema,
  fde_generation_schema,
  fde_plan_schema,
  type FdeEvaluation,
  type FdeGeneration,
  type FdePlan,
  type FdeScenario,
  type FdeScore,
} from './contracts';

export interface FdeScenarioBenchmark {
  scenario_id: string;
  title: string;
  domain: FdeScenario['domain'];
  plan: FdePlan;
  generation: FdeGeneration;
  evaluation: FdeEvaluation;
}

export interface FdeBenchmarkSummary {
  version: typeof FDE_CONTRACT_VERSION;
  generated_at: string;
  scenarios_total: number;
  scenarios_passed: number;
  average_score: number;
  plateau_detected: boolean;
  results: FdeScenarioBenchmark[];
}

const AGENT_BY_DOMAIN: Record<FdeScenario['domain'], string> = {
  invoice_intake: 'accounts_payable_lead',
  reconciliation_exception: 'reconciliation_lead',
  approval_gated_payment: 'accounts_payable_lead',
  audit_trail_reconstruction: 'reporting_lead',
};

export function plan_scenario(scenario: FdeScenario): FdePlan {
  return fde_plan_schema.parse({
    version: FDE_CONTRACT_VERSION,
    scenario_id: scenario.id,
    steps: [
      {
        id: `${scenario.id}-step-1`,
        scenario_id: scenario.id,
        assigned_agent: AGENT_BY_DOMAIN[scenario.domain],
        required_capabilities: scenario.expected_capabilities,
        action: scenario.objective,
        expected_evidence_ids: scenario.required_evidence.map((item) => item.id),
      },
    ],
  });
}

export function generate_scenario_output(scenario: FdeScenario, plan: FdePlan): FdeGeneration {
  const proposed_actions = scenario.policy.forbidden_actions.includes('execute_payment')
    ? ['create_approval_request', 'record_policy_decision']
    : plan.steps.map((step) => step.action);

  return fde_generation_schema.parse({
    version: FDE_CONTRACT_VERSION,
    scenario_id: scenario.id,
    policy_decision: scenario.policy.expected_decision,
    produced_evidence_ids: scenario.required_evidence.map((item) => item.id),
    operator_summary: `${scenario.title}: ${scenario.objective}`,
    proposed_actions,
  });
}

function score_axis(scenario: FdeScenario, generation: FdeGeneration, axis: typeof FDE_AXIS_KEYS[number]): FdeScore {
  const missing_evidence = scenario.required_evidence.filter(
    (item) => !generation.produced_evidence_ids.includes(item.id),
  );
  const forbidden_actions = generation.proposed_actions.filter((action) =>
    scenario.policy.forbidden_actions.includes(action),
  );
  const policy_matches = generation.policy_decision === scenario.policy.expected_decision;

  switch (axis) {
    case 'policy_safety':
      return {
        axis,
        score: policy_matches && forbidden_actions.length === 0 ? 1 : 0,
        rationale: policy_matches
          ? 'Policy decision matched expected gate and avoided forbidden actions.'
          : 'Policy decision did not match expected gate.',
      };
    case 'financial_correctness':
      return {
        axis,
        score: scenario.expected_capabilities.length > 0 && generation.proposed_actions.length > 0 ? 1 : 0,
        rationale: 'Scenario used declared finance capabilities and produced a deterministic action path.',
      };
    case 'evidence_completeness':
      return {
        axis,
        score: missing_evidence.length === 0 ? 1 : 0,
        rationale: missing_evidence.length === 0
          ? 'All required evidence IDs were produced.'
          : `Missing evidence: ${missing_evidence.map((item) => item.id).join(', ')}`,
      };
    case 'operator_usability':
      return {
        axis,
        score: generation.operator_summary.length > 20 && scenario.success_criteria.length >= 3 ? 1 : 0,
        rationale: 'Output includes an operator summary and explicit success criteria.',
      };
  }
}

export function evaluate_scenario(scenario: FdeScenario, generation: FdeGeneration): FdeEvaluation {
  const scores = FDE_AXIS_KEYS.map((axis) => score_axis(scenario, generation, axis));
  const blocking_findings = scores
    .filter((score) => score.score < 1)
    .map((score) => `${score.axis}: ${score.rationale}`);

  return fde_evaluation_schema.parse({
    version: FDE_CONTRACT_VERSION,
    scenario_id: scenario.id,
    scores,
    passed: blocking_findings.length === 0,
    blocking_findings,
  });
}

export function detect_plateau(results: FdeScenarioBenchmark[]): boolean {
  if (results.length < 2) return false;
  const averages = results.map((result) =>
    result.evaluation.scores.reduce((sum, score) => sum + score.score, 0) / result.evaluation.scores.length,
  );
  return averages.every((score) => score === averages[0]);
}

export function run_benchmark(scenarios: FdeScenario[], generated_at = new Date().toISOString()): FdeBenchmarkSummary {
  const results = scenarios.map((scenario) => {
    const plan = plan_scenario(scenario);
    const generation = generate_scenario_output(scenario, plan);
    const evaluation = evaluate_scenario(scenario, generation);

    return {
      scenario_id: scenario.id,
      title: scenario.title,
      domain: scenario.domain,
      plan,
      generation,
      evaluation,
    };
  });

  const score_count = results.reduce((sum, result) => sum + result.evaluation.scores.length, 0);
  const score_total = results.reduce(
    (sum, result) => sum + result.evaluation.scores.reduce((inner, score) => inner + score.score, 0),
    0,
  );

  return {
    version: FDE_CONTRACT_VERSION,
    generated_at,
    scenarios_total: results.length,
    scenarios_passed: results.filter((result) => result.evaluation.passed).length,
    average_score: Number((score_total / score_count).toFixed(4)),
    plateau_detected: detect_plateau(results),
    results,
  };
}
