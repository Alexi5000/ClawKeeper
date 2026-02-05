// file: src/api/routes/agents.ts
// description: Agent status and management routes for ClawKeeper API
// reference: src/agents/index.ts, src/agents/orchestration_service.ts

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Sql } from 'postgres';
import { agent_runtime } from '../../agents/index';
import { orchestration_service } from '../../agents/orchestration_service';
import type { ExecutionEvent } from '../../agents/orchestration_service';
import type { AppEnv } from '../../types/hono';
import type { LedgerTaskStar } from '../../core/types';
import { get_agent_templates } from '../../agents/task_templates';

export function agent_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // Get all agent statuses
  app.get('/status', async (c) => {
    const profiles = agent_runtime.get_all_profiles();
    const counts = agent_runtime.get_agent_count();
    
    // Organize agents by type
    const ceo = profiles.filter(p => p.id === 'clawkeeper');
    const orchestrators = profiles.filter(p => 
      ['cfo', 'accounts_payable_lead', 'accounts_receivable_lead', 'reconciliation_lead',
       'compliance_lead', 'reporting_lead', 'integration_lead', 'data_etl_lead', 'support_lead'].includes(p.id)
    );
    const workers = profiles.filter(p => 
      !['clawkeeper', 'cfo', 'accounts_payable_lead', 'accounts_receivable_lead', 'reconciliation_lead',
        'compliance_lead', 'reporting_lead', 'integration_lead', 'data_etl_lead', 'support_lead'].includes(p.id)
    );
    
    return c.json({
      status: 'online',
      counts,
      agents: {
        ceo,
        orchestrators,
        workers,
      },
      summary: {
        total: profiles.length,
        idle: profiles.filter(p => p.status === 'idle').length,
        busy: profiles.filter(p => p.status === 'busy').length,
        offline: profiles.filter(p => p.status === 'offline').length,
        error: profiles.filter(p => p.status === 'error').length,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Get specific agent status
  app.get('/:id/status', async (c) => {
    const agent_id = c.req.param('id') as any;

    try {
      const agent = await agent_runtime.get_agent(agent_id);
      const profile = agent.get_profile();

      return c.json({ agent: profile });
    } catch (error) {
      return c.json({ error: 'Agent not found' }, 404);
    }
  });

  // Execute agent task
  app.post('/:id/execute', async (c) => {
    const agent_id = c.req.param('id') as any;
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const user_role = c.get('user_role') || 'tenant_admin';

    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const { task_name, description, parameters, priority } = await c.req.json();

      // Build task object
      const task: LedgerTaskStar = {
        id: crypto.randomUUID(),
        tenant_id,
        name: task_name,
        description,
        required_capabilities: [],
        assigned_agent: agent_id,
        status: 'assigned',
        priority: priority || 'normal',
        input: parameters || {},
        output: null,
        dependencies: [],
        created_at: new Date().toISOString(),
        started_at: null,
        completed_at: null,
        error: null,
        retry_count: 0,
        max_retries: 3,
      };

      // Get agent and execute task
      const agent = await agent_runtime.get_agent(agent_id);
      const result = await agent.execute_task(task, {
        tenant_id,
        user_id,
        user_role,
      });

      // Log to agent_runs table
      await sql`
        INSERT INTO agent_runs (
          tenant_id, agent_id, task_id, status, started_at, completed_at,
          duration_ms, tokens_used, cost, error
        ) VALUES (
          ${tenant_id}, ${agent_id}, ${result.task_id},
          ${result.success ? 'completed' : 'failed'},
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${result.duration_ms},
          ${result.tokens_used || 0},
          ${result.cost || 0},
          ${result.error || null}
        )
      `;

      return c.json(result);
    } catch (error: any) {
      console.error('Agent execution error:', error);
      return c.json({ 
        error: 'Failed to execute agent task',
        message: error.message 
      }, 500);
    }
  });

  // Get agent execution history
  app.get('/:id/runs', async (c) => {
    const agent_id = c.req.param('id');
    const tenant_id = c.get('tenant_id');

    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const limit = parseInt(c.req.query('limit') || '20');
      const offset = parseInt(c.req.query('offset') || '0');

      const runs = await sql`
        SELECT * FROM agent_runs
        WHERE tenant_id = ${tenant_id} AND agent_id = ${agent_id}
        ORDER BY started_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const [{ count }] = await sql`
        SELECT COUNT(*) as count FROM agent_runs
        WHERE tenant_id = ${tenant_id} AND agent_id = ${agent_id}
      `;

      return c.json({ runs, total: count, limit, offset });
    } catch (error: any) {
      console.error('Get agent runs error:', error);
      return c.json({ error: 'Failed to fetch agent runs' }, 500);
    }
  });

  // Get task templates for agent
  app.get('/:id/templates', async (c) => {
    const agent_id = c.req.param('id');

    try {
      const templates = get_agent_templates(agent_id);
      return c.json({ templates });
    } catch (error: any) {
      console.error('Get templates error:', error);
      return c.json({ templates: [] });
    }
  });

  // ============================================================================
  // Orchestration Endpoints - Command Center
  // ============================================================================

  // Create execution plan from natural language command
  app.post('/orchestrate/plan', async (c) => {
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const user_role = c.get('user_role') || 'tenant_admin';

    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const { command } = await c.req.json();

      if (!command || typeof command !== 'string' || command.trim().length === 0) {
        return c.json({ error: 'Command is required' }, 400);
      }

      const plan = await orchestration_service.create_plan(command.trim(), {
        tenant_id,
        user_id,
        user_role,
      });

      return c.json({ plan });
    } catch (error: any) {
      console.error('Create plan error:', error);
      return c.json({ 
        error: 'Failed to create execution plan',
        message: error.message 
      }, 500);
    }
  });

  // Get execution plan
  app.get('/orchestrate/plan/:plan_id', async (c) => {
    const plan_id = c.req.param('plan_id');

    const plan = orchestration_service.get_plan(plan_id);
    if (!plan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    return c.json({ plan });
  });

  // Execute plan (non-streaming)
  app.post('/orchestrate/execute/:plan_id', async (c) => {
    const plan_id = c.req.param('plan_id');
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const user_role = c.get('user_role') || 'tenant_admin';

    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const result = await orchestration_service.execute_plan(plan_id, {
        tenant_id,
        user_id,
        user_role,
      });

      // Log orchestration run to database
      await sql`
        INSERT INTO agent_runs (
          tenant_id, agent_id, task_id, status, started_at, completed_at,
          duration_ms, tokens_used, cost, error
        ) VALUES (
          ${tenant_id}, 'clawkeeper', ${plan_id},
          ${result.status === 'completed' ? 'completed' : 'failed'},
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${result.total_duration_ms},
          ${0},
          ${0},
          ${result.status === 'failed' ? 'Orchestration failed' : null}
        )
      `;

      return c.json({ result });
    } catch (error: any) {
      console.error('Execute plan error:', error);
      return c.json({ 
        error: 'Failed to execute plan',
        message: error.message 
      }, 500);
    }
  });

  // Execute plan with SSE streaming
  app.post('/orchestrate/execute/:plan_id/stream', async (c) => {
    const plan_id = c.req.param('plan_id');
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const user_role = c.get('user_role') || 'tenant_admin';

    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return streamSSE(c, async (stream) => {
      let is_closed = false;

      const event_handler = (event: ExecutionEvent) => {
        if (is_closed) return;
        
        stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        }).catch(() => {
          is_closed = true;
        });
      };

      try {
        // Start execution with event streaming
        const result = await orchestration_service.execute_plan(
          plan_id,
          { tenant_id, user_id, user_role },
          event_handler
        );

        // Send final result
        await stream.writeSSE({
          event: 'result',
          data: JSON.stringify(result),
        });

        // Log to database
        await sql`
          INSERT INTO agent_runs (
            tenant_id, agent_id, task_id, status, started_at, completed_at,
            duration_ms, tokens_used, cost, error
          ) VALUES (
            ${tenant_id}, 'clawkeeper', ${plan_id},
            ${result.status === 'completed' ? 'completed' : 'failed'},
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${result.total_duration_ms},
            ${0},
            ${0},
            ${result.status === 'failed' ? 'Orchestration failed' : null}
          )
        `;

      } catch (error: any) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: error.message }),
        });
      }
    });
  });

  // Quick orchestrate - create plan and execute immediately
  app.post('/orchestrate', async (c) => {
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    const user_role = c.get('user_role') || 'tenant_admin';

    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const { command, auto_execute = false } = await c.req.json();

      if (!command || typeof command !== 'string' || command.trim().length === 0) {
        return c.json({ error: 'Command is required' }, 400);
      }

      // Create plan
      const plan = await orchestration_service.create_plan(command.trim(), {
        tenant_id,
        user_id,
        user_role,
      });

      // If auto_execute, run immediately
      if (auto_execute) {
        const result = await orchestration_service.execute_plan(plan.plan_id, {
          tenant_id,
          user_id,
          user_role,
        });

        return c.json({ plan, result });
      }

      return c.json({ plan });
    } catch (error: any) {
      console.error('Orchestrate error:', error);
      return c.json({ 
        error: 'Failed to orchestrate command',
        message: error.message 
      }, 500);
    }
  });

  return app;
}
