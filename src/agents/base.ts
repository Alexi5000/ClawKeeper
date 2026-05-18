// file: src/agents/base.ts
// description: Base agent class for ClawKeeper with tenant context, audit logging, and Opik observability
// reference: src/core/types.ts, src/core/observability.ts

import { v4 as uuid } from 'uuid';
import postgres from 'postgres';
import type { Sql } from 'postgres';

let _lazy_sql: Sql | null = null;
function get_db_client(): Sql | null {
  if (!_lazy_sql && process.env.DATABASE_URL) {
    try {
      _lazy_sql = postgres(process.env.DATABASE_URL, {
        max: 2,
        idle_timeout: 10,
      });
    } catch (err) {
      console.error('[BaseAgent] Failed to initialize DB client:', err);
    }
  }
  return _lazy_sql;
}
import type {
  AgentProfile,
  LedgerAgentId,
  LedgerCapability,
  AgentStatus,
  LedgerTaskStar,
  TenantId,
  UserId,
} from '../core/types';
import {
  get_opik_client,
  start_trace,
  end_trace,
  start_agent_span,
  record_agent_result,
} from '../core/observability';
import {
  assert_agent_policy_allows,
  evaluate_agent_policy,
  redact_policy_payload,
  type AgentPolicyDecision,
} from '../openclaw/policy';

export interface AgentConfig {
  id: LedgerAgentId;
  name: string;
  description: string;
  capabilities: LedgerCapability[];
  server_url?: string;
}

export interface TaskResult {
  task_id: string;
  success: boolean;
  output: Record<string, unknown>;
  error: string | null;
  duration_ms: number;
  agent_id: LedgerAgentId;
  tokens_used?: number;
  cost?: number;
  policy_decision?: AgentPolicyDecision;
}

export interface TenantContext {
  tenant_id: TenantId;
  user_id: UserId;
  user_role: string;
}

export abstract class BaseAgent {
  protected profile: AgentProfile;
  protected config: AgentConfig;
  protected is_connected: boolean = false;
  protected current_tenant: TenantContext | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
    this.profile = {
      id: config.id,
      name: config.name,
      description: config.description,
      capabilities: config.capabilities,
      status: 'idle',
      current_task: null,
      metadata: {},
    };
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async start(): Promise<void> {
    console.log(`[${this.config.name}] Starting agent...`);
    await this.on_start();
    this.is_connected = true;
    this.profile.status = 'idle';
    console.log(`[${this.config.name}] Agent ready`);
  }

  async stop(): Promise<void> {
    console.log(`[${this.config.name}] Stopping agent...`);
    this.is_connected = false;
    this.profile.status = 'offline';
    await this.on_stop();
    console.log(`[${this.config.name}] Agent stopped`);
  }

  protected async on_start(): Promise<void> {
    // Override in subclass for custom startup logic
  }

  protected async on_stop(): Promise<void> {
    // Override in subclass for custom shutdown logic
  }

  // ===========================================================================
  // Tenant Context
  // ===========================================================================

  set_tenant_context(context: TenantContext): void {
    this.current_tenant = context;
  }

  get_tenant_context(): TenantContext {
    if (!this.current_tenant) {
      throw new Error('Tenant context not set');
    }
    return this.current_tenant;
  }

  protected ensure_tenant_context(): TenantContext {
    return this.get_tenant_context();
  }

  // ===========================================================================
  // Task Execution
  // ===========================================================================

  async execute_task(task: LedgerTaskStar, tenant_context: TenantContext): Promise<TaskResult> {
    const start_time = Date.now();
    
    // Set tenant context for this task
    this.set_tenant_context(tenant_context);
    
    console.log(`[${this.config.name}] Executing task: ${task.name} (Tenant: ${tenant_context.tenant_id})`);
    this.profile.status = 'busy';
    this.profile.current_task = task.id;

    // Start Opik trace for this task
    const trace = start_trace(`agent:${this.config.name}`, {
      task_id: task.id,
      tenant_id: tenant_context.tenant_id,
      agent_id: this.config.id,
      input: { task_name: task.name, parameters: task.parameters },
      metadata: {
        capabilities: task.required_capabilities,
        priority: task.priority,
      },
      tags: ['agent', this.config.id, ...task.required_capabilities],
    });

    try {
      // OpenClaw v1.5 policy boundary: validate tenant scope, capability grants,
      // prompt-injection signals, PII handling, financial risk, and approval state
      // before any agent can call tools or mutate financial data.
      const policy_decision = evaluate_agent_policy({
        task,
        tenant_context,
        agent_capabilities: this.config.capabilities,
        approval_id: typeof task.parameters?.approval_id === 'string' ? task.parameters.approval_id : null,
        request_id: typeof task.parameters?.request_id === 'string' ? task.parameters.request_id : null,
      });

      await this.log_audit({
        action: 'agent_policy_decision',
        entity_type: 'agent_policy_decisions',
        entity_id: task.id,
        details: redact_policy_payload(policy_decision.audit_event) as Record<string, unknown>,
      });

      assert_agent_policy_allows(policy_decision);

      // Execute the task only after OpenClaw policy permits it.
      const output = await this.execute(task);

      const duration_ms = Date.now() - start_time;
      console.log(`[${this.config.name}] Task completed in ${duration_ms}ms`);

      this.profile.status = 'idle';
      this.profile.current_task = null;

      // End Opik trace with success
      end_trace(task.id, { success: true, output, duration_ms });

      // Log to audit trail (via database trigger)
      await this.log_audit({
        action: 'task_completed',
        entity_type: 'agent_runs',
        entity_id: task.id,
        details: { agent_id: this.config.id, duration_ms },
      });

      return {
        task_id: task.id,
        success: true,
        output,
        error: null,
        duration_ms,
        agent_id: this.config.id,
        policy_decision,
      };

    } catch (error) {
      const duration_ms = Date.now() - start_time;
      const error_msg = error instanceof Error ? error.message : String(error);
      
      console.error(`[${this.config.name}] Task failed: ${error_msg}`);
      
      this.profile.status = 'idle';
      this.profile.current_task = null;

      // End Opik trace with error
      end_trace(task.id, { success: false, error: error_msg, duration_ms });

      // Log failure to audit trail
      await this.log_audit({
        action: 'task_failed',
        entity_type: 'agent_runs',
        entity_id: task.id,
        details: { agent_id: this.config.id, error: error_msg, duration_ms },
      });

      return {
        task_id: task.id,
        success: false,
        output: {},
        error: error_msg,
        duration_ms,
        agent_id: this.config.id,
      };
    }
  }

  /**
   * Abstract method - implement in subclass
   */
  protected abstract execute(task: LedgerTaskStar): Promise<Record<string, unknown>>;

  // ===========================================================================
  // Audit Logging
  // ===========================================================================

  protected async log_audit(entry: {
    action: string;
    entity_type: string;
    entity_id: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const tenant = this.current_tenant;
    if (!tenant) return;

    console.log('[AUDIT]', {
      tenant_id: tenant.tenant_id,
      user_id: tenant.user_id,
      agent_id: this.config.id,
      ...entry,
      timestamp: new Date().toISOString(),
    });

    const sql = get_db_client();
    if (!sql) return;

    // Log to agent_runs table for run results
    if (entry.entity_type === 'agent_runs') {
      try {
        const status = entry.action === 'task_completed' ? 'completed' : 'failed';
        const duration_ms = entry.details?.duration_ms as number || 0;
        const error = entry.details?.error as string || null;
        await sql`
          INSERT INTO agent_runs (
            id, tenant_id, agent_id, task_id, status, started_at, completed_at, duration_ms, error
          ) VALUES (
            ${uuid()},
            ${tenant.tenant_id},
            ${this.config.id},
            ${entry.entity_id},
            ${status},
            ${new Date(Date.now() - duration_ms).toISOString()},
            ${new Date().toISOString()},
            ${duration_ms},
            ${error}
          )
        `;
      } catch (db_err) {
        console.error('[BaseAgent] Database agent runs logging failed:', db_err);
      }
    }

    // Log to audit_log table, mapping actions to conform to the audit_log check constraint
    try {
      let db_action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'export' | 'import' = 'approve';
      if (entry.action === 'agent_policy_decision') {
        const status = entry.details?.status;
        db_action = status === 'deny' ? 'reject' : 'approve';
      } else if (entry.action === 'task_failed') {
        db_action = 'reject';
      } else if (entry.action === 'task_completed') {
        db_action = 'approve';
      } else if (['create', 'update', 'delete', 'approve', 'reject', 'export', 'import'].includes(entry.action)) {
        db_action = entry.action as any;
      }

      await sql`
        INSERT INTO audit_log (
          id, tenant_id, user_id, action, entity_type, entity_id, changes
        ) VALUES (
          ${uuid()},
          ${tenant.tenant_id},
          ${tenant.user_id},
          ${db_action},
          ${entry.entity_type},
          ${entry.entity_id},
          ${entry.details ? JSON.stringify(entry.details) : null}
        )
      `;
    } catch (db_err) {
      console.error('[BaseAgent] Database audit logging failed:', db_err);
    }
  }

  // ===========================================================================
  // Getters
  // ===========================================================================

  get_profile(): AgentProfile {
    return { ...this.profile };
  }

  get_id(): LedgerAgentId {
    return this.config.id;
  }

  get_name(): string {
    return this.config.name;
  }

  get_capabilities(): LedgerCapability[] {
    return [...this.config.capabilities];
  }

  get_status(): AgentStatus {
    return this.profile.status;
  }

  is_available(): boolean {
    return this.is_connected && this.profile.status === 'idle';
  }
}
