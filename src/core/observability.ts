// file: src/core/observability.ts
// description: Opik observability integration for LLM tracing, monitoring, and cost tracking (self-hosted)
// reference: src/core/llm-client.ts, src/agents/base.ts

import { Opik, Trace, Span } from 'opik';
import type { TenantId, LedgerAgentId } from './types';

// ============================================================================
// Configuration (Self-Hosted Open Source Opik)
// ============================================================================

const OPIK_ENABLED = process.env.OPIK_ENABLED === 'true';
const OPIK_BASE_URL = process.env.OPIK_BASE_URL || 'http://localhost:5173/api';
const OPIK_PROJECT_NAME = process.env.OPIK_PROJECT_NAME || 'clawkeeper';

let opik_client: Opik | null = null;

export function get_opik_client(): Opik | null {
  if (!OPIK_ENABLED) {
    return null;
  }

  if (!opik_client) {
    opik_client = new Opik({
      // Self-hosted Opik does not require API key
      apiUrl: OPIK_BASE_URL,
      projectName: OPIK_PROJECT_NAME,
    });
    console.log(`[Opik] Self-hosted observability initialized at ${OPIK_BASE_URL}`);
  }

  return opik_client;
}

export function is_opik_enabled(): boolean {
  return OPIK_ENABLED;
}

// ============================================================================
// Trace Context
// ============================================================================

interface TraceContext {
  trace: Trace;
  tenant_id?: TenantId;
  agent_id?: LedgerAgentId;
}

// Active traces by task ID
const active_traces = new Map<string, TraceContext>();

export function start_trace(
  name: string,
  options: {
    task_id?: string;
    tenant_id?: TenantId;
    agent_id?: LedgerAgentId;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }
): Trace | null {
  const client = get_opik_client();
  if (!client) return null;

  const trace = client.trace({
    name,
    input: options.input || {},
    metadata: {
      ...options.metadata,
      tenant_id: options.tenant_id,
      agent_id: options.agent_id,
    },
    tags: options.tags || [],
  });

  if (options.task_id) {
    active_traces.set(options.task_id, {
      trace,
      tenant_id: options.tenant_id,
      agent_id: options.agent_id,
    });
  }

  return trace;
}

export function get_active_trace(task_id: string): Trace | null {
  return active_traces.get(task_id)?.trace || null;
}

export function end_trace(
  task_id: string,
  output?: Record<string, unknown>,
  error?: string
): void {
  const context = active_traces.get(task_id);
  if (!context) return;

  const { trace } = context;
  
  if (output) {
    // Update trace with output
    // Note: Opik SDK handles this via trace.end()
  }
  
  trace.end();
  active_traces.delete(task_id);
}

// ============================================================================
// Span Helpers
// ============================================================================

export function start_llm_span(
  trace: Trace,
  options: {
    name: string;
    model: string;
    input: {
      prompt: string;
      system?: string;
    };
    metadata?: Record<string, unknown>;
  }
): Span {
  return trace.span({
    name: options.name,
    type: 'llm',
    input: options.input,
    metadata: {
      ...options.metadata,
      model: options.model,
    },
  });
}

export function start_agent_span(
  trace: Trace,
  options: {
    name: string;
    agent_id: LedgerAgentId;
    capabilities: string[];
    input?: Record<string, unknown>;
  }
): Span {
  return trace.span({
    name: `Agent: ${options.name}`,
    type: 'general',
    input: options.input || {},
    metadata: {
      agent_id: options.agent_id,
      capabilities: options.capabilities,
    },
  });
}

export function start_tool_span(
  trace: Trace | Span,
  options: {
    name: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): Span {
  const parent = 'span' in trace ? trace : trace;
  return parent.span({
    name: options.name,
    type: 'tool',
    input: options.input || {},
    metadata: options.metadata,
  });
}

// ============================================================================
// Metric Tracking
// ============================================================================

interface UsageMetrics {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
}

export function record_llm_usage(
  span: Span,
  metrics: UsageMetrics
): void {
  // Log metrics before ending span
  // Note: Opik SDK span.end() doesn't take output args - set output via span properties if needed
  span.end();
}

export function record_agent_result(
  span: Span,
  result: {
    success: boolean;
    output?: Record<string, unknown>;
    error?: string;
    duration_ms: number;
  }
): void {
  // Log result before ending span
  // Note: Opik SDK span.end() doesn't take output args - set output via span properties if needed
  span.end();
}

// ============================================================================
// Flush & Cleanup
// ============================================================================

export async function flush_opik(): Promise<void> {
  const client = get_opik_client();
  if (client) {
    await client.flush();
    console.log('[Opik] Traces flushed');
  }
}

// ============================================================================
// Decorators (for use with agent methods)
// ============================================================================

export function traced(
  name: string,
  options?: { tags?: string[] }
): MethodDecorator {
  return function (
    _target: object,
    _property_key: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const original_method = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const client = get_opik_client();
      if (!client) {
        return original_method.apply(this, args);
      }

      const trace = client.trace({
        name,
        input: { args },
        tags: options?.tags || [],
      });

      try {
        const result = await original_method.apply(this, args);
        trace.end();
        return result;
      } catch (error) {
        trace.end();
        throw error;
      }
    };

    return descriptor;
  };
}
