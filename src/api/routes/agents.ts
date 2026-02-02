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

    return c.json({
      agents: profiles,
      total: profiles.length,
      active: profiles.filter(p => p.status === 'busy').length,
      idle: profiles.filter(p => p.status === 'idle').length,
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
