// file: src/api/routes/agents.ts
// description: Agent status and management routes for ClawKeeper API
// reference: src/agents/index.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { agent_runtime } from '../../agents/index';
import type { AppEnv } from '../../types/hono';

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

  return app;
}
