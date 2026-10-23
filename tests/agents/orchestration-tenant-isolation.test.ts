// file: tests/agents/orchestration-tenant-isolation.test.ts
// description: Regression tests binding orchestration plans to the creating tenant
// reference: src/agents/orchestration_service.ts, src/api/routes/agents.ts

import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Hono } from 'hono';
import type { AppEnv } from '../../src/types/hono';

const tenantA = '00000000-0000-0000-0000-0000000000a1';
const tenantB = '00000000-0000-0000-0000-0000000000b2';
const marker = 'synthetic-plan-marker-7f3c';

let llmServer: Server;
let service: typeof import('../../src/agents/orchestration_service');
let routes: typeof import('../../src/api/routes/agents');

// Minimal OpenAI-compatible stub so create_plan runs without a real provider.
before(async () => {
  llmServer = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      id: 'stub', object: 'chat.completion', created: 0, model: 'stub',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'no tasks' } }],
    }));
  });
  await new Promise<void>(resolve => llmServer.listen(0, '127.0.0.1', resolve));
  const { port } = llmServer.address() as AddressInfo;
  process.env.DEEPSEEK_API_KEY = 'synthetic-test-value';
  process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${port}/v1`;
  service = await import('../../src/agents/orchestration_service');
  routes = await import('../../src/api/routes/agents');
});

after(async () => {
  await new Promise<void>(resolve => llmServer.close(() => resolve()));
});

function ctx(tenant_id: string) {
  return { tenant_id, user_id: tenant_id, user_role: 'tenant_admin' };
}

function buildApp() {
  const app = new Hono<AppEnv>();
  // Stand-in for the tenant middleware: claims come from a test header.
  app.use('/api/*', async (c, next) => {
    const tenant = c.req.header('x-test-tenant');
    if (tenant) {
      c.set('tenant_id', tenant);
      c.set('user_id', tenant);
      c.set('user_role', 'tenant_admin');
    }
    await next();
  });
  const unusedSql = (() => { throw new Error('database must not be reached'); }) as never;
  const unusedRunner = (async () => { throw new Error('database must not be reached'); }) as never;
  app.route('/api/agents', routes.agent_routes(unusedSql, unusedRunner));
  return app;
}

describe('orchestration plan tenant binding', () => {
  test('get_plan only returns plans to the creating tenant', async () => {
    const plan = await service.orchestration_service.create_plan(marker, ctx(tenantA));
    assert.equal(service.orchestration_service.get_plan(plan.plan_id, tenantA)?.command, marker);
    assert.equal(service.orchestration_service.get_plan(plan.plan_id, tenantB), null);
    assert.equal(service.orchestration_service.get_plan(plan.plan_id, ''), null);
  });

  test('execute_plan rejects a foreign tenant as not found', async () => {
    const plan = await service.orchestration_service.create_plan(marker, ctx(tenantA));
    await assert.rejects(
      service.orchestration_service.execute_plan(plan.plan_id, ctx(tenantB)),
      service.PlanNotFoundError,
    );
    assert.equal(service.orchestration_service.get_plan(plan.plan_id, tenantA)?.status, 'pending');
  });

  test('GET plan route returns 200 to owner and 404 to other tenants', async () => {
    const app = buildApp();
    const created = await app.request('/api/agents/orchestrate/plan', {
      method: 'POST',
      headers: { 'x-test-tenant': tenantA, 'content-type': 'application/json' },
      body: JSON.stringify({ command: marker }),
    });
    assert.equal(created.status, 200);
    const { plan } = await created.json();

    const own = await app.request(`/api/agents/orchestrate/plan/${plan.plan_id}`, { headers: { 'x-test-tenant': tenantA } });
    assert.equal(own.status, 200);
    assert.equal((await own.json()).plan.command, marker);

    const foreign = await app.request(`/api/agents/orchestrate/plan/${plan.plan_id}`, { headers: { 'x-test-tenant': tenantB } });
    assert.equal(foreign.status, 404);
    assert.doesNotMatch(await foreign.text(), new RegExp(marker));

    const missing = await app.request('/api/agents/orchestrate/plan/00000000-0000-4000-8000-000000000000', { headers: { 'x-test-tenant': tenantA } });
    assert.equal(missing.status, 404);

    const anonymous = await app.request(`/api/agents/orchestrate/plan/${plan.plan_id}`);
    assert.equal(anonymous.status, 401);
  });

  test('execute routes return 404 for a foreign tenant without running tasks', async () => {
    const app = buildApp();
    const plan = await service.orchestration_service.create_plan(marker, ctx(tenantA));

    const execute = await app.request(`/api/agents/orchestrate/execute/${plan.plan_id}`, {
      method: 'POST', headers: { 'x-test-tenant': tenantB },
    });
    assert.equal(execute.status, 404);

    const stream = await app.request(`/api/agents/orchestrate/execute/${plan.plan_id}/stream`, {
      method: 'POST', headers: { 'x-test-tenant': tenantB },
    });
    assert.equal(stream.status, 404);
    assert.doesNotMatch(await stream.text(), new RegExp(marker));

    assert.equal(service.orchestration_service.get_plan(plan.plan_id, tenantA)?.status, 'pending');
  });
});
