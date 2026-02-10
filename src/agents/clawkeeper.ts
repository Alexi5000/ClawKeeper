// file: src/agents/clawkeeper.ts
// description: ClawKeeper CEO agent - orchestrates all financial workflows
// reference: src/agents/base.ts, src/core/llm-client.ts

import { BaseAgent, type AgentConfig } from './base';
import type { LedgerFlowNode, LedgerAgentId } from '../core/types';
import * as llm from '../core/llm-client';
import { agent_runtime } from './index';

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

interface OrcaFlowDAG {
  tasks: LedgerFlowNode[];
  edges: Array<{ from: string; to: string }>;
}

export class ClawKeeperAgent extends BaseAgent {
  private orchestrators: Map<LedgerAgentId, BaseAgent> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    super({ ...CLAWKEEPER_CONFIG, ...config });
  }

  protected async execute(task: LedgerFlowNode): Promise<Record<string, unknown>> {
    const { name, input, required_capabilities } = task;
    const tenant = this.ensure_tenant_context();

    console.log(`[ClawKeeper] Processing: ${name} (Tenant: ${tenant.tenant_id})`);
    console.log(`[ClawKeeper] Capabilities needed: ${required_capabilities.join(", ")}`);

    // Route based on request type
    const request_text = String(input.request || input.description || "");

    // Decompose into orcaflow DAG
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
    task: LedgerFlowNode
  ): Promise<Record<string, unknown>> {
    console.log('[ClawKeeper] Decomposing complex request into DAG...');

    // Use LLM to decompose request
    const tasks = await llm.decompose_financial_task(request);

    // Build orcaflow DAG
    const orcaflow: OrcaFlowDAG = {
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
    for (const subtask of orcaflow.tasks) {
      const result = await this.route_to_orchestrator(subtask);
      results.push(result);
    }

    return {
      orcaflow_id: uuid(),
      tasks_completed: orcaflow.tasks.length,
      results,
      summary: 'Workflow completed successfully',
    };
  }

  private async route_to_orchestrator(task: LedgerFlowNode): Promise<Record<string, unknown>> {
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
    task: LedgerFlowNode,
    retries: number = 0,
    maxRetries: number = 2
  ): Promise<Record<string, unknown>> {
    console.log(`[ClawKeeper] Delegating to ${orchestrator_id} (attempt ${retries + 1}/${maxRetries + 1})`);

    try {
      // Get orchestrator agent from runtime
      const orchestrator = await agent_runtime.get_agent(orchestrator_id);
      
      // Execute task via orchestrator
      const ledger_task = {
        id: task.id,
        description: task.description,
        input: task.input,
        required_capabilities: task.required_capabilities,
      };
      
      const result = await orchestrator.execute_task(ledger_task, {
        tenant_id: 'default',  // Would come from context in real system
      });

      // Validate result (orchestrator-worker pattern)
      if (!result || result.error) {
        throw new Error(result?.error || 'Orchestrator returned empty result');
      }

      console.log(`[ClawKeeper] Successfully delegated to ${orchestrator_id}`);
      
      return {
        delegated_to: orchestrator_id,
        task_id: task.id,
        status: 'completed',
        result: result.result || result,
        success: true,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[ClawKeeper] Delegation to ${orchestrator_id} failed:`, errorMsg);

      // Retry logic (orchestrator-worker pattern)
      if (retries < maxRetries) {
        console.log(`[ClawKeeper] Retrying delegation to ${orchestrator_id}...`);
        return await this.delegate_to(orchestrator_id, task, retries + 1, maxRetries);
      }

      // Failed after retries
      return {
        delegated_to: orchestrator_id,
        task_id: task.id,
        status: 'failed',
        error: errorMsg,
        success: false,
        retries,
      };
    }
  }

  private async execute_directly(task: LedgerFlowNode): Promise<Record<string, unknown>> {
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

  const test_task: LedgerFlowNode = {
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
