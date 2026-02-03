// file: src/api/routes/activity.ts
// description: Activity feed API endpoints
// reference: src/api/server.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';

export function create_activity_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono();

  // GET /api/activity
  app.get('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    
    if (!tenant_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const agent_id = c.req.query('agent_id');
    const entity_type = c.req.query('entity_type');

    try {
      let query = sql`
        SELECT 
          id,
          agent_id,
          user_id,
          action,
          entity_type,
          entity_id,
          description,
          metadata,
          created_at
        FROM activity_log
        WHERE tenant_id = ${tenant_id}
      `;

      if (agent_id) {
        query = sql`${query} AND agent_id = ${agent_id}`;
      }

      if (entity_type) {
        query = sql`${query} AND entity_type = ${entity_type}`;
      }

      const activities = await sql`
        ${query}
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Only run COUNT query if pagination info is needed (offset > 0 or limit is high)
      // This optimizes performance for simple recent activity queries
      let total = null;
      if (offset > 0 || limit > 20) {
        const [{ count }] = await sql`
          SELECT COUNT(*) as count
          FROM activity_log
          WHERE tenant_id = ${tenant_id}
        `;
        total = count;
      }

      return c.json({
        activities,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error('Activity feed error:', error);
      return c.json({ error: 'Failed to fetch activity feed' }, 500);
    }
  });

  // POST /api/activity (create activity log entry)
  app.post('/', async (c) => {
    const tenant_id = c.get('tenant_id');
    const user_id = c.get('user_id');
    
    if (!tenant_id || !user_id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { agent_id, action, entity_type, entity_id, description, metadata } = body;

    try {
      const [activity] = await sql`
        INSERT INTO activity_log (
          tenant_id, agent_id, user_id, action, entity_type, entity_id, description, metadata
        )
        VALUES (
          ${tenant_id}, ${agent_id}, ${user_id}, ${action}, ${entity_type}, 
          ${entity_id}, ${description}, ${JSON.stringify(metadata || {})}
        )
        RETURNING *
      `;

      return c.json(activity, 201);
    } catch (error) {
      console.error('Activity log creation error:', error);
      return c.json({ error: 'Failed to create activity log' }, 500);
    }
  });

  return app;
}
