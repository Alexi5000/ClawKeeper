// file: src/api/routes/reconciliation.ts
// description: Bank reconciliation routes for ClawKeeper API
// reference: src/core/types.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import { v4 as uuid } from 'uuid';
import type { AppEnv } from '../../types/hono';

export function reconciliation_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // Start reconciliation task
  app.post('/start', async (c) => {
    const tenant_id = c.get('tenant_id');
    const { account_id, start_date, end_date } = await c.req.json();

    // Verify account belongs to tenant
    const [account] = await sql`
      SELECT *
      FROM accounts
      WHERE id = ${account_id}
      AND tenant_id = ${tenant_id}
    `;

    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    // Create reconciliation task
    const task_id = uuid();
    const [task] = await sql`
      INSERT INTO reconciliation_tasks (
        id, tenant_id, account_id, period_start, period_end, status
      )
      VALUES (
        ${task_id},
        ${tenant_id},
        ${account_id},
        ${start_date},
        ${end_date},
        'pending'
      )
      RETURNING *
    `;

    // Trigger reconciliation agent (via ClawKeeper)
    // For now, return task ID for polling

    return c.json({
      message: 'Reconciliation task created',
      task_id: task.id,
      status: task.status,
    });
  });

  // Get reconciliation status
  app.get('/:id/status', async (c) => {
    const task_id = c.req.param('id');
    const tenant_id = c.get('tenant_id');

    const [task] = await sql`
      SELECT *
      FROM reconciliation_tasks
      WHERE id = ${task_id}
      AND tenant_id = ${tenant_id}
    `;

    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({
      task: {
        id: task.id,
        account_id: task.account_id,
        period: {
          start: task.period_start,
          end: task.period_end,
        },
        status: task.status,
        matched_count: task.matched_count,
        unmatched_count: task.unmatched_count,
        discrepancies: task.discrepancies,
        completed_at: task.completed_at,
      },
    });
  });

  return app;
}
