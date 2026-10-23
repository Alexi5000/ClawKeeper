import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { createTenantDatabase } from '../../src/api/tenant-database';
import type { AppEnv } from '../../src/types/hono';

test('tenant transactions isolate pooled PostgreSQL requests', {
  skip: !process.env.RLS_TEST_DATABASE,
}, async t => {
  const admin = postgres(process.env.RLS_TEST_DATABASE!, { max: 1 });
  const schema = 'rls_request_test';
  const role = 'rls_request_client';
  const originalEnv = { JWT_SECRET: process.env.JWT_SECRET, OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_BASE_URL: process.env.OPENAI_BASE_URL };
  process.env.JWT_SECRET = 'synthetic-rls-regression-secret';
  let pool: ReturnType<typeof postgres> | undefined;
  const tenantA = '00000000-0000-0000-0000-000000000001';
  const tenantB = '00000000-0000-0000-0000-000000000002';
  try {
    await admin.unsafe(`CREATE ROLE ${role} NOLOGIN; CREATE SCHEMA ${schema}; SET search_path TO ${schema};
      CREATE TABLE invoices(id integer, tenant_id uuid);
      ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA ${schema} TO ${role};
      GRANT SELECT, INSERT ON invoices TO ${role};`);
    const policies = await readFile(new URL('../../db/rls.sql', import.meta.url), 'utf8');
    await admin.unsafe(policies.slice(policies.indexOf('CREATE OR REPLACE FUNCTION current_tenant_id'), policies.indexOf('-- Tenant Policies')));
    await admin.unsafe(policies.slice(policies.indexOf('CREATE POLICY invoice_tenant_isolation'), policies.indexOf('-- Reconciliation Policies')));
    await admin`INSERT INTO invoices VALUES (1, ${tenantA}), (2, ${tenantB})`;
    pool = postgres(process.env.RLS_TEST_DATABASE!, {
      max: 4, connection: { options: `-c role=${role} -c search_path=${schema}` },
    });
    const { sql, middleware, run } = createTenantDatabase(pool);
    const app = new Hono<AppEnv>();
    app.use('/api/*', middleware);
    app.get('/api/rows', async c => {
      await sql`SELECT pg_sleep(0.005)`;
      const rows = await sql`SELECT * FROM invoices ORDER BY id`;
      const [context] = await sql`SELECT current_setting('app.current_tenant_id') AS tenant,
        current_setting('app.current_user_id') AS user_id, current_setting('app.current_user_role') AS role`;
      return c.json({ rows, context });
    });
    app.post('/api/rollback', async c => {
      await sql`INSERT INTO invoices VALUES (3, ${c.get('tenant_id')})`;
      return c.json({ error: 'rejected' }, 409);
    });
    app.post('/api/error', async () => {
      await sql`INSERT INTO invoices VALUES (4, ${tenantA})`;
      throw new Error('synthetic handler failure');
    });
    app.get('/api/auth/login', c => c.json({ public: true }));
    const authorization = (tenant: string, roleName = 'tenant_admin') => ({
      Authorization: 'Bearer ' + jwt.sign({ tenant_id: tenant, user_id: tenant, role: roleName }, process.env.JWT_SECRET!),
    });
    await t.test('concurrent tenants only read their own rows and claims', async () => {
      await Promise.all(Array.from({ length: 40 }, async (_, index) => {
        const tenant = index % 2 ? tenantA : tenantB;
        const response = await app.request('/api/rows', { headers: authorization(tenant) });
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.rows.length, 1);
        assert.equal(body.rows[0].tenant_id, tenant);
        assert.deepEqual(body.context, { tenant, user_id: tenant, role: 'tenant_admin' });
      }));
    });
    await t.test('failed responses and thrown handlers roll back writes', async () => {
      assert.equal((await app.request('/api/rollback', { method: 'POST', headers: authorization(tenantA) })).status, 409);
      assert.equal((await app.request('/api/error', { method: 'POST', headers: authorization(tenantA) })).status, 500);
      assert.equal((await admin`SELECT * FROM invoices WHERE id IN (3, 4)`).length, 0);
    });
    await t.test('real agent SSE route logs within a new tenant transaction after response', async () => {
      await admin.unsafe(`CREATE TABLE agent_runs (
        tenant_id uuid, agent_id text, task_id text, status text,
        started_at timestamptz, completed_at timestamptz, duration_ms integer,
        tokens_used integer, cost numeric, error text);
        ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY tenant_boundary ON agent_runs USING (tenant_id = current_tenant_id());
        GRANT SELECT, INSERT ON agent_runs TO ${role};`);
      process.env.OPENAI_API_KEY = 'synthetic-test-value';
      process.env.OPENAI_BASE_URL = 'http://127.0.0.1:1';
      const { agent_routes } = await import('../../src/api/routes/agents');
      const { orchestration_service } = await import('../../src/agents/orchestration_service');
      const original = orchestration_service.execute_plan;
      const originalGetPlan = orchestration_service.get_plan;
      orchestration_service.get_plan = (plan_id: string) => ({ plan_id } as ReturnType<typeof originalGetPlan>);
      orchestration_service.execute_plan = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'completed', total_duration_ms: 1 } as Awaited<ReturnType<typeof original>>;
      };
      try {
        const streamingApp = new Hono<AppEnv>();
        streamingApp.use('/api/*', middleware);
        streamingApp.route('/api/agents', agent_routes(sql, run));
        const responses = await Promise.all([tenantA, tenantB].map(tenant =>
          streamingApp.request('/api/agents/orchestrate/execute/test-plan/stream', {
            method: 'POST', headers: authorization(tenant),
          })));
        for (const response of responses) {
          assert.equal(response.status, 200);
          const body = await response.text();
          assert.match(body, /event: result/);
          assert.doesNotMatch(body, /event: error/);
        }
        const rows = await admin`SELECT tenant_id FROM agent_runs ORDER BY tenant_id`;
        assert.deepEqual(rows.map(row => row.tenant_id), [tenantA, tenantB]);
      } finally {
        orchestration_service.execute_plan = original;
        orchestration_service.get_plan = originalGetPlan;
      }
    });
    await t.test('context is reset before pool reuse and public requests', async () => {
      const contexts = await Promise.all(Array.from({ length: 8 }, () => pool!`
        SELECT nullif(current_setting('app.current_tenant_id', true), '') AS tenant,
               nullif(current_setting('app.current_user_role', true), '') AS role
      `));
      assert.ok(contexts.every(rows => rows[0].tenant === null && rows[0].role === null));
      assert.equal((await app.request('/api/auth/login')).status, 200);
      assert.equal((await pool!`SELECT * FROM invoices`).length, 0);
    });
    await t.test('claim strings cannot become SQL and missing claims are rejected', async () => {
      const quotedRole = "viewer'; SELECT set_config('app.current_user_role','admin',false); --";
      const response = await app.request('/api/rows', { headers: authorization(tenantA, quotedRole) });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).context.role, quotedRole);
      assert.equal((await app.request('/api/rows')).status, 401);
      const token = jwt.sign({ tenant_id: tenantA }, process.env.JWT_SECRET!);
      assert.equal((await app.request('/api/rows', { headers: { Authorization: 'Bearer ' + token } })).status, 401);
    });
    await t.test('database setup failures prevent handler execution', async () => {
      const unavailable = postgres({ host: '127.0.0.1', port: 1, connect_timeout: 1 });
      let reached = false;
      const failedApp = new Hono<AppEnv>();
      failedApp.use('*', createTenantDatabase(unavailable).middleware);
      failedApp.get('/api/protected', c => { reached = true; return c.json({ ok: true }); });
      try {
        const response = await failedApp.request('/api/protected', { headers: authorization(tenantA) });
        assert.equal(response.status, 503);
        assert.equal(reached, false);
      } finally { await unavailable.end({ timeout: 1 }); }
    });
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (pool) await pool.end();
    await admin.unsafe(`DROP SCHEMA IF EXISTS ${schema} CASCADE; DROP ROLE IF EXISTS ${role}`);
    await admin.end();
  }
});
