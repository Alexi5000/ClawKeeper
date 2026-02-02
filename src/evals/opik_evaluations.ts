// file: src/evals/opik_evaluations.ts
// description: Opik evaluation framework for ClawKeeper agent testing
// reference: src/core/observability.ts, src/agents/base.ts

import { get_opik_client, is_opik_enabled } from '../core/observability';

// ============================================================================
// Evaluation Types
// ============================================================================

interface EvaluationCase {
  id: string;
  name: string;
  input: Record<string, unknown>;
  expected_output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface EvaluationResult {
  case_id: string;
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  actual_output: Record<string, unknown>;
  latency_ms: number;
  error?: string;
}

interface EvaluationMetric {
  name: string;
  description: string;
  compute: (expected: unknown, actual: unknown) => number;
}

// ============================================================================
// Built-in Evaluation Metrics
// ============================================================================

export const METRICS: Record<string, EvaluationMetric> = {
  // Exact match for financial amounts (must be exactly correct)
  amount_accuracy: {
    name: 'amount_accuracy',
    description: 'Checks if financial amounts match exactly (BigInt cents)',
    compute: (expected, actual) => {
      if (expected === actual) return 1.0;
      return 0.0;
    },
  },

  // Fuzzy match for text fields
  text_similarity: {
    name: 'text_similarity',
    description: 'Computes Jaccard similarity between text fields',
    compute: (expected, actual) => {
      if (typeof expected !== 'string' || typeof actual !== 'string') return 0.0;
      const set_a = new Set(expected.toLowerCase().split(/\s+/));
      const set_b = new Set(actual.toLowerCase().split(/\s+/));
      const intersection = new Set([...set_a].filter(x => set_b.has(x)));
      const union = new Set([...set_a, ...set_b]);
      return intersection.size / union.size;
    },
  },

  // Category match
  category_accuracy: {
    name: 'category_accuracy',
    description: 'Checks if expense category matches',
    compute: (expected, actual) => {
      if (typeof expected !== 'string' || typeof actual !== 'string') return 0.0;
      return expected.toLowerCase() === actual.toLowerCase() ? 1.0 : 0.0;
    },
  },

  // Date accuracy (within tolerance)
  date_accuracy: {
    name: 'date_accuracy',
    description: 'Checks if dates match (exact)',
    compute: (expected, actual) => {
      if (expected === actual) return 1.0;
      return 0.0;
    },
  },

  // Confidence threshold
  confidence_threshold: {
    name: 'confidence_threshold',
    description: 'Checks if confidence is above threshold (0.8)',
    compute: (expected, actual) => {
      if (typeof actual !== 'number') return 0.0;
      return actual >= 0.8 ? 1.0 : actual;
    },
  },

  // Task completion
  task_completion: {
    name: 'task_completion',
    description: 'Binary check if task completed successfully',
    compute: (expected, actual) => {
      if (typeof actual === 'object' && actual !== null) {
        const result = actual as Record<string, unknown>;
        return result['success'] === true ? 1.0 : 0.0;
      }
      return 0.0;
    },
  },
};

// ============================================================================
// Evaluation Runner
// ============================================================================

export async function run_evaluation(
  name: string,
  cases: EvaluationCase[],
  runner: (input: Record<string, unknown>) => Promise<Record<string, unknown>>,
  metrics: string[] = ['task_completion']
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  const opik = get_opik_client();

  // Create evaluation trace
  const eval_trace = opik?.trace({
    name: `evaluation:${name}`,
    input: { case_count: cases.length, metrics },
    tags: ['evaluation', name],
  });

  for (const test_case of cases) {
    const start_time = Date.now();
    let actual_output: Record<string, unknown> = {};
    let error: string | undefined;

    try {
      actual_output = await runner(test_case.input);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const latency_ms = Date.now() - start_time;

    // Compute metrics
    const computed_metrics: Record<string, number> = {};
    let total_score = 0;

    for (const metric_name of metrics) {
      const metric = METRICS[metric_name];
      if (metric && test_case.expected_output) {
        const expected_value = test_case.expected_output[metric_name];
        const actual_value = actual_output[metric_name] ?? actual_output;
        computed_metrics[metric_name] = metric.compute(expected_value, actual_value);
        total_score += computed_metrics[metric_name];
      }
    }

    const avg_score = metrics.length > 0 ? total_score / metrics.length : 0;
    const passed = avg_score >= 0.8 && !error;

    results.push({
      case_id: test_case.id,
      passed,
      score: avg_score,
      metrics: computed_metrics,
      actual_output,
      latency_ms,
      error,
    });

    // Log individual case to Opik
    if (eval_trace) {
      eval_trace.span({
        name: `case:${test_case.name}`,
        type: 'general',
        input: test_case.input,
        output: { passed, score: avg_score, metrics: computed_metrics, latency_ms },
      }).end();
    }
  }

  // Summarize results
  const passed_count = results.filter(r => r.passed).length;
  const avg_score = results.reduce((acc, r) => acc + r.score, 0) / results.length;

  if (eval_trace) {
    eval_trace.end();
  }

  console.log(`[Evaluation: ${name}] ${passed_count}/${results.length} passed (avg score: ${(avg_score * 100).toFixed(1)}%)`);

  return results;
}

// ============================================================================
// Pre-built Test Datasets
// ============================================================================

export const INVOICE_PARSING_TESTS: EvaluationCase[] = [
  {
    id: 'inv-001',
    name: 'Standard invoice parsing',
    input: {
      ocr_text: 'ACME Corp Invoice #INV-2024-001 Date: 2024-01-15 Due: 2024-02-15 Total: $500.00',
    },
    expected_output: {
      vendor_name: 'ACME Corp',
      invoice_number: 'INV-2024-001',
      amount: 50000n, // cents
    },
  },
  {
    id: 'inv-002',
    name: 'Invoice with line items',
    input: {
      ocr_text: 'Supplier Inc. Invoice 12345\nItem A: $100\nItem B: $200\nTotal: $300',
    },
    expected_output: {
      vendor_name: 'Supplier Inc.',
      amount: 30000n,
    },
  },
];

export const EXPENSE_CATEGORIZATION_TESTS: EvaluationCase[] = [
  {
    id: 'exp-001',
    name: 'Software subscription',
    input: { description: 'Monthly Slack subscription' },
    expected_output: { category: 'Software & Subscriptions' },
  },
  {
    id: 'exp-002',
    name: 'Cloud services',
    input: { description: 'AWS EC2 instances - January' },
    expected_output: { category: 'Cloud Services' },
  },
  {
    id: 'exp-003',
    name: 'Office supplies',
    input: { description: 'Printer paper and ink cartridges' },
    expected_output: { category: 'Office Supplies' },
  },
];

export const RECONCILIATION_TESTS: EvaluationCase[] = [
  {
    id: 'rec-001',
    name: 'Exact match transaction',
    input: {
      bank_transaction: { amount: 50000, date: '2024-01-15', description: 'ACME PAYMENT' },
      ledger_entries: [
        { amount: 50000, date: '2024-01-15', vendor: 'ACME Corp' },
      ],
    },
    expected_output: { matched: true, confidence: 1.0 },
  },
];
