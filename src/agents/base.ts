// file: src/agents/base.ts
// description: Base agent class for ClawKeeper with tenant context, audit logging, and Opik observability
// reference: src/core/types.ts, src/core/observability.ts

import { v4 as uuid } from 'uuid';
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
      // Validate capabilities
      const missing_caps = task.required_capabilities.filter(
        cap => !this.config.capabilities.includes(cap)
      );
      if (missing_caps.length > 0) {
        throw new Error(`Missing capabilities: ${missing_caps.join(', ')}`);
      }

      // Validate tenant access
      if (task.tenant_id !== tenant_context.tenant_id && tenant_context.user_role !== 'super_admin') {
        throw new Error('Tenant isolation violation');
      }

      // Execute the task
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
    // Audit logging will be implemented via database client
    // For now, log to console
    const tenant = this.current_tenant;
    if (!tenant) return;

    console.log('[AUDIT]', {
      tenant_id: tenant.tenant_id,
      user_id: tenant.user_id,
      agent_id: this.config.id,
      ...entry,
      timestamp: new Date().toISOString(),
    });
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
