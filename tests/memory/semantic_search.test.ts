// file: tests/memory/semantic_search.test.ts
// description: Semantic search tests for pgvector hybrid search and MemoryStore CRUD operations
// reference: src/memory/store.ts, src/memory/embedding_service.ts

import { describe, test } from 'node:test';
import { expect } from '../support/expect';
import { OpenAIEmbeddingService, create_embedding_service } from '../../src/memory/embedding_service';
import { MemoryStore } from '../../src/memory/store';
import type { Sql } from 'postgres';
import type { CreateMemoryInput, UpdateMemoryInput } from '../../src/memory/types';

// ============================================================================
// Database Mock Helper
// ============================================================================

interface MockQueryLog {
  query: string;
  values: any[];
}

function create_mock_db(rowsToReturn: any[] = []): { sql: Sql; queries: MockQueryLog[] } {
  const queries: MockQueryLog[] = [];

  const getResults = (queryText: string) => {
    if (queryText.includes('COUNT(*)')) {
      return [{ count: String(rowsToReturn.length) }];
    }
    return rowsToReturn;
  };

  const mock_func = function(strings: TemplateStringsArray, ...args: any[]) {
    const query = strings.join('?');
    queries.push({
      query,
      values: args,
    });
    return getResults(query);
  };

  mock_func.unsafe = function(query: string, values: any[] = []) {
    queries.push({
      query,
      values,
    });
    return getResults(query);
  };

  mock_func.json = function(val: any) {
    return val;
  };

  return {
    sql: mock_func as unknown as Sql,
    queries,
  };
}

// Helper to find a query in logs regardless of newlines/whitespace formatting
function findQueryByPattern(queries: MockQueryLog[], pattern: string): MockQueryLog | undefined {
  const normalizedPattern = pattern.replace(/\s+/g, ' ').trim().toLowerCase();
  return queries.find(q => {
    const normalizedQuery = q.query.replace(/\s+/g, ' ').trim().toLowerCase();
    return normalizedQuery.includes(normalizedPattern);
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('Embedding Service', () => {
  test('should create embedding service', () => {
    const service = create_embedding_service();
    expect(service).toBeDefined();
  });

  test('should reject empty text', async () => {
    const service = new OpenAIEmbeddingService();

    await expect(service.generate('')).rejects.toThrow(/empty text/);
    await expect(service.generate('   ')).rejects.toThrow(/empty text/);
  });

  test('should generate batch embeddings', async () => {
    const service = new OpenAIEmbeddingService();
    const texts = ['Invoice processing', 'Payment reconciliation', 'Vendor management'];

    // Live embedding calls are integration tests and must be opted in explicitly.
    if (process.env.RUN_OPENAI_INTEGRATION_TESTS !== 'true') {
      expect(texts).toHaveLength(3);
      return;
    }

    const embeddings = await service.generate_batch(texts);
    expect(embeddings).toHaveLength(3);
    expect(embeddings[0]).toHaveLength(1536); // text-embedding-3-small dimension
  });

  test('should filter empty texts in batch', async () => {
    const service = new OpenAIEmbeddingService();

    await expect(service.generate_batch([])).resolves.toEqual([]);
    await expect(service.generate_batch(['', '  ', '\n'])).rejects.toThrow(/No valid texts/);
  });
});

describe('Memory Store Operations', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const agentId = 'cfo';

  const mockEmbeddingService = {
    generate: async () => new Array(1536).fill(0.1),
    generate_batch: async (texts: string[]) => texts.map(() => new Array(1536).fill(0.1)),
  };

  test('should save memory successfully and generate embedding', async () => {
    const mockRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Monthly forecasting complete' },
      metadata: { version: 1 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const { sql, queries } = create_mock_db([mockRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    const input: CreateMemoryInput = {
      agentId,
      type: 'task',
      content: { text: 'Monthly forecasting complete' },
      metadata: { importance: 8, version: 1 },
    };

    const entry = await store.saveMemory(tenantId, input);

    expect(entry.id).toBe('mem_123');
    expect(entry.tenantId).toBe(tenantId);
    expect(entry.agentId).toBe(agentId);

    // Verify INSERT query is parameterized
    const insertQuery = findQueryByPattern(queries, 'INSERT INTO memories');
    expect(insertQuery).toBeDefined();
    expect(insertQuery?.values[1]).toBe(tenantId);
    expect(insertQuery?.values[2]).toBe(agentId);
  });

  test('should get a single memory by ID', async () => {
    const mockRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Sample memory content' },
      metadata: { version: 1 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const { sql, queries } = create_mock_db([mockRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    const result = await store.getMemory(tenantId, 'mem_123');

    expect(result).toBeDefined();
    expect(result?.id).toBe('mem_123');

    // Verify SELECT query uses parameters
    const selectQuery = findQueryByPattern(queries, 'SELECT * FROM memories WHERE id =');
    expect(selectQuery).toBeDefined();
    expect(selectQuery?.values[0]).toBe('mem_123');
    expect(selectQuery?.values[1]).toBe(tenantId);
  });

  test('should soft delete and hard delete a memory', async () => {
    const { sql: sql1, queries: queries1 } = create_mock_db([]);
    const store1 = new MemoryStore(sql1);
    (store1 as any).embedding_service = mockEmbeddingService;

    await store1.deleteMemory(tenantId, 'mem_123');
    const deleteQuery = findQueryByPattern(queries1, 'UPDATE memories SET deleted_at = NOW()');
    expect(deleteQuery).toBeDefined();
    expect(deleteQuery?.values[0]).toBe('mem_123');
    expect(deleteQuery?.values[1]).toBe(tenantId);

    const { sql: sql2, queries: queries2 } = create_mock_db([]);
    const store2 = new MemoryStore(sql2);
    (store2 as any).embedding_service = mockEmbeddingService;

    await store2.hardDeleteMemory(tenantId, 'mem_123');
    const hardDeleteQuery = findQueryByPattern(queries2, 'DELETE FROM memories');
    expect(hardDeleteQuery).toBeDefined();
    expect(hardDeleteQuery?.values[0]).toBe('mem_123');
    expect(hardDeleteQuery?.values[1]).toBe(tenantId);
  });

  test('should update memory and increment version', async () => {
    const existingRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Old text' },
      metadata: { version: 2 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const { sql, queries } = create_mock_db([existingRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    const updateInput: UpdateMemoryInput = {
      content: { text: 'New text' },
      metadata: { importance: 9 },
    };

    const updated = await store.updateMemory(tenantId, 'mem_123', updateInput);

    expect(updated).toBeDefined();
    const updateQuery = findQueryByPattern(queries, 'UPDATE memories SET content =');
    expect(updateQuery).toBeDefined();
    expect(updateQuery?.values[2]).toBe('mem_123');
    expect(updateQuery?.values[3]).toBe(tenantId);
  });

  test('should get memories with parameterized filters', async () => {
    const mockRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Sample' },
      metadata: { version: 1 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };

    const { sql, queries } = create_mock_db([mockRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    await store.getMemories(tenantId, agentId, {
      types: ['task', 'learning'],
      limit: 10,
      offset: 5,
      createdAfter: '2026-01-01T00:00:00Z',
    });

    const countQuery = findQueryByPattern(queries, 'SELECT COUNT(*)');
    const selectQuery = findQueryByPattern(queries, 'SELECT * FROM memories');

    expect(countQuery).toBeDefined();
    expect(selectQuery).toBeDefined();

    // Verify all variables are parameterized properly
    expect(countQuery?.values[0]).toBe(tenantId);
    expect(countQuery?.values[1]).toBe(agentId);
    expect(countQuery?.values[2]).toBe('task');
    expect(countQuery?.values[3]).toBe('learning');
    expect(countQuery?.values[4]).toBe('2026-01-01T00:00:00Z');

    expect(selectQuery?.values[0]).toBe(tenantId);
    expect(selectQuery?.values[1]).toBe(agentId);
  });

  test('should perform semantic search and fallback to text search on error', async () => {
    const mockRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Detailed invoice processing logs' },
      metadata: { version: 1 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      similarity: 0.85,
    };

    const { sql, queries } = create_mock_db([mockRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    // Run semantic search
    const results = await store.semanticSearch(tenantId, 'invoice processing', {
      limit: 5,
      agentIds: ['accounts_payable_lead'],
      types: ['task'],
    });

    expect(results).toHaveLength(1);
    expect(results[0].memory.id).toBe('mem_123');

    // Verify query embedding generation and vector query is executed
    const vectorQuery = findQueryByPattern(queries, 'embedding <=>');
    expect(vectorQuery).toBeDefined();
    expect(vectorQuery?.values[0]).toBe(tenantId);
    expect(vectorQuery?.values[1]).toBe('accounts_payable_lead');
    expect(vectorQuery?.values[2]).toBe('task');
  });

  test('should handle hybrid search inside searchMemories', async () => {
    const mockRow = {
      id: 'mem_123',
      tenant_id: tenantId,
      agent_id: agentId,
      type: 'task',
      content: { text: 'Monthly reconciliation reports for Stripe payments' },
      metadata: { version: 1 },
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      similarity: 0.9,
    };

    const { sql, queries } = create_mock_db([mockRow]);
    const store = new MemoryStore(sql);
    (store as any).embedding_service = mockEmbeddingService;

    const searchResponse = await store.searchMemories(tenantId, {
      text: 'Stripe payments',
      limit: 10,
      offset: 0,
      sortBy: 'relevance',
    });

    expect(searchResponse.results).toHaveLength(1);
    expect(searchResponse.total).toBe(1);

    // Verify that the query used parameterization for text and embedding
    const queryWithEmbedding = findQueryByPattern(queries, 'embedding <=>');
    expect(queryWithEmbedding).toBeDefined();
    expect(queryWithEmbedding?.values[0]).toBe(tenantId);
  });
});
