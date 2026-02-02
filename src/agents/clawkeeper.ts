// file: src/agents/clawkeeper.ts
// description: ClawKeeper CEO agent - orchestrates all financial workflows
// reference: src/agents/base.ts, src/core/llm-client.ts

import { BaseAgent, type AgentConfig } from './base';
import type { LedgerTaskStar, LedgerAgentId } from '../core/types';
import * as llm from '../core/llm-client';

const CLAWKEEPER_CONFIG: AgentConfig = {
  id: 'clawkeeper',
  name: 'ClawKeeper',
  description: 'Autonomous CEO of ClawKeeper - orchestrates all financial workflows',
  capabilities: [
    'invoice_parsing',
    'invoice_validation',
    'transaction_matching',
    'report_generation',
    'tax_compliance_check',
    'payment_processing',
    'bank_sync',
    'accounting_sync',
    'data_import',
    'user_assistance',
  ],
};

interface ConstellationDAG {
  tasks: LedgerTaskStar[];
  edges: Array<{ from: string; to: string }>;
}

export class ClawKeeperAgent extends BaseAgent {
  private orchestrators: Map<LedgerAgentId, BaseAgent> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    super({ ...CLAWKEEPER_CONFIG, ...config });
  }

  protected async execute(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[ClawKeeper] Processing: ${name} (Tenant: ${tenant.tenant_id})`);
    console.log(`[ClawKeeper] Capabilities needed: ${required_capabilities.join(", ")}`);

    // Route based on request type
    const request_text = String(input.request || input.description || "");

    // Decompose into constellation DAG
    if (this.is_complex_request(request_text)) {
      return await this.orchestrate_workflow(request_text, task);
    }

    // Simple single-agent task - route to appropriate orchestrator
    return await this.route_to_orchestrator(task);
  }

  private is_complex_request(request: string): boolean {
    // Complex if involves multiple domains or multi-step workflow
    const complexity_indicators = [
      'process invoice and pay',
      'reconcile and report',
      'import and categorize',
      'generate all reports',
    ];

    return complexity_indicators.some(indicator => 
      request.toLowerCase().includes(indicator)
    );
  }

  private async orchestrate_workflow(
    request: string,
    task: LedgerTaskStar
  ): Promise<Record<string, unknown>> {
    console.log('[ClawKeeper] Decomposing complex request into DAG...');

    // Use LLM to decompose request
    const tasks = await llm.decompose_financial_task(request);

    // Build constellation DAG
    const constellation: ConstellationDAG = {
      tasks: tasks.map(t => ({
        ...task,
        id: uuid(),
        name: t.name,
        description: t.description,
        required_capabilities: t.required_capabilities as any[],
        dependencies: [], // Map dependency names to IDs after all tasks created
        status: 'pending',
        input: { ...task.input, subtask: t },
      })),
      edges: [],
    };

    // Execute DAG (simplified - execute sequentially for now)
    const results: Record<string, unknown>[] = [];
    for (const subtask of constellation.tasks) {
      const result = await this.route_to_orchestrator(subtask);
      results.push(result);
    }

    return {
      constellation_id: uuid(),
      tasks_completed: constellation.tasks.length,
      results,
      summary: 'Workflow completed successfully',
    };
  }

  private async route_to_orchestrator(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    const capabilities = task.required_capabilities;

    // Route based on primary capability
    if (this.matches_capabilities(capabilities, ['invoice_parsing', 'invoice_validation', 'payment_processing'])) {
      return await this.delegate_to('accounts_payable_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['transaction_matching', 'discrepancy_detection'])) {
      return await this.delegate_to('reconciliation_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['report_generation'])) {
      return await this.delegate_to('reporting_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['tax_compliance_check', 'audit_preparation'])) {
      return await this.delegate_to('compliance_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['bank_sync', 'accounting_sync'])) {
      return await this.delegate_to('integration_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['data_import', 'data_transformation'])) {
      return await this.delegate_to('data_etl_lead', task);
    }

    if (this.matches_capabilities(capabilities, ['user_assistance', 'error_recovery'])) {
      return await this.delegate_to('support_lead', task);
    }

    // Default: handle directly
    return await this.execute_directly(task);
  }

  private matches_capabilities(task_caps: string[], agent_caps: string[]): boolean {
    return task_caps.some(cap => agent_caps.includes(cap));
  }

  private async delegate_to(
    orchestrator_id: LedgerAgentId,
    task: LedgerTaskStar
  ): Promise<Record<string, unknown>> {
    console.log(`[ClawKeeper] Delegating to ${orchestrator_id}`);

    // In full implementation, this would call the actual orchestrator agent
    // For now, return simulated result
    return {
      delegated_to: orchestrator_id,
      task_id: task.id,
      status: 'delegated',
      message: `Task delegated to ${orchestrator_id}`,
    };
  }

  private async execute_directly(task: LedgerTaskStar): Promise<Record<string, unknown>> {
    // Handle simple tasks directly
    const request = String(task.input.request || task.description);

    console.log(`[ClawKeeper] Executing directly: ${request}`);

    // Use LLM for general financial queries
    const response = await llm.complete(request, {
      system: 'You are ClawKeeper, an autonomous bookkeeping AI. Provide clear, accurate financial guidance.',
      temperature: 0.3,
    });

    return {
      response,
      task_id: task.id,
      handled_by: 'clawkeeper_direct',
    };
  }

  register_orchestrator(id: LedgerAgentId, agent: BaseAgent): void {
    this.orchestrators.set(id, agent);
    console.log(`[ClawKeeper] Registered orchestrator: ${id}`);
  }
}

// ===========================================================================
// Main Entry Point
// ===========================================================================

import { v4 as uuid } from 'uuid';

if (import.meta.main) {
  console.log('ClawKeeper CEO Agent Starting...\n');

  const agent = new ClawKeeperAgent();
  await agent.start();

  // Test execution
  const test_context = {
    tenant_id: '00000000-0000-0000-0000-000000000001' as any,
    user_id: '00000000-0000-0000-0001-000000000001' as any,
    user_role: 'tenant_admin',
  };

  const test_task: LedgerTaskStar = {
    id: uuid(),
    tenant_id: test_context.tenant_id,
    name: 'Process Invoice',
    description: 'Process uploaded invoice from Office Depot',
    required_capabilities: ['invoice_parsing', 'invoice_validation'],
    assigned_agent: 'clawkeeper',
    status: 'assigned',
    priority: 'normal',
    input: { request: 'Parse and validate invoice from Office Depot for $250' },
    output: null,
    dependencies: [],
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    error: null,
    retry_count: 0,
    max_retries: 3,
  };

  const result = await agent.execute_task(test_task, test_context);
  console.log('\nResult:', JSON.stringify(result, null, 2));

  await agent.stop();
}
