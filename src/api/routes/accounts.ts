// file: src/api/routes/accounts.ts
// description: Account management routes for ClawKeeper API
// reference: src/core/types.ts

import { Hono } from 'hono';
import type { Sql } from 'postgres';
import type { AppEnv } from '../../types/hono';

export function account_routes(sql: Sql<Record<string, unknown>>) {
  const app = new Hono<AppEnv>();

  // List accounts (tenant-scoped via RLS)
  app.get('/', async (c) => {
    const tenant_id = c.get('tenant_id');

    const accounts = await sql`
      SELECT *
      FROM accounts
      WHERE tenant_id = ${tenant_id}
      ORDER BY name ASC
    `;

    return c.json({ data: accounts });
  });

  // Get single account
  app.get('/:id', async (c) => {
    const account_id = c.req.param('id');
    const tenant_id = c.get('tenant_id');

    const [account] = await sql`
      SELECT *
      FROM accounts
      WHERE id = ${account_id}
      AND tenant_id = ${tenant_id}
    `;

    if (!account) {
      return c.json({ error: 'Account not found' }, 404);
    }

    return c.json({ data: account });
  });

  return app;
}
