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
    tracing.record_agent_result(tool, { success: false, output: { found: false }, error: 'Missing fixture', duration_ms: 12 });
    tracing.record_llm_usage(span, { input_tokens: 10, output_tokens: 5, total_tokens: 15, cost_usd: 0.01, latency_ms: 42 });
    tracing.end_trace('task-1', { reviewed: true }, 'Review failed');
    assert.equal(tracing.get_active_trace('task-1'), null);
    await tracing.flush_opik();
    const traces = requests.flatMap(request => (request.body.traces || []) as Record<string, unknown>[]);
    const spans = requests.flatMap(request => (request.body.spans || []) as Record<string, unknown>[]);
    assert.equal(traces.length, 1);
    assert.equal(traces[0].name, 'invoice-review');
    assert.deepEqual(traces[0].output, { reviewed: true });
    assert.equal((traces[0].error_info as Record<string, unknown>).message, 'Review failed');
    assert.equal(spans.length, 2);
    assert.ok(spans.every(item => item.trace_id === traces[0].id));
    assert.equal(spans.find(item => item.name === 'lookup')?.parent_span_id, spans.find(item => item.name === 'classify')?.id);
    const lookup = spans.find(item => item.name === 'lookup')!;
    const classify = spans.find(item => item.name === 'classify')!;
    assert.deepEqual(lookup.output, { found: false });
    assert.equal((lookup.error_info as Record<string, unknown>).message, 'Missing fixture');
    assert.equal((lookup.metadata as Record<string, unknown>).success, false);
    assert.equal((lookup.metadata as Record<string, unknown>).duration_ms, 12);
    assert.deepEqual(classify.usage, { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 });
    assert.equal(classify.total_estimated_cost, 0.01);
    assert.equal((classify.metadata as Record<string, unknown>).model, 'fixture-model');
    assert.equal((classify.metadata as Record<string, unknown>).latency_ms, 42);
  } finally {
    process.env = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
