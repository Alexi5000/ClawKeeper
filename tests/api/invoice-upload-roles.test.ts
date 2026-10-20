import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from 'hono';
import type { Sql } from 'postgres';
import type { AppEnv } from '../../src/types/hono';
import { invoice_routes } from '../../src/api/routes/invoices';

for (const role of ['viewer', '', 'accountant', 'tenant_admin', 'super_admin']) {
  test(`invoice upload authorizes ${role || 'missing role'} before parsing or OCR`, async () => {
    let queries = 0;
    const sql = (() => { queries++; throw new Error('Unexpected query'); }) as unknown as Sql<Record<string, unknown>>;
    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('tenant_id', '00000000-0000-0000-0000-000000000001');
      c.set('user_role', role);
      await next();
    });
    app.route('/invoices', invoice_routes(sql));
    const response = await app.request('/invoices/upload', { method: 'POST' });
    assert.equal(response.status, ['viewer', ''].includes(role) ? 403 : 400);
    assert.equal(queries, 0);
  });
}
