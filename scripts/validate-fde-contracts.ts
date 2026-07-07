import { fde_scenarios } from '../packages/fde/src/fixtures';
import { FDE_AXIS_KEYS, validate_fde_scenarios } from '../packages/fde/src/contracts';

const scenarios = validate_fde_scenarios(fde_scenarios);
const scenario_ids = new Set<string>();

for (const scenario of scenarios) {
  if (scenario_ids.has(scenario.id)) {
    throw new Error(`Duplicate FDE scenario id: ${scenario.id}`);
  }
  scenario_ids.add(scenario.id);

  const evidence_ids = new Set(scenario.required_evidence.map((item) => item.id));
  if (evidence_ids.size !== scenario.required_evidence.length) {
    throw new Error(`Duplicate evidence id in ${scenario.id}`);
  }

  if (scenario.policy.required_approval && scenario.policy.expected_decision !== 'requires_approval') {
    throw new Error(`${scenario.id} requires approval but does not expect requires_approval`);
  }
}

console.log(JSON.stringify({
  version: scenarios[0]?.version,
  scenarios: scenarios.length,
  axes: FDE_AXIS_KEYS,
}, null, 2));
