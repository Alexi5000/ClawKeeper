// file: src/agents/orchestration_service.ts
// description: Orchestration service for multi-agent task planning and execution
// reference: src/agents/index.ts, src/core/llm-client.ts, src/core/types.ts

import { v4 as uuid } from 'uuid';
import { agent_runtime } from './index';
import * as llm from '../core/llm-client';
import type { LedgerTaskStar, LedgerCapability, LedgerAgentId, TenantContext } from '../core/types';

// ============================================================================
// Types
// ============================================================================

export interface OrchestrationTask {
  task_id: string;
  name: string;
  description: string;
  assigned_agent: string;
  agent_name: string;
  required_capabilities: string[];
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface OrchestrationPlan {
  plan_id: string;
  command: string;
  created_at: string;
  estimated_duration_ms: number;
  tasks: OrchestrationTask[];
  edges: Array<{ from: string; to: string }>;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed';
}

export interface OrchestrationResult {
  plan_id: string;
  status: 'completed' | 'partial' | 'failed';
  tasks_completed: number;
  tasks_failed: number;
  tasks_total: number;
  results: Array<{
    task_id: string;
    agent_id: string;
    success: boolean;
    output: Record<string, unknown>;
    error: string | null;
    duration_ms: number;
  }>;
  total_duration_ms: number;
  summary: string;
}

export type ExecutionEvent =
  | { type: 'plan_started'; plan_id: string; timestamp: string }
  | { type: 'plan_completed'; plan_id: string; status: string; tasks_completed: number; tasks_failed: number; total_duration_ms: number; summary: string; timestamp: string }
  | { type: 'plan_failed'; plan_id: string; error: string; timestamp: string }
  | { type: 'task_started'; plan_id: string; task_id: string; agent_id: string; agent_name: string; timestamp: string }
  | { type: 'task_completed'; plan_id: string; task_id: string; agent_id: string; result: Record<string, unknown>; error: string | null; duration_ms: number; timestamp: string }
  | { type: 'task_failed'; plan_id: string; task_id: string; agent_id: string; error: string; duration_ms?: number; timestamp: string }
  | { type: 'task_skipped'; plan_id: string; task_id: string; reason: string; timestamp: string };

// ============================================================================
// Orchestration Service
// ============================================================================

class OrchestrationService {
  private plans: Map<string, OrchestrationPlan> = new Map();

  /**
   * Create an execution plan from a natural language command
   */
  async create_plan(command: string, tenant_context: TenantContext): Promise<OrchestrationPlan> {
    console.log(`[Orchestration] Creating plan for: "${command}"`);

    // Use LLM to decompose the command into tasks
    const decomposed_tasks = await llm.decompose_financial_task(command);

    // Map tasks to agents based on capabilities
    const tasks: OrchestrationTask[] = decomposed_tasks.map(task => {
      const agent_assignment = this.assign_agent_by_capabilities(task.required_capabilities as LedgerCapability[]);
      
      return {
        task_id: uuid(),
        name: task.name,
        description: task.description,
        assigned_agent: agent_assignment.agent_id,
        agent_name: agent_assignment.agent_name,
        required_capabilities: task.required_capabilities,
        dependencies: [], // Will map dependencies next
        status: 'pending',
      };
    });

    // Build dependency edges
    const edges: Array<{ from: string; to: string }> = [];
    const task_name_to_id = new Map(tasks.map(t => [t.name, t.task_id]));

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const original_task = decomposed_tasks[i];
      
      // Map dependency names to task IDs
      const dep_ids = original_task.dependencies
        .map(dep_name => task_name_to_id.get(dep_name))
        .filter((id): id is string => id !== undefined);
      
      task.dependencies = dep_ids;
      
      // Create edges
      for (const dep_id of dep_ids) {
        edges.push({ from: dep_id, to: task.task_id });
      }
    }

    // Create plan
    const plan: OrchestrationPlan = {
      plan_id: uuid(),
      command,
      created_at: new Date().toISOString(),
      estimated_duration_ms: this.estimate_duration(tasks),
      tasks,
      edges,
      status: 'pending',
    };

    // Store plan
    this.plans.set(plan.plan_id, plan);

    console.log(`[Orchestration] Plan created: ${plan.plan_id} with ${tasks.length} tasks`);
    return plan;
  }

  /**
   * Get a stored plan
   */
  get_plan(plan_id: string): OrchestrationPlan | null {
    return this.plans.get(plan_id) || null;
  }

  /**
   * Execute a plan
   */
  async execute_plan(
    plan_id: string,
    tenant_context: TenantContext,
    event_callback?: (event: ExecutionEvent) => void
  ): Promise<OrchestrationResult> {
    const plan = this.plans.get(plan_id);
    if (!plan) {
      throw new Error(`Plan not found: ${plan_id}`);
    }

    const start_time = Date.now();
    plan.status = 'executing';

    // Emit plan started event
    this.emit_event(event_callback, {
      type: 'plan_started',
      plan_id,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Orchestration] Executing plan: ${plan_id}`);

    const results: Array<{
      task_id: string;
      agent_id: string;
      success: boolean;
      output: Record<string, unknown>;
      error: string | null;
      duration_ms: number;
    }> = [];

    let tasks_completed = 0;
    let tasks_failed = 0;

    try {
      // Execute tasks in dependency order (topological sort)
      const execution_order = this.topological_sort(plan.tasks, plan.edges);

      for (const task of execution_order) {
        // Check if dependencies succeeded
        const deps_failed = task.dependencies.some(dep_id =>
          plan.tasks.find(t => t.task_id === dep_id)?.status === 'failed'
        );

        if (deps_failed) {
          task.status = 'skipped';
          this.emit_event(event_callback, {
            type: 'task_skipped',
            plan_id,
            task_id: task.task_id,
            reason: 'Dependency failed',
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        // Execute task
        task.status = 'running';
        task.started_at = new Date().toISOString();

        this.emit_event(event_callback, {
          type: 'task_started',
          plan_id,
          task_id: task.task_id,
          agent_id: task.assigned_agent,
          agent_name: task.agent_name,
          timestamp: new Date().toISOString(),
        });

        const task_start = Date.now();

        try {
          // Get agent and execute
          const agent = await agent_runtime.get_agent(task.assigned_agent);
          
          // Build LedgerTaskStar
          const ledger_task: LedgerTaskStar = {
            id: task.task_id,
            tenant_id: tenant_context.tenant_id,
            name: task.name,
            description: task.description,
            required_capabilities: task.required_capabilities as LedgerCapability[],
            assigned_agent: task.assigned_agent as LedgerAgentId,
            status: 'assigned',
            priority: 'normal',
            input: { command: plan.command },
            output: null,
            dependencies: task.dependencies,
            created_at: new Date().toISOString(),
            started_at: null,
            completed_at: null,
            error: null,
            retry_count: 0,
            max_retries: 3,
          };

          const result = await agent.execute_task(ledger_task, tenant_context);
          const task_duration = Date.now() - task_start;

          task.status = result.success ? 'completed' : 'failed';
          task.completed_at = new Date().toISOString();
          task.duration_ms = task_duration;
          task.result = result.output;
          task.error = result.error;

          results.push({
            task_id: task.task_id,
            agent_id: task.assigned_agent,
            success: result.success,
            output: result.output,
            error: result.error,
            duration_ms: task_duration,
          });

          if (result.success) {
            tasks_completed++;
            this.emit_event(event_callback, {
              type: 'task_completed',
              plan_id,
              task_id: task.task_id,
              agent_id: task.assigned_agent,
              result: result.output,
              error: null,
              duration_ms: task_duration,
              timestamp: new Date().toISOString(),
            });
          } else {
            tasks_failed++;
            this.emit_event(event_callback, {
              type: 'task_failed',
              plan_id,
              task_id: task.task_id,
              agent_id: task.assigned_agent,
              error: result.error || 'Unknown error',
              duration_ms: task_duration,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          const task_duration = Date.now() - task_start;
          const error_msg = error instanceof Error ? error.message : String(error);
          
          task.status = 'failed';
          task.completed_at = new Date().toISOString();
          task.duration_ms = task_duration;
          task.error = error_msg;

          tasks_failed++;

          results.push({
            task_id: task.task_id,
            agent_id: task.assigned_agent,
            success: false,
            output: {},
            error: error_msg,
            duration_ms: task_duration,
          });

          this.emit_event(event_callback, {
            type: 'task_failed',
            plan_id,
            task_id: task.task_id,
            agent_id: task.assigned_agent,
            error: error_msg,
            duration_ms: task_duration,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const total_duration = Date.now() - start_time;
      const status = tasks_failed === 0 ? 'completed' : tasks_failed < plan.tasks.length ? 'partial' : 'failed';
      plan.status = status === 'completed' ? 'completed' : 'failed';

      const summary = `Executed ${tasks_completed} of ${plan.tasks.length} tasks successfully. ${tasks_failed} failed.`;

      // Emit completion event
      this.emit_event(event_callback, {
        type: 'plan_completed',
        plan_id,
        status,
        tasks_completed,
        tasks_failed,
        total_duration_ms: total_duration,
        summary,
        timestamp: new Date().toISOString(),
      });

      return {
        plan_id,
        status,
        tasks_completed,
        tasks_failed,
        tasks_total: plan.tasks.length,
        results,
        total_duration_ms: total_duration,
        summary,
      };
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      plan.status = 'failed';

      this.emit_event(event_callback, {
        type: 'plan_failed',
        plan_id,
        error: error_msg,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * Assign agent by capabilities
   */
  private assign_agent_by_capabilities(capabilities: LedgerCapability[]): {
    agent_id: string;
    agent_name: string;
  } {
    // Get all agent profiles
    const profiles = agent_runtime.get_all_profiles();

    // Find best match based on capability overlap
    let best_match = profiles[0];
    let best_score = 0;

    for (const profile of profiles) {
      const overlap = capabilities.filter(cap => profile.capabilities.includes(cap)).length;
      const score = overlap / capabilities.length;

      if (score > best_score) {
        best_score = score;
        best_match = profile;
      }
    }

    return {
      agent_id: best_match.id,
      agent_name: best_match.name,
    };
  }

  /**
   * Estimate plan duration
   */
  private estimate_duration(tasks: OrchestrationTask[]): number {
    // Rough estimate: 5 seconds per task
    return tasks.length * 5000;
  }

  /**
   * Topological sort for task execution order
   */
  private topological_sort(
    tasks: OrchestrationTask[],
    edges: Array<{ from: string; to: string }>
  ): OrchestrationTask[] {
    const in_degree = new Map<string, number>();
    const adj_list = new Map<string, string[]>();

    // Initialize
    for (const task of tasks) {
      in_degree.set(task.task_id, 0);
      adj_list.set(task.task_id, []);
    }

    // Build adjacency list and in-degree
    for (const edge of edges) {
      adj_list.get(edge.from)?.push(edge.to);
      in_degree.set(edge.to, (in_degree.get(edge.to) || 0) + 1);
    }

    // Queue for tasks with no dependencies
    const queue: string[] = [];
    for (const [task_id, degree] of in_degree.entries()) {
      if (degree === 0) {
        queue.push(task_id);
      }
    }

    const sorted: OrchestrationTask[] = [];
    const task_map = new Map(tasks.map(t => [t.task_id, t]));

    while (queue.length > 0) {
      const task_id = queue.shift()!;
      const task = task_map.get(task_id)!;
      sorted.push(task);

      // Reduce in-degree of neighbors
      for (const neighbor_id of adj_list.get(task_id) || []) {
        const new_degree = (in_degree.get(neighbor_id) || 0) - 1;
        in_degree.set(neighbor_id, new_degree);

        if (new_degree === 0) {
          queue.push(neighbor_id);
        }
      }
    }

    // Check for cycles
    if (sorted.length !== tasks.length) {
      console.warn('[Orchestration] Cycle detected in task graph, using original order');
      return tasks;
    }

    return sorted;
  }

  /**
   * Emit event to callback
   */
  private emit_event(callback: ((event: ExecutionEvent) => void) | undefined, event: ExecutionEvent): void {
    if (callback) {
      try {
        callback(event);
      } catch (error) {
        console.error('[Orchestration] Event callback error:', error);
      }
    }
  }
}

// Singleton instance
export const orchestration_service = new OrchestrationService();
