// file: src/api/routes/agents.ts
// description: Agent status and management routes for ClawKeeper API
// reference: src/agents/index.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { agent_runtime } from '../../agents/index';
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

  return app;
}
