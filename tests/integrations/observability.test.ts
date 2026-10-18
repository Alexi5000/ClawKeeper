import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';

test('Opik tracing flushes task and nested spans to a self-hosted endpoint', async () => {
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    requests.push({ path: request.url || '', body: JSON.parse(Buffer.concat(chunks).toString()) });
    response.writeHead(204).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const previous = { ...process.env };
  process.env.OPIK_ENABLED = 'true';
  process.env.OPIK_BASE_URL = `http://127.0.0.1:${address.port}/api`;
  process.env.OPIK_API_KEY = 'offline-test';
  process.env.OPIK_PROJECT_NAME = 'offline-regression';
  try {
    const tracing = await import('../../src/core/observability');
    const trace = tracing.start_trace('invoice-review', { task_id: 'task-1', input: { invoice: 'fixture' } });
    assert.ok(trace);
    assert.equal(tracing.get_active_trace('task-1'), trace);
    const span = tracing.start_llm_span(trace, { name: 'classify', model: 'fixture-model', input: { prompt: 'fixture' } });
    const tool = tracing.start_tool_span(span, { name: 'lookup', input: { id: 'fixture' } });
    tool.end();
    span.end();
    tracing.end_trace('task-1');
    assert.equal(tracing.get_active_trace('task-1'), null);
    await tracing.flush_opik();
    const traces = requests.flatMap(request => (request.body.traces || []) as Record<string, unknown>[]);
    const spans = requests.flatMap(request => (request.body.spans || []) as Record<string, unknown>[]);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].name, 'invoice-review');
    assert.equal(spans.length, 2);
    assert.ok(spans.every(item => item.trace_id === traces[0].id));
    assert.equal(spans.find(item => item.name === 'lookup')?.parent_span_id, spans.find(item => item.name === 'classify')?.id);
  } finally {
    process.env = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
